// screens/ReportsScreen.js
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
import Svg, { Circle, Ellipse, Path, Rect, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { loadReports, CONDITION_CONFIG } from '../utils/ReportUtils';
import DetailModal from '../components/DetailModal';
import { ReportStyles as styles } from '../styles/ReportStyles';
import { COLORS } from '../assets/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;

// ─── FILTER CONFIG — a single, de-duplicated list ───────────────────────────
const FILTERS = [
  { label: 'All', key: null },
  { label: 'Sickle Cell', key: 'sickle_cell' },
  { label: 'Iron Defic.', key: 'iron_deficiency' },
  { label: 'Malaria', key: 'malaria' },
  { label: 'Thalassemia', key: 'thalassemia' },
  { label: 'Pernicious', key: 'pernicious' },
  { label: 'Megaloblastic', key: 'megaloblastic' },
  { label: 'Aplastic', key: 'aplastic' },
  { label: 'Hemolytic', key: 'hemolytic' },
  { label: 'Normal', key: 'normal' },
];

// ─── DATE HELPERS ──────────────────────────────────────────────
function getRelativeTime(iso) {
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
}

// ─── SVG CONDITION ICONS ─────────────────────────────────────────────────────
function SickleCellIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFF0F0" />
      <Circle cx="13" cy="20" r="8" fill="#FECACA" stroke="#EF4444" strokeWidth="1.5" />
      <Path d="M26 34 Q40 16 45 26 Q44 40 32 43 Q23 43 26 34 Z" fill="#EF4444" opacity="0.9" />
      <Path d="M16 40 Q28 30 34 34 Q29 46 16 40 Z" fill="#B91C1C" opacity="0.7" />
    </Svg>
  );
}
function IronDeficiencyIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFFBEB" />
      <Circle cx="18" cy="25" r="11" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" />
      <Circle cx="18" cy="25" r="6.5" fill="#FFFBEB" />
      <Circle cx="38" cy="33" r="10" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" opacity="0.9" />
      <Circle cx="38" cy="33" r="6" fill="#FFFBEB" />
      <Circle cx="30" cy="16" r="7" fill="#FDE68A" stroke="#D97706" strokeWidth="1" opacity="0.7" />
      <Circle cx="30" cy="16" r="4" fill="#FFFBEB" opacity="0.9" />
    </Svg>
  );
}
function MalariaIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width={56} height={56} rx={14} fill="#FEF9C3" />
      <Circle cx={28} cy={30} r={16} fill="#FEF3C7" stroke="#CA8A04" strokeWidth={2} />
      <Circle cx={28} cy={30} r={7.5} fill="none" stroke="#92400E" strokeWidth={2.5} />
      <Circle cx={33} cy={24} r={3.5} fill="#92400E" />
    </Svg>
  );
}
function ThalassemiaIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#EFF6FF" />
      <Circle cx="24" cy="29" r="14" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      <Circle cx="24" cy="29" r="7" fill="#93C5FD" />
      <Circle cx="24" cy="29" r="3" fill="#1D4ED8" />
      <Circle cx="43" cy="19" r="9" fill="#BFDBFE" stroke="#2563EB" strokeWidth="1.5" opacity="0.75" />
      <Circle cx="43" cy="19" r="4.5" fill="#60A5FA" opacity="0.75" />
      <Circle cx="43" cy="19" r="1.8" fill="#1D4ED8" opacity="0.75" />
    </Svg>
  );
}
function PerniciousIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#F5F3FF" />
      <Ellipse cx="22" cy="33" rx="14" ry="11" fill="#DDD6FE" stroke="#7C3AED" strokeWidth="1.5" />
      <Ellipse cx="39" cy="22" rx="11" ry="9" fill="#C4B5FD" stroke="#7C3AED" strokeWidth="1.5" opacity="0.85" />
    </Svg>
  );
}
function MegaloblasticIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#F0FDFA" />
      <Ellipse cx="28" cy="30" rx="17" ry="14" fill="#99F6E4" stroke="#0D9488" strokeWidth="2" />
      <Circle cx="22" cy="30" r="4.5" fill="#0D9488" opacity="0.7" />
      <Circle cx="28" cy="25" r="4.5" fill="#0D9488" opacity="0.7" />
      <Circle cx="34" cy="30" r="4.5" fill="#0D9488" opacity="0.7" />
      <Line x1="26" y1="30" x2="24" y2="27" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <Line x1="30" y1="27" x2="32" y2="28" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </Svg>
  );
}
function AplasticIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFF5F5" />
      <Circle cx="16" cy="20" r="7" fill="#FCA5A5" stroke="#DC2626" strokeWidth="1.5" />
      <Circle cx="40" cy="37" r="6" fill="#FCA5A5" stroke="#DC2626" strokeWidth="1.5" />
      <Circle cx="32" cy="17" r="5.5" fill="none" stroke="#FCA5A5" strokeWidth="1" strokeDasharray="2 2" />
      <Circle cx="16" cy="38" r="5" fill="none" stroke="#FCA5A5" strokeWidth="1" strokeDasharray="2 2" />
      <Circle cx="42" cy="20" r="4.5" fill="none" stroke="#FCA5A5" strokeWidth="1" strokeDasharray="2 2" />
    </Svg>
  );
}
function HemolyticIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFF7ED" />
      <Path d="M10 30 L20 18 L30 24 L20 36 Z" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.5" />
      <Path d="M33 18 L46 21 L41 33 Z" fill="#FB923C" stroke="#EA580C" strokeWidth="1.5" />
      <Path d="M16 40 L27 38 L25 46 Z" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.5" opacity="0.8" />
      <Circle cx="39" cy="39" r="8" fill="#FED7AA" stroke="#EA580C" strokeWidth="1.5" />
      <Line x1="36" y1="35" x2="42" y2="41" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}
function NormalIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#ECFDF5" />
      <Circle cx="20" cy="30" r="12" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1.5" />
      <Circle cx="20" cy="30" r="5.5" fill="#D1FAE5" />
      <Circle cx="39" cy="23" r="10" fill="#86EFAC" stroke="#16A34A" strokeWidth="1.5" opacity="0.9" />
      <Circle cx="39" cy="23" r="4.5" fill="#D1FAE5" opacity="0.9" />
    </Svg>
  );
}

const CONDITION_ICONS = {
  sickle_cell: SickleCellIcon,
  iron_deficiency: IronDeficiencyIcon,
  malaria: MalariaIcon,
  thalassemia: ThalassemiaIcon,
  pernicious: PerniciousIcon,
  megaloblastic: MegaloblasticIcon,
  aplastic: AplasticIcon,
  hemolytic: HemolyticIcon,
  normal: NormalIcon,
};

function ConditionIcon({ condition, size = 56 }) {
  const Icon = CONDITION_ICONS[condition] ?? NormalIcon;
  return <Icon size={size} />;
}

function ConditionBadge({ condition }) {
  const cfg = CONDITION_CONFIG?.[condition] ?? CONDITION_CONFIG?.normal ?? {};
  return (
    <View style={[styles.badge, { backgroundColor: cfg.badgeBg || '#eee' }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.badgeDot || '#999' }]} />
      <Text style={[styles.badgeLabel, { color: cfg.badgeText || '#000' }]}>
        {String(cfg.label ?? 'Unknown')}
      </Text>
    </View>
  );
}

// ─── REPORT CARD ─────────────────────────────────────────────────
const ReportCard = React.memo(function ReportCard({ report, onPress }) {
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
      const match = reports.find(r => String(r.id) === String(newScanId));
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

  // ─── FILTERED DATA — search matches patient name (or ID) ────────
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

              {/* SEARCH — by patient name or ID */}
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

              {/* FILTERS — single strip, no boxed wrapper */}
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
