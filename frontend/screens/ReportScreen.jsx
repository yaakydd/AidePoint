// screens/ReportScreen.js
//
// Shows all generated reports in a searchable, filterable list.
// Tapping a card opens a detail bottom sheet with full clinical information,
// including PDF export.

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
import { Ionicons } from '@expo/vector-icons';

import { loadReports } from '../utils/ReportUtils';
import { ConditionIcon, ConditionBadge } from '../components/Conditions';
import DetailModal from '../components/DetailModal';
import { ReportStyles as styles } from '../styles/ReportStyles';
import { COLORS } from '../assets/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;

// The backend reports a binary result -- anemic or healthy -- not a
// specific disease type, so these are the only two real filters plus "All".
const FILTERS = [
  { label: 'All', key: null },
  { label: 'Anemic', key: 'anemic' },
  { label: 'Healthy', key: 'healthy' },
];

// ─── DATE HELPERS ──────────────────────────────────────────────
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

// ─── REPORT CARD ─────────────────────────────────────────────────
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
          <Text style={styles.cardId}>#{report.patientId}</Text>
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

// ─── MAIN SCREEN ────────────────────────────────────────────────
const ReportScreen = ({ navigation, route }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await loadReports();
      setReports(stored);
      setLoading(false);
    })();
  }, []);

  // Jump straight to a freshly-saved report when navigated here with newScanId
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

  // ─── FILTERED DATA -- search matches patient name (or ID) ────────
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

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.screen}>
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
          contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_CLEARANCE }]}

          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Medical Reports</Text>
                <Text style={styles.headerCount}>{reports?.length ?? 0} total</Text>
              </View>

              {/* SEARCH -- by patient name or ID */}
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

              {/* FILTERS -- single strip, no boxed wrapper */}
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