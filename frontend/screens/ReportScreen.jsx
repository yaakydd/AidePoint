// screens/ReportScreen.js
//
// Shows all generated reports in a searchable, filterable list.
// Tapping a card opens a detail bottom sheet with full clinical information,
// including PDF export.
//
// Gated behind a per-user PIN (see utils/reportPin.js and components/PinModal.js).
// The PIN check runs on every screen focus, not just on mount, so returning
// to this tab after the session timeout re-locks it.

import React, {
  useState, useEffect, useMemo,
  useCallback, useRef,
} from 'react';

import {
  View, Text, FlatList, TextInput,
  TouchableOpacity, ScrollView,
  StatusBar, Platform, Animated,
  Dimensions, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { loadReports } from '../utils/ReportUtils';
import { isPinCreated, startSession, isSessionExpired } from '../utils/reportPin';
import { ConditionIcon, ConditionBadge } from '../components/Conditions';
import PinModal from '../components/PinModal';
import DetailModal from '../components/DetailModal';
import { ReportStyles as styles, REPORT_LIST_BOTTOM_CLEARANCE } from '../styles/ReportStyles';
import { COLORS } from '../assets/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// FIXED: label changed from 'Healthy' to 'No Anemia' -- the model only
// screens for anemia (see scope_disclaimer in the backend response), so
// a sample with something else going on entirely (e.g. malaria) but no
// anemia still correctly lands in this bucket. Calling that tab
// "Healthy" implies a general clean bill of health the app never
// actually confirmed. The `key` stays 'healthy' unchanged -- that's the
// internal condition value wired to is_anemic on the backend and to
// CONDITION_CONFIG in ReportUtils.js, only the user-facing label changes.
const FILTERS = [
  { label: 'All', key: null },
  { label: 'Anemic', key: 'anemic' },
  { label: 'Healthy', key: 'healthy' },
  { label: 'No Anemia', key: 'no_anemia' },
];

const getRelativeTime = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();

  const minutes = (now - date) / 60000;
  const hours = minutes / 60;
  const days = hours / 24;

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  if (hours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days < 2) return 'Yesterday';

  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

// Full UUIDs (e.g. "396ba0a3-3adb-429a-a2b4-69a56bb24a55") are too long
// to display on a card without wrapping to two lines -- confirmed on a
// real device screenshot. Truncating to the first 8 characters keeps
// enough of the ID to be useful for a quick visual match while staying
// on one line; the full ID is still visible in the report detail sheet.
const formatShortId = (id) => {
  if (!id) return '';
  const str = String(id);
  return str.length > 8 ? `${str.slice(0, 8)}…` : str;
};

const ReportCard = React.memo(({ report, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onPress(report)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <ConditionIcon condition={report.condition} />

        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{report.patientName}</Text>
          <Text style={styles.cardId} numberOfLines={1}>#{formatShortId(report.patientId)}</Text>
          <ConditionBadge condition={report.condition} />
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.cardTime}>{getRelativeTime(report.createdAt)}</Text>
          <View style={styles.verifyRow}>
            <View style={[styles.verifyDot, { backgroundColor: report.labTechVerified ? '#10B981' : '#D1D5DB' }]} />
            <View style={[styles.verifyDot, { backgroundColor: report.doctorVerified ? '#10B981' : '#D1D5DB' }]} />
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const ReportScreen = ({ navigation, route }) => {
  const { user } = useAuth();

  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinModalMode, setPinModalMode] = useState(null); // 'create' | 'enter' | null

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // FIXED: extracted so both useFocusEffect (below) and the plain
  // useEffect further down can share it. Previously this logic lived
  // only inside useFocusEffect, which -- per react-navigation's actual
  // behavior -- only re-runs on a real focus/blur transition, NOT
  // whenever pinUnlocked or user?.id change while the screen is already
  // focused. If AuthContext's `user` was still hydrating (from
  // AsyncStorage/SecureStore) at the moment this screen first gained
  // focus, `!user?.id` would bail out silently, pinModalMode would stay
  // at its initial null, and nothing would ever re-trigger the check
  // once `user.id` became available a moment later -- there's no second
  // focus event to fire useFocusEffect again. The result: the report
  // list renders completely unlocked, with the PIN prompt never
  // appearing at all.
  const runPinCheck = useCallback(async () => {
    if (!user?.id) return;
    if (!pinUnlocked || isSessionExpired()) {
      const created = await isPinCreated(user.id);
      setPinModalMode(created ? 'enter' : 'create');
      setPinUnlocked(false);
    }
  }, [pinUnlocked, user?.id]);

  useFocusEffect(
    useCallback(() => {
      runPinCheck();
    }, [runPinCheck])
  );

  // Safety net for the race condition described above: reacts to
  // user?.id actually changing (e.g. auth finishing hydration after this
  // screen already had focus), which useFocusEffect alone cannot do.
  useEffect(() => {
    runPinCheck();
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      const stored = await loadReports();
      setReports(stored);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const newScanId = route?.params?.newScanId;
    if (newScanId && reports.length > 0) {
      const match = reports.find((r) => String(r.id) === String(newScanId));
      if (match) {
        setSelectedReport(match);
        setModalVisible(true);
      }
    }
  }, [route?.params?.newScanId, reports]);

  const openReport = useCallback((report) => {
    setSelectedReport(report);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setSelectedReport(null), 200);
  }, []);

  const visibleReports = useMemo(() => {
    const term = query.trim().toLowerCase();

    return reports.filter((r) => {
      const matchesSearch =
        !term ||
        r.patientName?.toLowerCase().includes(term) ||
        r.patientId?.toLowerCase().includes(term);

      const matchesFilter = !activeFilter || r.condition === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [reports, query, activeFilter]);

  const renderItem = useCallback(
    ({ item }) => <ReportCard report={item} onPress={openReport} />,
    [openReport]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  const getItemLayout = useCallback((_, index) => ({
    length: 90,
    offset: 90 * index,
    index,
  }), []);

  // Gate the entire screen, including the loading state, behind the PIN
  // check -- previously the loading spinner (and its underlying report
  // fetch) could render before pinModalMode was ever set, which is a
  // narrower version of the same race condition: showing app content
  // for a beat before the lock kicks in, rather than locking first.
  if (!user?.id) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (pinModalMode) {
    return (
      <PinModal
        mode={pinModalMode}
        userId={user.id}
        onSuccess={() => {
          setPinUnlocked(true);
          setPinModalMode(null);
          startSession();
        }}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* edges excludes 'top' deliberately -- SafeAreaView's automatic
          top inset was stacking with header's own paddingTop below,
          producing the visible gap between the status bar and "Medical
          Reports" seen in testing. The header now owns its own top
          spacing via layout.statusBarHeight instead, so the white
          background sits flush against the status bar with just enough
          clearance not to overlap the clock/battery icons. */}
      {/* FIXED: 'top' restored. It was previously excluded on the
          theory that the header's own paddingTop (layout.statusBarHeight)
          handled the notch/status bar -- but layout.statusBarHeight is
          hardcoded to 0 on iOS specifically because SafeAreaView was
          supposed to own that inset. With 'top' excluded, nothing
          accounted for the notch on iOS, so the header rendered
          underneath the status bar/tray. SafeAreaView now owns the top
          inset again, and the header's paddingTop is just a small fixed
          gap (see ReportStyles.js) instead of double-counting it. */}
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

        <FlatList
          data={visibleReports}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}

          removeClippedSubviews
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          updateCellsBatchingPeriod={50}

          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: REPORT_LIST_BOTTOM_CLEARANCE }]}

          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Medical Reports</Text>
                <Text style={styles.headerCount}>{reports?.length ?? 0} total</Text>
              </View>

              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by patient name…"
                  placeholderTextColor={COLORS.textMuted}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>

              <View style={styles.filterWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterContent}
                >
                  {FILTERS.map((f) => {
                    const isActive = activeFilter === f.key;
                    return (
                      <TouchableOpacity
                        key={f.label}
                        onPress={() => setActiveFilter(f.key)}
                        style={[styles.filterPill, isActive && styles.filterPillActive]}
                      >
                        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          }

          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No reports found</Text>
              <Text style={styles.emptySubtitle}>
                {query || activeFilter ? 'Try a different search or filter.' : 'Completed scans will appear here.'}
              </Text>
            </View>
          }
        />

        <DetailModal report={selectedReport} visible={modalVisible} onClose={closeModal} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default ReportScreen;