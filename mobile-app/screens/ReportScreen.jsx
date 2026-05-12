// screens/ReportsScreen.js
//
// Shows all generated reports in a searchable, filterable list.
// Tapping a card opens a detail bottom sheet with full clinical information.

import React, {
  useState, useEffect, useMemo,
  useCallback, useRef,
} from 'react';
import {
  View, Text, FlatList, TextInput,
  TouchableOpacity, Modal, ScrollView,
  StatusBar, Platform, Animated,
  Dimensions, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Rect, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

// Import from the shared utils so the storage key is always in sync.
// This fixes the critical bug where ReportScreen and Scan used different keys.
import { loadReports, CONDITION_CONFIG } from '../utils/ReportUtils';
import { ReportStyles as styles } from '../styles/ReportStyles';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;
// Sheet takes 82% of screen. Exported as const so the styles file can use it.
const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.82;

// ─── FILTER CONFIG ────────────────────────────────────────────────────────────
// Each filter label maps to the condition key used in report objects.
// null = show all.
const FILTERS = [
  { label: 'All',          key: null             },
  { label: 'Sickle Cell',  key: 'sickle_cell'    },
  { label: 'Iron Defic.',  key: 'iron_deficiency' },
  { label: 'Malaria',      key: 'malaria'         },
  { label: 'Thalassemia',  key: 'thalassemia'     },
  { label: 'Pernicious',   key: 'pernicious'      },
  { label: 'Megaloblastic',key: 'megaloblastic'   },
  { label: 'Aplastic',     key: 'aplastic'        },
  { label: 'Haemolytic',   key: 'hemolytic'       },
  { label: 'Normal',       key: 'normal'          },
];

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
// Converts an ISO timestamp into a human-readable relative string.
// e.g. "2 min ago", "14:35", "Yesterday", "12 Jan 2025"
function getRelativeTime(iso) {
  if (!iso) return '';
  const date    = new Date(iso);
  const now     = new Date();
  const minutes = (now - date) / (1000 * 60);
  const hours   = minutes / 60;
  const days    = hours / 24;
  if (minutes < 1)  return 'Just now';
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  if (hours < 24)   return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days < 2)     return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFullDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString([], {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── SVG CONDITION ICONS ──────────────────────────────────────────────────────
// Each icon is a simple SVG illustration of the cell morphology for that
// condition. react-native-svg renders these natively on both Android and iOS.

// Sickle Cell — crescent-shaped erythrocytes
function SickleCellIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFF0F0" />
      {/* Normal round cell */}
      <Circle cx="13" cy="20" r="8" fill="#FECACA" stroke="#EF4444" strokeWidth="1.5" />
      {/* Sickle/crescent — quadratic bezier curves forming the crescent */}
      <Path d="M26 34 Q40 16 45 26 Q44 40 32 43 Q23 43 26 34 Z"
        fill="#EF4444" opacity="0.9" />
      {/* Second sickle partially visible */}
      <Path d="M16 40 Q28 30 34 34 Q29 46 16 40 Z"
        fill="#B91C1C" opacity="0.7" />
    </Svg>
  );
}

// Iron Deficiency — small pale cells with enlarged central pallor
function IronDeficiencyIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFFBEB" />
      {/* Hypochromic cell 1 — ring of colour, large pale centre */}
      <Circle cx="18" cy="25" r="11" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" />
      <Circle cx="18" cy="25" r="6.5" fill="#FFFBEB" /> {/* big pale zone */}
      {/* Hypochromic cell 2 */}
      <Circle cx="38" cy="33" r="10" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" opacity="0.9" />
      <Circle cx="38" cy="33" r="6"  fill="#FFFBEB" />
      {/* Small third cell partially visible */}
      <Circle cx="30" cy="16" r="7"  fill="#FDE68A" stroke="#D97706" strokeWidth="1" opacity="0.7" />
      <Circle cx="30" cy="16" r="4"  fill="#FFFBEB" opacity="0.9" />
    </Svg>
  );
}

// Malaria — parasitized cell with ring-form trophozoite
function MalariaIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FEF9C3" />
      {/* Host erythrocyte */}
      <Circle cx="28" cy="30" r="16" fill="#FEF3C7" stroke="#CA8A04" strokeWidth="2" />
      {/* Ring-form parasite: open circle (ring stage of Plasmodium) */}
      <Circle cx="28" cy="30" r="7.5" fill="none" stroke="#92400E" strokeWidth="2.5" />
      {/* Nucleus dot — the violet granule seen in stained smears */}
      <Circle cx="33" cy="24" r="3.5" fill="#92400E" />
    </Svg>
  );
}

// Thalassemia — target cells (codocytes) with bull's-eye pattern
function ThalassemiaIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#EFF6FF" />
      {/* Large target cell — 3 concentric zones */}
      <Circle cx="24" cy="29" r="14" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      <Circle cx="24" cy="29" r="7"  fill="#93C5FD" />         {/* middle zone */}
      <Circle cx="24" cy="29" r="3"  fill="#1D4ED8" />         {/* central dense spot */}
      {/* Smaller target cell */}
      <Circle cx="43" cy="19" r="9"  fill="#BFDBFE" stroke="#2563EB" strokeWidth="1.5" opacity="0.75" />
      <Circle cx="43" cy="19" r="4.5" fill="#60A5FA" opacity="0.75" />
      <Circle cx="43" cy="19" r="1.8" fill="#1D4ED8" opacity="0.75" />
    </Svg>
  );
}

// Pernicious Anemia — large oval macrocytes (macro-ovalocytes)
function PerniciousIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#F5F3FF" />
      {/* Large oval cell 1 */}
      <Ellipse cx="22" cy="33" rx="14" ry="11" fill="#DDD6FE" stroke="#7C3AED" strokeWidth="1.5" />
      {/* Large oval cell 2 — slightly different angle */}
      <Ellipse cx="39" cy="22" rx="11" ry="9"  fill="#C4B5FD" stroke="#7C3AED" strokeWidth="1.5" opacity="0.85" />
    </Svg>
  );
}

// Megaloblastic Anemia — giant cell with multilobed neutrophil nucleus
function MegaloblasticIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#F0FDFA" />
      {/* Giant macro-ovalocyte */}
      <Ellipse cx="28" cy="30" rx="17" ry="14" fill="#99F6E4" stroke="#0D9488" strokeWidth="2" />
      {/* Multilobed nucleus: 3 connected circles simulating hypersegmented neutrophil */}
      <Circle cx="22" cy="30" r="4.5" fill="#0D9488" opacity="0.7" />
      <Circle cx="28" cy="25" r="4.5" fill="#0D9488" opacity="0.7" />
      <Circle cx="34" cy="30" r="4.5" fill="#0D9488" opacity="0.7" />
      {/* Lines connecting the nuclear lobes */}
      <Line x1="26" y1="30" x2="24" y2="27" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <Line x1="30" y1="27" x2="32" y2="28" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </Svg>
  );
}

// Aplastic Anemia — very sparse cells (pancytopenia pattern)
function AplasticIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFF5F5" />
      {/* Only 2 actual cells — representing severe pancytopenia */}
      <Circle cx="16" cy="20" r="7"  fill="#FCA5A5" stroke="#DC2626" strokeWidth="1.5" />
      <Circle cx="40" cy="37" r="6"  fill="#FCA5A5" stroke="#DC2626" strokeWidth="1.5" />
      {/* Ghost outlines where cells should be — shows hypocellularity */}
      <Circle cx="32" cy="17" r="5.5" fill="none" stroke="#FCA5A5" strokeWidth="1" strokeDasharray="2 2" />
      <Circle cx="16" cy="38" r="5"   fill="none" stroke="#FCA5A5" strokeWidth="1" strokeDasharray="2 2" />
      <Circle cx="42" cy="20" r="4.5" fill="none" stroke="#FCA5A5" strokeWidth="1" strokeDasharray="2 2" />
    </Svg>
  );
}

// Hemolytic Anemia — fragmented cells (schistocytes, helmet cells)
function HemolyticIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFF7ED" />
      {/* Helmet cell — parallelogram shape */}
      <Path d="M10 30 L20 18 L30 24 L20 36 Z" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.5" />
      {/* Triangle fragment — schistocyte */}
      <Path d="M33 18 L46 21 L41 33 Z"        fill="#FB923C" stroke="#EA580C" strokeWidth="1.5" />
      {/* Small fragment */}
      <Path d="M16 40 L27 38 L25 46 Z"        fill="#FDBA74" stroke="#EA580C" strokeWidth="1.5" opacity="0.8" />
      {/* Partially lysed cell with crack line */}
      <Circle cx="39" cy="39" r="8" fill="#FED7AA" stroke="#EA580C" strokeWidth="1.5" />
      <Line x1="36" y1="35" x2="42" y2="41"  stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

// Normal — healthy biconcave disc erythrocytes
function NormalIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#ECFDF5" />
      {/* Round cell 1 with slight central pallor — normal disc shape */}
      <Circle cx="20" cy="30" r="12" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1.5" />
      <Circle cx="20" cy="30" r="5.5" fill="#D1FAE5" />
      {/* Round cell 2 */}
      <Circle cx="39" cy="23" r="10" fill="#86EFAC" stroke="#16A34A" strokeWidth="1.5" opacity="0.9" />
      <Circle cx="39" cy="23" r="4.5" fill="#D1FAE5" opacity="0.9" />
    </Svg>
  );
}

// Maps condition keys to their icon components.
const CONDITION_ICONS = {
  sickle_cell:    SickleCellIcon,
  iron_deficiency: IronDeficiencyIcon,
  malaria:        MalariaIcon,
  thalassemia:    ThalassemiaIcon,
  pernicious:     PerniciousIcon,
  megaloblastic:  MegaloblasticIcon,
  aplastic:       AplasticIcon,
  hemolytic:      HemolyticIcon,
  normal:         NormalIcon,
};

// ─── SHARED SMALL COMPONENTS ──────────────────────────────────────────────────

// Renders the correct SVG icon for a condition, falling back to Normal.
function ConditionIcon({ condition, size = 56 }) {
  const Icon = CONDITION_ICONS[condition] ?? NormalIcon;
  return <Icon size={size} />;
}

// Coloured pill badge: ● Condition Name
function ConditionBadge({ condition }) {
  const cfg = CONDITION_CONFIG[condition] ?? CONDITION_CONFIG.normal;
  return (
    <View style={[s.badge, { backgroundColor: cfg.badgeBg }]}>
      <View style={[s.badgeDot, { backgroundColor: cfg.badgeDot }]} />
      <Text style={[s.badgeLabel, { color: cfg.badgeText }]} numberOfLines={1}>
        {cfg.label}
      </Text>
    </View>
  );
}

// A labelled key-value row used inside the detail modal.
function DetailRow({ label, value, valueColor }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, valueColor && { color: valueColor }]}>
        {value || '—'}
      </Text>
    </View>
  );
}

// ─── REPORT CARD ──────────────────────────────────────────────────────────────
// React.memo prevents unnecessary re-renders when other list items change.
// The press animation gives physical feedback without any library.
const ReportCard = React.memo(function ReportCard({ report, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 250, friction: 18 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 250, friction: 18 }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onPress(report)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[s.card, { transform: [{ scale }] }]}>
        {/* Condition icon (left) */}
        <ConditionIcon condition={report.condition} />

        {/* Name + ID + badge (centre) */}
        <View style={s.cardBody}>
          <Text style={s.cardName} numberOfLines={1}>{report.patientName}</Text>
          <Text style={s.cardId}>#{report.patientId}</Text>
          <ConditionBadge condition={report.condition} />
        </View>

        {/* Relative timestamp (right) + verification dots */}
        <View style={s.cardRight}>
          {/* createdAt was report.timestamp before — that field doesn't exist */}
          <Text style={s.cardTime}>{getRelativeTime(report.createdAt)}</Text>
          <View style={s.verifyRow}>
            {/* Small coloured dots showing who has verified this report */}
            <View style={[s.verifyDot, { backgroundColor: report.labTechVerified ? '#10B981' : '#D1D5DB' }]} />
            <View style={[s.verifyDot, { backgroundColor: report.doctorVerified  ? '#10B981' : '#D1D5DB' }]} />
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

// ─── DETAIL MODAL ────────────────────────────────────────────────────────────
// Bottom sheet that slides up when a card is tapped.
// Shows the full clinical report including vitals, AI result, and personnel.
function DetailModal({ report, visible, onClose }) {
  // translateY starts at full screen height (off screen below).
  // When visible=true we spring it to 0 (fully on screen).
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70, friction: 12,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!report) return null;

  const cfg = CONDITION_CONFIG[report.condition] ?? CONDITION_CONFIG.normal;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Dark backdrop */}
      <View style={s.overlay}>
        {/* Tapping backdrop closes the sheet */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* The sheet itself — MODAL_MAX_HEIGHT is now actually applied here */}
        <Animated.View
          style={[
            s.sheet,
            { maxHeight: MODAL_MAX_HEIGHT, transform: [{ translateY: slideY }] },
          ]}
        >
          {/* Drag handle — indicates this sheet can be dismissed */}
          <View style={s.handle} />

          {/* ── Sheet header: icon + name + badge */}
          <View style={s.sheetHeader}>
            <ConditionIcon condition={report.condition} size={64} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.sheetName} numberOfLines={1}>{report.patientName}</Text>
              <Text style={s.sheetId}>Scan #{report.patientId}</Text>
              <ConditionBadge condition={report.condition} />
            </View>
          </View>

          {/* ── Scrollable detail rows */}
          <ScrollView
            style={s.sheetScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >

            {/* Section: Date & Time */}
            <Text style={s.sectionHeading}>Date & Time</Text>
            <DetailRow label="Date"   value={getFullDate(report.createdAt)} />
            <DetailRow label="Time"   value={getTime(report.createdAt)} />

            {/* Section: Patient Vitals */}
            <Text style={s.sectionHeading}>Patient Vitals</Text>
            <DetailRow label="Temperature"    value={report.temperature ? `${report.temperature} °C` : null} />
            <DetailRow label="Blood Pressure" value={report.bloodPressure} />

            {/* Section: AI Analysis */}
            <Text style={s.sectionHeading}>AI Analysis</Text>
            <DetailRow label="Condition"   value={cfg.label} />
            <DetailRow label="Confidence"  value={`${Number(report.confidence).toFixed(1)}%`} />
            <DetailRow label="Morphology"  value={cfg.morphology} />
            <DetailRow label="Urgency"     value={cfg.urgency} valueColor={cfg.badgeText} />

            {/* Section: Personnel */}
            <Text style={s.sectionHeading}>Personnel</Text>
            <DetailRow label="Lab Technician"  value={report.labTechName} />
            <DetailRow label="Assigned Doctor" value={report.doctorName} />

            {/* Section: Verification status */}
            <Text style={s.sectionHeading}>Verification</Text>
            <View style={s.verifyCard}>
              <VerifyBadge label="Lab Tech"  verified={report.labTechVerified} />
              <VerifyBadge label="Doctor"    verified={report.doctorVerified} />
            </View>

          </ScrollView>

          {/* ── Close button */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={s.closeBtnText}>Close Report</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Small verification indicator used inside the modal
function VerifyBadge({ label, verified }) {
  return (
    <View style={s.verifyBadge}>
      <Ionicons
        name={verified ? 'checkmark-circle' : 'time-outline'}
        size={18}
        color={verified ? '#10B981' : '#94A3B8'}
      />
      <View>
        <Text style={s.verifyBadgeLabel}>{label}</Text>
        <Text style={[s.verifyBadgeStatus, { color: verified ? '#10B981' : '#94A3B8' }]}>
          {verified ? 'Verified' : 'Pending'}
        </Text>
      </View>
    </View>
  );
}

// ─── EMPTY STATE ───────────────────────────────────────────────────────────────
function EmptyState({ isFiltering }) {
  return (
    <View style={s.emptyContainer}>
      <Ionicons name="document-text-outline" size={52} color="#CBD5E1" />
      <Text style={s.emptyTitle}>
        {isFiltering ? 'No matching reports' : 'No reports yet'}
      </Text>
      <Text style={s.emptySubtitle}>
        {isFiltering
          ? 'Try a different search or filter'
          : 'Complete a scan to generate your first report'}
      </Text>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function ReportsScreen({ navigation, route }) {

  const [reports,        setReports]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [query,          setQuery]          = useState('');
  const [activeFilter,   setActiveFilter]   = useState(null); // null = All
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible,   setModalVisible]   = useState(false);

  // ── Load all persisted reports on mount
  useEffect(() => {
    (async () => {
      // Uses loadReports() from ReportUtils — same key as Scan.js.
      // This fixes the storage key mismatch bug.
      const stored = await loadReports();
      setReports(stored);
      setLoading(false);
    })();
  }, []);

  // ── Receive a new report passed from ScanScreen via navigation params.
  // Uses the 'focus' event listener — the same fix we applied to ScanScreen.
  // When this screen gains focus after Scan navigates here, route.params
  // is fully settled and the existing reports state is intact.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const incoming = route.params?.newReport;
      if (incoming) {
        // Prepend the new report so it appears at the top
        setReports((prev) => [incoming, ...prev]);
        navigation.setParams({ newReport: undefined });
      }
    });
    return unsubscribe;
  }, [navigation]);

  const openReport = useCallback((report) => {
    setSelectedReport(report);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    // Wait for slide-down animation to finish before clearing the report,
    // otherwise the modal flickers to empty while still visible
    setTimeout(() => setSelectedReport(null), 240);
  }, []);

  // ── Filter + search logic
  // useMemo recalculates only when reports, query, or activeFilter change.
  // Without this, the filter runs on every keystroke AND every render.
  const visibleReports = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesSearch =
        !term ||
        r.patientName.toLowerCase().includes(term) ||
        r.patientId.toLowerCase().includes(term);
      const matchesFilter =
        !activeFilter || r.condition === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [reports, query, activeFilter]);

  // useCallback prevents renderCard from being a new function on every render,
  // which would defeat the React.memo optimisation on ReportCard.
  const renderCard = useCallback(
    ({ item }) => <ReportCard report={item} onPress={openReport} />,
    [openReport]
  );

  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <ActivityIndicator size="large" color="#1A2F6E" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ── Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Medical Reports</Text>
        <Text style={s.headerCount}>{reports.length} total</Text>
      </View>

      {/* ── Search bar */}
      <View style={s.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search patient name or ID…"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing" // iOS only — shows clear button
        />
      </View>

      {/* ── Filter pills: horizontal scroll, one per condition */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterStrip}
        contentContainerStyle={s.filterContent}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.label}
              style={[s.filterPill, isActive && s.filterPillActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[s.filterText, isActive && s.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Report list */}
      <FlatList
        data={visibleReports}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.listContent,
          // Keeps the last card above the tab bar
          { paddingBottom: TAB_BAR_CLEARANCE },
        ]}
        ListEmptyComponent={
          <EmptyState isFiltering={!!query || activeFilter !== null} />
        }
      />

      {/* ── Detail bottom sheet modal */}
      <DetailModal
        report={selectedReport}
        visible={modalVisible}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
}

// ─── LOCAL STYLES ─────────────────────────────────────────────────────────────
// Kept here (not in ReportStyles.js) because many values depend on the
// MODAL_MAX_HEIGHT constant defined at the top of this file.
const s = StyleSheet.create({
  // ── Screen
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerCount: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // ── Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },

  // ── Filter strip
  filterStrip: {
    marginBottom: 10,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#1A2F6E',
    borderColor: '#1A2F6E',
  },
  filterText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ── List
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // ── Report card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  cardId: {
    fontSize: 12,
    color: '#94A3B8',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  cardTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  // Two tiny dots showing lab tech + doctor verification status
  verifyRow: {
    flexDirection: 'row',
    gap: 4,
  },
  verifyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  // ── Condition badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    maxWidth: SCREEN_WIDTH * 0.5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Modal overlay + sheet
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 18,
  },

  // ── Modal header
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  sheetName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  sheetId: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },

  // ── Detail rows
  sheetScroll: {
    maxHeight: MODAL_MAX_HEIGHT - 250,  // leaves room for header + close button
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },

  // ── Verification card
  verifyCard: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  verifyBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verifyBadgeLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  verifyBadgeStatus: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Close button
  closeBtn: {
    backgroundColor: '#1A2F6E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
