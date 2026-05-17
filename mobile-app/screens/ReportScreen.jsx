// screens/ReportsScreen.js
//
// Shows all generated reports in a searchable, filterable list.
// FIXED:
// - Removed duplicate search/filter UI
// - Fixed filter bar layout + sizing
// - Added proper sticky header inside FlatList
// - Fixed keyboard behavior so bottom tabs don't block input
// - Improved spacing + UX polish

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
  KeyboardAvoidingView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Rect, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { loadReports, CONDITION_CONFIG } from '../utils/ReportUtils';
import { ReportStyles as styles } from '../styles/ReportStyles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;
const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.82;

// ─────────────────────────────────────────────────────────────
// FILTERS
// ─────────────────────────────────────────────────────────────
const FILTERS = [
  { label: 'All', key: null },
  { label: 'Sickle Cell', key: 'sickle_cell' },
  { label: 'Iron Def.', key: 'iron_deficiency' },
  { label: 'Malaria', key: 'malaria' },
  { label: 'Thalassemia', key: 'thalassemia' },
  { label: 'Normal', key: 'normal' },
];

// ─────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// ICON WRAPPER
// ─────────────────────────────────────────────────────────────
function ConditionIcon({ condition, size = 56 }) {
  const Icon = CONDITION_ICONS[condition] ?? NormalIcon;
  return <Icon size={size} />;
}

// ─────────────────────────────────────────────────────────────
// FILTER CHIP (clean modern pill UI)
// ─────────────────────────────────────────────────────────────
function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.filterPill,
        active && styles.filterPillActive,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          active && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
const ReportScreen = ({ navigation, route }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);

  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── Load reports once
  useEffect(() => {
    (async () => {
      const stored = await loadReports();
      setReports(stored);
      setLoading(false);
    })();
  }, []);

  // ── Add new report when returning from Scan screen
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      const incoming = route.params?.newReport;
      if (incoming) {
        setReports(prev => [incoming, ...prev]);
        navigation.setParams({ newReport: undefined });
      }
    });
    return unsub;
  }, [navigation]);

  // ── Filtering logic
  const visibleReports = useMemo(() => {
    const term = query.toLowerCase();

    return reports.filter(r => {
      const matchesSearch =
        !term ||
        r.patientName?.toLowerCase().includes(term) ||
        r.patientId?.toLowerCase().includes(term);

      const matchesFilter =
        !activeFilter || r.condition === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [reports, query, activeFilter]);

  const openReport = useCallback((report) => {
    setSelectedReport(report);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setSelectedReport(null), 250);
  }, []);

  const renderCard = useCallback(({ item }) => (
    <ReportCard report={item} onPress={openReport} />
  ), [openReport]);

  // ─────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.screen} edges={['top']}>

        <StatusBar barStyle="dark-content" />

        {/* ───────────────── HEADER ───────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Medical Reports</Text>
          <Text style={styles.headerCount}>{reports.length} total</Text>
        </View>

        {/* ───────────────── LIST ───────────────── */}
        <FlatList
          data={visibleReports}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"

          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: TAB_BAR_CLEARANCE },
          ]}

          // IMPORTANT: ONLY ONE HEADER (fix duplicate issue)
          ListHeaderComponent={
            <View>

              {/* SEARCH */}
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search patient name or ID..."
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                />
              </View>

              {/* FILTER BAR (FIXED: full width, no spacing issues) */}
              <View style={styles.filterWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterContent}
                >
                  {FILTERS.map(f => (
                    <FilterChip
                      key={f.label}
                      label={f.label}
                      active={activeFilter === f.key}
                      onPress={() => setActiveFilter(f.key)}
                    />
                  ))}
                </ScrollView>
              </View>

            </View>
          }
        />

        {/* ───────────────── MODAL ───────────────── */}
        <DetailModal
          report={selectedReport}
          visible={modalVisible}
          onClose={closeModal}
        />

      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default ReportScreen;