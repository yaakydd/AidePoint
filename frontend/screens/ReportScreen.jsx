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

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { loadReports } from '../utils/ReportUtils';
import { isPinCreated, startSession, isSessionExpired } from '../utils/reportPin';
import { ConditionIcon, ConditionBadge } from '../components/Conditions';
import PinModal from '../components/PinModal';
import DetailModal from '../components/DetailModal';
import { ReportStyles as styles } from '../styles/ReportStyles';
import Header from '../components/Header';
import { COLORS } from '../assets/theme';
import { getTabBarHeight } from '../navigation/MainAppNavigator';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FILTERS = [
  { label: 'All', key: null },
  { label: 'Anemic', key: 'anemic' },
  { label: 'Healthy', key: 'healthy' },
  { label: 'Unknown', key: 'unknown' }
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
        </View>

        <View style={styles.cardRight}>
          <ConditionBadge condition={report.condition} />
          <Text style={styles.cardTime}>{getRelativeTime(report.createdAt)}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const ReportScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinModalMode, setPinModalMode] = useState(null);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
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

  useEffect(() => {
    runPinCheck();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const stored = await loadReports(user.id);
      setReports(stored);
      setLoading(false);
    })();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      (async () => {
        const stored = await loadReports(user.id);
        setReports(stored);
      })();
    }, [user?.id])
  );

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
      <SafeAreaView style={styles.screen} edges={['left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

        <Header
          center={<Text style={styles.headerTitle}>Scan Reports</Text>}
          right={<Text style={styles.headerCount}>{reports?.length ?? 0} total</Text>}
        />

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
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: getTabBarHeight(insets) + 24 },
          ]}

          ListHeaderComponent={
            <View>
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

        <DetailModal
          report={selectedReport}
          visible={modalVisible}
          onClose={closeModal}
          onNotesSaved={(updatedReports) => setReports(updatedReports)}
          userId={user.id}  
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default ReportScreen;