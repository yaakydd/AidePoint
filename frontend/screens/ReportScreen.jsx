/**
 * ReportsScreen.js — Aidepoint Medical App
 *
 * Displays all blood-sample analysis reports.
 * Reports are persisted in AsyncStorage and populated
 * from the Scan screen via navigation params.
 *
 * ─── INSTALL THESE BEFORE RUNNING ────────────────────────
 *   expo install react-native-svg
 *   expo install @react-native-async-storage/async-storage
 * ──────────────────────────────────────────────────────────
 *
 * NAVIGATION USAGE (from Scan screen):
 *   navigation.navigate('Reports', { newReport: reportObject });
 *
 * REPORT OBJECT SHAPE (what Scan screen must produce):
 *   {
 *     id:           string,   // unique — use Date.now().toString() or uuid
 *     patientName:  string,
 *     patientId:    string,   // e.g. "AP-2025-8821"
 *     condition:    'sickle' | 'malaria' | 'anaemia' | 'normal',
 *     confidence:   number,   // 0–100, AI model certainty
 *     timestamp:    string,   // ISO 8601 e.g. new Date().toISOString()
 *     labTechName:  string,   // logged-in user's name
 *     notes:        string,   // auto-generated or typed by lab tech
 *     imageUri:     string | null, // local URI of the captured sample image
 *   }
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Rect, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReportStyles as styles } from '../styles/ReportStyles';

// ─── Constants ────────────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORAGE_KEY = '@aidepoint_reports';

// ─── Condition Configuration ──────────────────────────────────────────────────
// All colours, labels, and icon mappings for each condition live here.
// When the Scan screen sends condition: 'sickle', this object drives
// every colour, badge text, and icon automatically.

const CONDITIONS = {
  sickle: {
    label:       'Sickle Cell Detected',
    badgeBg:     '#FFF0F0',
    badgeText:   '#C0392B',
    badgeDot:    '#E74C3C',
    iconBg:      '#FFF0F0',
    urgency:     'High — refer to haematologist',
  },
  malaria: {
    label:       'Malaria Detected',
    badgeBg:     '#FFF8EC',
    badgeText:   '#B07D00',
    badgeDot:    '#F39C12',
    iconBg:      '#FFF8EC',
    urgency:     'High — commence anti-malarial treatment',
  },
  anaemia: {
    label:       'Anaemia Detected',
    badgeBg:     '#F5F0FF',
    badgeText:   '#6C3EC1',
    badgeDot:    '#8E44AD',
    iconBg:      '#F5F0FF',
    urgency:     'Moderate — iron panel recommended',
  },
  normal: {
    label:       'Normal Result',
    badgeBg:     '#EEFBF3',
    badgeText:   '#1A7340',
    badgeDot:    '#27AE60',
    iconBg:      '#EEFBF3',
    urgency:     'None — routine follow-up only',
  },
};

const FILTERS = ['All', 'Sickle Cell', 'Malaria', 'Anaemia', 'Normal'];

// Maps filter pill label → condition key used in report objects
const FILTER_KEY_MAP = {
  'All':         null,
  'Sickle Cell': 'sickle',
  'Malaria':     'malaria',
  'Anaemia':     'anaemia',
  'Normal':      'normal',
};

// ─── Sample / Seed Data ───────────────────────────────────────────────────────
// Shown on first launch only. Once real reports arrive from the Scan screen
// they will be prepended to this list and persisted.

const SEED_REPORTS = [
  {
    id:          'seed-1',
    patientName: 'Amara Okoro',
    patientId:   'AP-2024-8821',
    condition:   'sickle',
    confidence:  94.2,
    timestamp:   new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    labTechName: 'K. Mensah',
    notes:       'Crescent-shaped cells confirmed under microscopy. Patient referred to haematologist for further evaluation.',
    imageUri:    null,
  },
  {
    id:          'seed-2',
    patientName: 'David Mensah',
    patientId:   'AP-2024-9012',
    condition:   'normal',
    confidence:  98.1,
    timestamp:   new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    labTechName: 'A. Boateng',
    notes:       'No anomalies detected. All blood parameters within normal range. Routine follow-up in 6 months.',
    imageUri:    null,
  },
  {
    id:          'seed-3',
    patientName: 'Kofi Annan',
    patientId:   'AP-2024-1102',
    condition:   'malaria',
    confidence:  91.7,
    timestamp:   '2024-10-24T09:15:00.000Z',
    labTechName: 'E. Asante',
    notes:       'Plasmodium ring forms present in multiple red cells. Anti-malarial treatment commenced immediately.',
    imageUri:    null,
  },
  {
    id:          'seed-4',
    patientName: 'Sarah Boateng',
    patientId:   'AP-2024-5541',
    condition:   'normal',
    confidence:  97.4,
    timestamp:   '2024-10-22T14:30:00.000Z',
    labTechName: 'K. Mensah',
    notes:       'Routine check. All parameters satisfactory. No action required.',
    imageUri:    null,
  },
  {
    id:          'seed-5',
    patientName: 'Esi Nyarko',
    patientId:   'AP-2025-0312',
    condition:   'anaemia',
    confidence:  89.5,
    timestamp:   '2025-03-03T11:00:00.000Z',
    labTechName: 'J. Owusu',
    notes:       'Low haemoglobin levels observed. Iron deficiency anaemia suspected. Iron panel and dietary assessment ordered.',
    imageUri:    null,
  },
  {
    id:          'seed-6',
    patientName: 'Kwame Asare',
    patientId:   'AP-2025-0765',
    condition:   'sickle',
    confidence:  96.3,
    timestamp:   '2025-04-14T08:45:00.000Z',
    labTechName: 'A. Boateng',
    notes:       'Sickling confirmed under hypoxic conditions. Urgent specialist referral letter issued to KATH haematology unit.',
    imageUri:    null,
  },
];

// ─── Utility: Date & Time Formatting ─────────────────────────────────────────

function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const now   = new Date();
  const diffMs  = now - date;
  const diffMin = diffMs / (1000 * 60);
  const diffHrs = diffMs / (1000 * 60 * 60);
  const diffDay = diffMs / (1000 * 60 * 60 * 24);

  if (diffMin  < 1)  return 'Just now';
  if (diffMin  < 60) return `${Math.floor(diffMin)} min ago`;
  if (diffHrs  < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDay  < 2)  return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFullDate(isoString) {
  return new Date(isoString).toLocaleDateString([], {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ─── SVG Condition Icons ──────────────────────────────────────────────────────
// Each icon visually represents the blood condition so lab techs can identify
// the result at a glance without reading the badge text.

const SickleCellIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    {/* Background tile */}
    <Rect width="56" height="56" rx="14" fill="#FFF0F0" />
    {/* Pale normal cell (contrast) */}
    <Ellipse cx="16" cy="28" rx="11" ry="7" fill="#F5B7B7"
      transform="rotate(-30 16 28)" />
    {/* Sickle / crescent-shaped cell */}
    <Path
      d="M14 22 Q38 10 42 29 Q39 44 22 39"
      fill="#E74C3C"
      opacity="0.88"
    />
    <Ellipse
      cx="23" cy="32" rx="9" ry="5.5"
      fill="#C0392B" opacity="0.55"
      transform="rotate(-20 23 32)"
    />
    {/* Second sickle cell, upper right */}
    <Circle cx="42" cy="16" r="7" fill="#F5B7B7" />
    <Ellipse cx="42" cy="16" rx="5.5" ry="3.5" fill="#E74C3C" opacity="0.72" />
  </Svg>
);

const MalariaIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Rect width="56" height="56" rx="14" fill="#FFF8EC" />
    {/* Red blood cell outline */}
    <Circle cx="28" cy="30" r="15" fill="#FDEBD0" />
    <Circle cx="28" cy="30" r="15" fill="none" stroke="#F39C12" strokeWidth="3" />
    {/* Parasite ring stage inside cell */}
    <Circle cx="28" cy="30" r="7" fill="#F39C12" opacity="0.18" />
    <Circle cx="33" cy="25" r="5"  fill="#E67E22" />
    <Circle cx="33" cy="25" r="2.8" fill="#D35400" />
    {/* Second ring form */}
    <Circle cx="22" cy="36" r="3.5" fill="#F39C12" opacity="0.82" />
    {/* Parasite flagellum / tail */}
    <Path
      d="M33 25 Q42 16 47 13"
      stroke="#C0392B" strokeWidth="2"
      fill="none" strokeLinecap="round"
    />
    <Circle cx="47" cy="13" r="3" fill="#C0392B" />
  </Svg>
);

const AnaemiaIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Rect width="56" height="56" rx="14" fill="#F5F0FF" />
    {/* Three pale, washed-out cells indicating low haemoglobin */}
    <Ellipse cx="18" cy="28" rx="11" ry="8"
      fill="#D7C9F7" stroke="#9B6FE0" strokeWidth="1.5" />
    <Ellipse cx="18" cy="28" rx="5.5" ry="3.5"
      fill="#B89CED" opacity="0.45" />

    <Ellipse cx="39" cy="21" rx="10" ry="7.5"
      fill="#E8DEFF" stroke="#9B6FE0" strokeWidth="1.5" opacity="0.85" />
    <Ellipse cx="39" cy="21" rx="5" ry="3"
      fill="#C4ADEE" opacity="0.4" />

    <Ellipse cx="35" cy="39" rx="9" ry="6.5"
      fill="#DDD1FB" stroke="#9B6FE0" strokeWidth="1.5" opacity="0.9" />
    {/* Warning crosses — colour loss indicator */}
    <Line x1="10" y1="10" x2="18" y2="18" stroke="#E74C3C" strokeWidth="2"
      strokeLinecap="round" opacity="0.65" />
    <Line x1="18" y1="10" x2="10" y2="18" stroke="#E74C3C" strokeWidth="2"
      strokeLinecap="round" opacity="0.65" />
  </Svg>
);

const NormalIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Rect width="56" height="56" rx="14" fill="#EEFBF3" />
    {/* Two healthy, biconcave red blood cells */}
    <Ellipse cx="18" cy="30" rx="11" ry="8"
      fill="#A9DFBF" stroke="#27AE60" strokeWidth="1.5" />
    <Ellipse cx="18" cy="30" rx="5.5" ry="3.5"
      fill="#6DBF8B" opacity="0.6" />

    <Ellipse cx="38" cy="22" rx="11" ry="8"
      fill="#82D6A2" stroke="#27AE60" strokeWidth="1.5" />
    <Ellipse cx="38" cy="22" rx="5.5" ry="3.5"
      fill="#52B978" opacity="0.6" />
    {/* Check mark */}
    <Path
      d="M30 40 l5 5 l9-11"
      stroke="#1A7340" strokeWidth="2.5"
      fill="none" strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

// Map condition key → icon component
const ICON_MAP = {
  sickle:  SickleCellIcon,
  malaria: MalariaIcon,
  anaemia: AnaemiaIcon,
  normal:  NormalIcon,
};

// ─── Reusable Small Components ────────────────────────────────────────────────

const ConditionIcon = ({ condition, size = 56 }) => {
  const Icon = ICON_MAP[condition] ?? NormalIcon;
  return <Icon size={size} />;
};

const ConditionBadge = ({ condition }) => {
  const cfg = CONDITIONS[condition];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.badgeDot }]} />
      <Text style={[styles.badgeLabel, { color: cfg.badgeText }]}>
        {cfg.label}
      </Text>
    </View>
  );
};

// Inline SVG icons for navigation chrome
const BackArrow = () => (
  <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <Path
      d="M12 3L6 9l6 6"
      stroke="#1A1B2E" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const SearchGlass = () => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Circle cx="7" cy="7" r="5.5" stroke="#9799A8" strokeWidth="1.5" />
    <Path d="M11 11L15 15" stroke="#9799A8" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const Chevron = () => (
  <Svg width="8" height="14" viewBox="0 0 8 14" fill="none">
    <Path
      d="M1 1l6 6-6 6"
      stroke="#C8CAD5" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

// ─── ReportCard ───────────────────────────────────────────────────────────────
// Wrapped in React.memo so FlatList only re-renders cards whose data changed.
// useRef + Animated give the press-scale micro-interaction without triggering
// a re-render (Animated drives the native driver directly).

const ReportCard = React.memo(({ report, onPress }) => {
  // useRef: holds the animated value without causing re-renders when it changes.
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue:        0.97,
      useNativeDriver: true,
      tension:         300,
      friction:        20,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue:        1,
      useNativeDriver: true,
      tension:         300,
      friction:        20,
    }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onPress(report)}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Report for ${report.patientName}, ${CONDITIONS[report.condition].label}`}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        {/* Condition icon — replaces the blood sample photo */}
        <View style={styles.cardIconWrap}>
          <ConditionIcon condition={report.condition} size={56} />
        </View>

        {/* Patient info + badge */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {report.patientName}
          </Text>
          <Text style={styles.cardPatientId}>
            ID: {report.patientId}
          </Text>
          <ConditionBadge condition={report.condition} />
        </View>

        {/* Timestamp + chevron */}
        <View style={styles.cardTrailing}>
          <Text style={styles.cardTime}>
            {formatRelativeTime(report.timestamp)}
          </Text>
          <Chevron />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

// ─── DetailModal ──────────────────────────────────────────────────────────────
// Bottom-sheet modal that slides up when a report card is tapped.
//
// How the animation works:
//   • slideY starts at SCREEN_HEIGHT (off the bottom of the screen).
//   • When `visible` becomes true, Animated.spring() moves it to 0 (on screen).
//   • When `visible` becomes false, Animated.timing() slides it back down.
//   • useNativeDriver: true means the animation runs on the UI thread —
//     no JavaScript involvement per frame, so it's silky smooth.

const DetailModal = ({ report, visible, onClose }) => {
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // useEffect: runs the slide animation whenever `visible` changes.
  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue:         0,
        useNativeDriver: true,
        tension:         65,
        friction:        11,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue:         SCREEN_HEIGHT,
        duration:        240,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Don't render anything if there's no report selected yet
  if (!report) return null;

  const cfg = CONDITIONS[report.condition];

  // The rows displayed inside the modal
  const infoRows = [
    { label: 'Date',           value: formatFullDate(report.timestamp) },
    { label: 'Time',           value: formatTime(report.timestamp) },
    { label: 'Condition',      value: cfg.label },
    { label: 'AI Confidence',  value: `${Number(report.confidence).toFixed(1)}%` },
    { label: 'Urgency',        value: cfg.urgency },
    { label: 'Lab Technician', value: report.labTechName },
    { label: 'Notes',          value: report.notes },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"        // we handle animation ourselves
      statusBarTranslucent        // modal covers the status bar on Android
      onRequestClose={onClose}    // Android hardware back button
    >
      <View style={styles.modalOverlay}>
        {/* Tap the dim area to dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        <Animated.View
          style={[
            styles.modalSheet,
            { transform: [{ translateY: slideY }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconBg, { backgroundColor: cfg.iconBg }]}>
              <ConditionIcon condition={report.condition} size={62} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalPatientName}>{report.patientName}</Text>
              <Text style={styles.modalPatientId}>{report.patientId}</Text>
              <ConditionBadge condition={report.condition} />
            </View>
          </View>

          {/* Scrollable detail rows */}
          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {infoRows.map(({ label, value }, index) => (
              <View
                key={label}
                style={[
                  styles.modalRow,
                  index === infoRows.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={styles.modalRowLabel}>{label}</Text>
                <Text
                  style={[
                    styles.modalRowValue,
                    label === 'Notes'   && styles.modalNotesValue,
                    label === 'Urgency' && { color: cfg.badgeText },
                  ]}
                >
                  {value}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.closeButtonText}>Close Report</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── EmptyState ───────────────────────────────────────────────────────────────

const EmptyState = ({ searchActive }) => (
  <View style={styles.emptyWrap}>
    <Svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: 14 }}>
      <Circle cx="32" cy="32" r="30" stroke="#E5E8EF" strokeWidth="2" />
      <Path
        d="M22 32h20M32 22v20"
        stroke="#D0D4DC"
        strokeWidth="2.5"
        strokeLinecap="round"
        transform="rotate(45 32 32)"
      />
    </Svg>
    <Text style={styles.emptyTitle}>
      {searchActive ? 'No matching reports' : 'No reports yet'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {searchActive
        ? 'Try a different name or patient ID'
        : 'Reports from completed scans will appear here'}
    </Text>
  </View>
);

// ─── ReportsScreen ────────────────────────────────────────────────────────────

export default function ReportsScreen({ navigation, route }) {
  // ── State ──────────────────────────────────────────────────────────────────

  // useState: the full list of reports held in memory for this render cycle.
  const [reports,        setReports]       = useState([]);
  const [loading,        setLoading]       = useState(true);

  // Search / filter state
  const [query,          setQuery]         = useState('');
  const [activeFilter,   setActiveFilter]  = useState('All');

  // Modal state: which report is being shown, and whether the modal is open.
  // Keeping them separate lets the slide-out animation finish before we clear
  // `selectedReport` (clearing it immediately would make the modal blank mid-slide).
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible,   setModalVisible]   = useState(false);

  // useRef: direct access to the TextInput — no re-render needed to focus it.
  const searchInputRef = useRef(null);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Load persisted reports from AsyncStorage when the screen first mounts.
  // useEffect with [] runs exactly once — equivalent to componentDidMount.
  useEffect(() => {
    loadReports();
  }, []);

  // React to a newReport arriving from the Scan screen via navigation params.
  // useEffect watches route.params so it triggers whenever the Scan screen
  // calls navigation.navigate('Reports', { newReport: {...} }).
  useEffect(() => {
    const newReport = route?.params?.newReport;
    if (newReport) {
      handleIncomingReport(newReport);
      // Clear the param so navigating back and forward doesn't re-trigger
      navigation?.setParams({ newReport: undefined });
    }
  }, [route?.params?.newReport]);

  // ── AsyncStorage Helpers ───────────────────────────────────────────────────

  const loadReports = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setReports(JSON.parse(raw));
      } else {
        // First-ever launch: seed with sample data
        setReports(SEED_REPORTS);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REPORTS));
      }
    } catch (err) {
      console.warn('[Aidepoint] Failed to load reports:', err);
      setReports(SEED_REPORTS); // graceful fallback
    } finally {
      setLoading(false);
    }
  };

  const handleIncomingReport = async (newReport) => {
    try {
      // Prepend the new report so it appears at the top of the list
      const updated = [newReport, ...reports];
      setReports(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[Aidepoint] Failed to save new report:', err);
    }
  };

  // ── Callbacks ──────────────────────────────────────────────────────────────

  // useCallback: stable function reference — ReportCard won't re-render just
  // because ReportsScreen re-renders (important for long lists).
  const handleCardPress = useCallback((report) => {
    setSelectedReport(report);
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    // Wait for the slide-out animation to finish before clearing the report
    setTimeout(() => setSelectedReport(null), 280);
  }, []);

  const handleFilterPress = useCallback((filter) => {
    setActiveFilter(filter);
    // Dismiss keyboard if search was open
    searchInputRef.current?.blur();
  }, []);

  // ── Derived Data ───────────────────────────────────────────────────────────

  // useMemo: the filtered list is recomputed ONLY when reports, query, or
  // activeFilter change. Without this, it would re-run on every render
  // (e.g. every keypress in an unrelated input elsewhere on screen).
  const filteredReports = useMemo(() => {
    const conditionKey = FILTER_KEY_MAP[activeFilter];
    const lowerQuery   = query.toLowerCase().trim();

    return reports.filter((r) => {
      const matchesSearch =
        !lowerQuery ||
        r.patientName.toLowerCase().includes(lowerQuery) ||
        r.patientId.toLowerCase().includes(lowerQuery);

      const matchesFilter = !conditionKey || r.condition === conditionKey;

      return matchesSearch && matchesFilter;
    });
  }, [reports, query, activeFilter]);

  // ── FlatList Helpers ───────────────────────────────────────────────────────

  // useCallback + React.memo on ReportCard together = zero wasted renders
  const renderItem = useCallback(
    ({ item }) => <ReportCard report={item} onPress={handleCardPress} />,
    [handleCardPress],
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const ListHeader = useMemo(
    () => <Text style={styles.sectionLabel}>RECENT REPORTS</Text>,
    [],
  );

  // ── Loading State ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1A2F6E" />
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BackArrow />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>Medical Reports</Text>

        {/* Invisible spacer keeps the title centred */}
        <View style={styles.backButton} />
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <SearchGlass />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by patient name or ID"
            placeholderTextColor="#9799A8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"   // iOS only; Android uses the X below
            autoCapitalize="words"
            autoCorrect={false}
          />
          {/* Android clear button */}
          {Platform.OS === 'android' && query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter Pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
        keyboardShouldPersistTaps="handled"
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterPill,
              activeFilter === f && styles.filterPillActive,
            ]}
            onPress={() => handleFilterPress(f)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === f && styles.filterPillTextActive,
              ]}
            >
              {f} ▾
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Report List ── */}
      <FlatList
        data={filteredReports}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState searchActive={query.length > 0 || activeFilter !== 'All'} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // Performance tuning for large lists
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {/* ── Detail Modal ── */}
      <DetailModal
        report={selectedReport}
        visible={modalVisible}
        onClose={handleModalClose}
      />
    </SafeAreaView>
  );
}


