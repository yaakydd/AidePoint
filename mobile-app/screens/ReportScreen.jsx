// ReportsScreen.js
// Shows all reports generated from scans.
// New users see an empty state. Reports appear after scans are completed.


import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Modal, ScrollView, StatusBar, Platform,
  Animated, Dimensions, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Rect, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORAGE_KEY = '@aidepoint_reports';

// BLOOD CONDITION CONFIG
// The AI model returns one of: 'sickle' | 'malaria' | 'anaemia' | 'normal'
// This object drives every badge colour and urgency label automatically.


const CONDITIONS = {
  sickle: {
    label:     'Sickle Cell Detected',
    badgeBg:   '#FFF0F0',
    badgeText: '#C0392B',
    badgeDot:  '#E74C3C',
    iconBg:    '#FFF0F0',
    urgency:   'High — refer to haematologist',
  },
  malaria: {
    label:     'Malaria Detected',
    badgeBg:   '#FFF8EC',
    badgeText: '#B07D00',
    badgeDot:  '#F39C12',
    iconBg:    '#FFF8EC',
    urgency:   'High — commence anti-malarial treatment',
  },
  anaemia: {
    label:     'Anaemia Detected',
    badgeBg:   '#F5F0FF',
    badgeText: '#6C3EC1',
    badgeDot:  '#8E44AD',
    iconBg:    '#F5F0FF',
    urgency:   'Moderate — iron panel recommended',
  },
  normal: {
    label:     'Normal Result',
    badgeBg:   '#EEFBF3',
    badgeText: '#1A7340',
    badgeDot:  '#27AE60',
    iconBg:    '#EEFBF3',
    urgency:   'None — routine follow-up only',
  },
};

const FILTER_OPTIONS = ['All', 'Sickle Cell', 'Malaria', 'Anaemia', 'Normal'];

const FILTER_TO_KEY = {
  'All':         null,
  'Sickle Cell': 'sickle',
  'Malaria':     'malaria',
  'Anaemia':     'anaemia',
  'Normal':      'normal',
};

// DATE HELPERS FUNCTIONS

function getRelativeTime(isoString) {
  const date    = new Date(isoString);
  const now     = new Date();
  const minutes = (now - date) / (1000 * 60);
  const hours   = minutes / 60;
  const days    = hours / 24;

  if (minutes < 1)  return 'Just now';
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  if (hours   < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days    < 2)  return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFullDate(isoString) {
  return new Date(isoString).toLocaleDateString([], {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// SVG CONDITION ICONS


function SickleCellIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFF0F0" />
      <Ellipse cx="16" cy="28" rx="11" ry="7" fill="#F5B7B7" transform="rotate(-30 16 28)" />
      <Path d="M14 22 Q38 10 42 29 Q39 44 22 39" fill="#E74C3C" opacity="0.88" />
      <Ellipse cx="23" cy="32" rx="9" ry="5.5" fill="#C0392B" opacity="0.55" transform="rotate(-20 23 32)" />
      <Circle cx="42" cy="16" r="7" fill="#F5B7B7" />
      <Ellipse cx="42" cy="16" rx="5.5" ry="3.5" fill="#E74C3C" opacity="0.72" />
    </Svg>
  );
}

function MalariaIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFF8EC" />
      <Circle cx="28" cy="30" r="15" fill="#FDEBD0" />
      <Circle cx="28" cy="30" r="15" fill="none" stroke="#F39C12" strokeWidth="3" />
      <Circle cx="28" cy="30" r="7" fill="#F39C12" opacity="0.18" />
      <Circle cx="33" cy="25" r="5" fill="#E67E22" />
      <Circle cx="33" cy="25" r="2.8" fill="#D35400" />
      <Circle cx="22" cy="36" r="3.5" fill="#F39C12" opacity="0.82" />
      <Path d="M33 25 Q42 16 47 13" stroke="#C0392B" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Circle cx="47" cy="13" r="3" fill="#C0392B" />
    </Svg>
  );
}

function AnaemiaIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#F5F0FF" />
      <Ellipse cx="18" cy="28" rx="11" ry="8" fill="#D7C9F7" stroke="#9B6FE0" strokeWidth="1.5" />
      <Ellipse cx="18" cy="28" rx="5.5" ry="3.5" fill="#B89CED" opacity="0.45" />
      <Ellipse cx="39" cy="21" rx="10" ry="7.5" fill="#E8DEFF" stroke="#9B6FE0" strokeWidth="1.5" opacity="0.85" />
      <Ellipse cx="39" cy="21" rx="5" ry="3" fill="#C4ADEE" opacity="0.4" />
      <Ellipse cx="35" cy="39" rx="9" ry="6.5" fill="#DDD1FB" stroke="#9B6FE0" strokeWidth="1.5" opacity="0.9" />
      <Line x1="10" y1="10" x2="18" y2="18" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
      <Line x1="18" y1="10" x2="10" y2="18" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
    </Svg>
  );
}

function NormalIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#EEFBF3" />
      <Ellipse cx="18" cy="30" rx="11" ry="8" fill="#A9DFBF" stroke="#27AE60" strokeWidth="1.5" />
      <Ellipse cx="18" cy="30" rx="5.5" ry="3.5" fill="#6DBF8B" opacity="0.6" />
      <Ellipse cx="38" cy="22" rx="11" ry="8" fill="#82D6A2" stroke="#27AE60" strokeWidth="1.5" />
      <Ellipse cx="38" cy="22" rx="5.5" ry="3.5" fill="#52B978" opacity="0.6" />
      <Path d="M30 40 l5 5 l9-11" stroke="#1A7340" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const CONDITION_ICONS = { sickle: SickleCellIcon, malaria: MalariaIcon, anaemia: AnaemiaIcon, normal: NormalIcon };


// SHARED SMALL COMPONENTS


function ConditionIcon({ condition, size = 56 }) {
  const Icon = CONDITION_ICONS[condition] ?? NormalIcon;
  return <Icon size={size} />;
}

function ConditionBadge({ condition }) {
  const cfg = CONDITIONS[condition];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.badgeDot }]} />
      <Text style={[styles.badgeLabel, { color: cfg.badgeText }]}>{cfg.label}</Text>
    </View>
  );
}

function BackArrow() {
  return (
    <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <Path d="M12 3L6 9l6 6" stroke="#1A1B2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <Circle cx="7" cy="7" r="5.5" stroke="#9799A8" strokeWidth="1.5" />
      <Path d="M11 11L15 15" stroke="#9799A8" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRight() {
  return (
    <Svg width="8" height="14" viewBox="0 0 8 14" fill="none">
      <Path d="M1 1l6 6-6 6" stroke="#C8CAD5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}


// REPORT CARD


const ReportCard = React.memo(function ReportCard({ report, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 20 }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onPress(report)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Report for ${report.patientName}, ${CONDITIONS[report.condition]?.label}`}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={styles.cardIcon}>
          <ConditionIcon condition={report.condition} size={56} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{report.patientName}</Text>
          <Text style={styles.cardId}>ID: {report.patientId}</Text>
          <ConditionBadge condition={report.condition} />
        </View>
        <View style={styles.cardTrailing}>
          <Text style={styles.cardTime}>{getRelativeTime(report.timestamp)}</Text>
          <ChevronRight />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

// DETAIL MODAL


function DetailModal({ report, visible, onClose }) {
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideY, { toValue: SCREEN_HEIGHT, duration: 240, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!report) return null;

  const cfg = CONDITIONS[report.condition];

  const detailRows = [
    { label: 'Date',            value: getFullDate(report.timestamp) },
    { label: 'Time',            value: getTime(report.timestamp) },
    { label: 'Condition',       value: cfg.label },
    { label: 'AI Confidence',   value: `${Number(report.confidence).toFixed(1)}%` },
    { label: 'Urgency',         value: cfg.urgency },
    { label: 'Temperature',     value: report.temperature  ? `${report.temperature} °C` : '—' },
    { label: 'Blood Pressure',  value: report.bloodPressure ?? '—' },
    { label: 'Doctor Assigned', value: report.doctorName   ?? '—' },
    { label: 'Lab Technician',  value: report.labTechName },
    { label: 'Notes',           value: report.notes },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>

          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <View style={[styles.sheetIconBg, { backgroundColor: cfg.iconBg }]}>
              <ConditionIcon condition={report.condition} size={62} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>{report.patientName}</Text>
              <Text style={styles.sheetId}>{report.patientId}</Text>
              <ConditionBadge condition={report.condition} />
            </View>
          </View>

          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} bounces={false}>
            {detailRows.map(({ label, value }, index) => (
              <View key={label} style={[styles.detailRow, index === detailRows.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={[
                  styles.detailValue,
                  label === 'Notes'   && styles.notesValue,
                  label === 'Urgency' && { color: cfg.badgeText },
                ]}>
                  {value}
                </Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeBtnText}>Close Report</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ isFiltering }) {
  return (
    <View style={styles.emptyContainer}>
      <Svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ marginBottom: 16 }}>
        <Circle cx="36" cy="36" r="34" stroke="#E5E8EF" strokeWidth="2" />
        <Path d="M24 36h24M36 24v24" stroke="#D0D4DC" strokeWidth="2.5" strokeLinecap="round" transform="rotate(45 36 36)" />
      </Svg>
      <Text style={styles.emptyTitle}>
        {isFiltering ? 'No matching reports' : 'No reports yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isFiltering
          ? 'Try a different name, ID, or filter'
          : 'Complete a scan and your reports will appear here'}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsScreen({ navigation, route }) {

  const [reports,        setReports]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [query,          setQuery]          = useState('');
  const [activeFilter,   setActiveFilter]   = useState('All');
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible,   setModalVisible]   = useState(false);

  const searchRef = useRef(null);

  // Load all saved reports when the screen first mounts
  useEffect(() => {
    loadReports();
  }, []);

  // When the Scan screen finishes an analysis it navigates here with a newReport param.
  // This effect watches for that param and saves the new report.
  useEffect(() => {
    const incoming = route?.params?.newReport;
    if (incoming) {
      saveIncomingReport(incoming);
      navigation?.setParams({ newReport: undefined });
    }
  }, [route?.params?.newReport]);

  //  Storage 

  async function loadReports() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setReports(JSON.parse(stored));
      }
      // If nothing stored, reports stays [] and the empty state is shown
    } catch (error) {
      console.warn('[Aidepoint] Could not load reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveIncomingReport(newReport) {
    try {
      const updated = [newReport, ...reports]; // newest report at the top
      setReports(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('[Aidepoint] Could not save report:', error);
    }
  }

  // Handlers

  const openReport = useCallback((report) => {
    setSelectedReport(report);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setSelectedReport(null), 280); // wait for slide-out animation
  }, []);

  const selectFilter = useCallback((filter) => {
    setActiveFilter(filter);
    searchRef.current?.blur();
  }, []);

  // Filtered list 

  const visibleReports = useMemo(() => {
    const conditionKey = FILTER_TO_KEY[activeFilter];
    const search       = query.toLowerCase().trim();

    return reports.filter((r) => {
      const matchesSearch =
        !search ||
        r.patientName.toLowerCase().includes(search) ||
        r.patientId.toLowerCase().includes(search);

      const matchesFilter = !conditionKey || r.condition === conditionKey;

      return matchesSearch && matchesFilter;
    });
  }, [reports, query, activeFilter]);

  //  FlatList helpers 

  const renderCard    = useCallback(({ item }) => <ReportCard report={item} onPress={openReport} />, [openReport]);
  const getKey        = useCallback((item) => item.id, []);

  // Loading 

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" color="#1A2F6E" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <BackArrow />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Medical Reports</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <SearchIcon />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder="Search by patient name or ID"
            placeholderTextColor="#9799A8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="words"
            autoCorrect={false}
          />
          {Platform.OS === 'android' && query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterStrip} contentContainerStyle={styles.filterContent} keyboardShouldPersistTaps="handled">
        {FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.pill, activeFilter === option && styles.pillActive]}
            onPress={() => selectFilter(option)}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillText, activeFilter === option && styles.pillTextActive]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Report list */}
      <FlatList
        data={visibleReports}
        renderItem={renderCard}
        keyExtractor={getKey}
        ListHeaderComponent={reports.length > 0 ? <Text style={styles.sectionLabel}>RECENT REPORTS</Text> : null}
        ListEmptyComponent={<EmptyState isFiltering={query.length > 0 || activeFilter !== 'All'} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <DetailModal report={selectedReport} visible={modalVisible} onClose={closeModal} />

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: '#F7F8FA' },
  topBar:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E5E8EF' },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F1F5', justifyContent: 'center', alignItems: 'center' },
  screenTitle:    { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1A1B2E' },
  searchWrapper:  { backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  searchBar:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F1F5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 8, gap: 10 },
  searchInput:    { flex: 1, fontSize: 14, color: '#1A1B2E', padding: 0 },
  clearText:      { fontSize: 14, color: '#9799A8' },
  filterStrip:    { backgroundColor: '#FFF', borderBottomWidth: 0.5, borderBottomColor: '#E5E8EF', flexGrow: 0 },
  filterContent:  { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  pill:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#D8DAE5', backgroundColor: '#FFF' },
  pillActive:     { backgroundColor: '#1A2F6E', borderColor: '#1A2F6E' },
  pillText:       { fontSize: 13, fontWeight: '500', color: '#4A4B60' },
  pillTextActive: { color: '#FFF' },
  listContent:    { padding: 16, paddingBottom: 40, flexGrow: 1 },
  sectionLabel:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.9, color: '#9799A8', marginBottom: 12, marginLeft: 4 },
  card:           { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 0.5, borderColor: '#E5E8EF', padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  cardIcon:       { borderRadius: 14, overflow: 'hidden' },
  cardBody:       { flex: 1, gap: 3 },
  cardName:       { fontSize: 15, fontWeight: '600', color: '#1A1B2E' },
  cardId:         { fontSize: 11, color: '#9799A8', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardTrailing:   { alignItems: 'flex-end', alignSelf: 'stretch', justifyContent: 'space-between', paddingVertical: 2 },
  cardTime:       { fontSize: 11, color: '#B0B2BE' },
  badge:          { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, gap: 5, marginTop: 2 },
  badgeDot:       { width: 6, height: 6, borderRadius: 3 },
  badgeLabel:     { fontSize: 11, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle:     { fontSize: 17, fontWeight: '600', color: '#4A4B60', marginBottom: 8 },
  emptySubtitle:  { fontSize: 14, color: '#9799A8', textAlign: 'center', lineHeight: 22 },
  overlay:        { flex: 1, backgroundColor: 'rgba(20,22,40,0.55)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, maxHeight: SCREEN_HEIGHT * 0.88 },
  handle:         { width: 36, height: 4, backgroundColor: '#D8DAE5', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader:    { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 14, borderBottomWidth: 0.5, borderBottomColor: '#F0F1F5' },
  sheetIconBg:    { width: 72, height: 72, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  sheetName:      { fontSize: 18, fontWeight: '700', color: '#1A1B2E', marginBottom: 2 },
  sheetId:        { fontSize: 12, color: '#9799A8', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 6 },
  sheetScroll:    { paddingHorizontal: 20, flexGrow: 0 },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: '#F0F1F5' },
  detailLabel:    { fontSize: 13, color: '#9799A8', fontWeight: '500', flex: 1 },
  detailValue:    { fontSize: 13, color: '#1A1B2E', fontWeight: '500', maxWidth: '58%', textAlign: 'right', lineHeight: 19 },
  notesValue:     { fontSize: 12, lineHeight: 18, color: '#4A4B60' },
  closeBtn:       { marginHorizontal: 20, marginTop: 16, paddingVertical: 15, borderRadius: 14, backgroundColor: '#1A2F6E', alignItems: 'center' },
  closeBtnText:   { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
