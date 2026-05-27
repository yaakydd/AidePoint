// screens/HomeScreen.js

import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AuthContext } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { homeStyles as styles } from '../styles/HomeStyles';

const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;

const CONDITION_LABELS = {
  sickle_cell:     'Sickle Cell Anaemia',
  iron_deficiency: 'Iron Deficiency Anaemia',
  malaria:         'Malarial Anaemia',
  thalassemia:     'Thalassemia',
  pernicious:      'Pernicious Anaemia',
  megaloblastic:   'Megaloblastic Anaemia',
  aplastic:        'Aplastic Anaemia',
  hemolytic:       'Haemolytic Anaemia',
  normal:          'No Condition Detected',
};

const HIGH_SEVERITY_SET = new Set([
  'sickle_cell', 'malaria', 'thalassemia', 'hemolytic', 'aplastic',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getSeverityStyle(severity) {
  switch (severity) {
    case 'red':   return { bg: '#FEE2E2', color: '#EF4444', icon: 'alert-decagram-outline' };
    case 'green': return { bg: '#D1FAE5', color: '#10B981', icon: 'check-circle-outline' };
    default:      return { bg: '#FEF3C7', color: '#F59E0B', icon: 'clock-alert-outline' };
  }
}

function getRelativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 172800) return 'Yesterday';
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// ── Weekly Bar Chart ──────────────────────────────────────────────────────────

const WeeklyBarChart = ({ data }) => {
  const maxCount   = Math.max(...data.map(d => d.count), 1);
  const BAR_MAX    = 72;
  const todayIndex = new Date().getDay();

  return (
    <View style={styles.barsRow}>
      {data.map(item => {
        const isToday   = item.dayIndex === todayIndex;
        const barHeight = Math.max((item.count / maxCount) * BAR_MAX, 3);
        return (
          <View key={item.day} style={styles.barColumn}>
            {item.count > 0 && (
              <Text style={[styles.barCount, isToday && styles.barCountToday]}>
                {item.count}
              </Text>
            )}
            <View style={[styles.barTrack, { height: BAR_MAX }]}>
              <View
                style={[styles.barFill, {
                  height:          barHeight,
                  backgroundColor: isToday ? '#6200EE' : '#DDD6FE',
                  borderRadius:    barHeight > 8 ? 6 : 3,
                }]}
              />
            </View>
            <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
              {item.day}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ── Scan Card ─────────────────────────────────────────────────────────────────

const ScanCard = ({ scan, onPress }) => {
  const { bg, color, icon } = getSeverityStyle(scan.severity);
  return (
    <TouchableOpacity
      style={styles.patientCard}
      activeOpacity={0.75}
      onPress={() => onPress?.(scan)}
    >
      <View style={styles.patientInfo}>
        <View style={[styles.patientIcon, { backgroundColor: bg }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <View style={styles.patientTextContainer}>
          <Text style={styles.patientName}>{scan.patientName}</Text>
          <Text style={styles.patientTime}>
            {scan.time} · #{scan.shortId}
          </Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusText, { color }]} numberOfLines={1}>
          {scan.condition}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const { user }   = useContext(AuthContext);
  const navigation = useNavigation();

  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [stats,       setStats]       = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [fetchError,  setFetchError]  = useState(null);

  const displayName = user?.name ?? 'Lab Technician';

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    // FIX: release loading state immediately if no user, not stuck forever
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setFetchError(null);

    try {
      const now          = new Date();
      const startOfToday = new Date(
        now.getFullYear(), now.getMonth(), now.getDate()
      ).toISOString();

      // FIX: was 6 * 24h (6 days back). Now a true 7-day window.
      const sevenDaysAgo = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const [todayRes, weekRes, recentRes] = await Promise.all([

        // Today's count — head:true returns only the count, no row data
        supabase
          .from('scans')
          .select('*', { count: 'exact', head: true })
          // FIX: column is created_by, not lab_tech_id
          .eq('created_by', user.id)
          .gte('created_at', startOfToday),

        // This week's scans for the chart
        supabase
          .from('scans')
          .select('created_at, status, results')
          // FIX: created_by
          .eq('created_by', user.id)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false }),

        // 4 most recent scans for the list
        // FIX: patient_name doesn't exist on scans — join patients table.
        // FIX: condition doesn't exist on scans — it lives inside results JSONB.
        supabase
          .from('scans')
          .select('id, status, created_at, results, patients(name)')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(4),
      ]);

      if (todayRes.error)  throw todayRes.error;
      if (weekRes.error)   throw weekRes.error;
      if (recentRes.error) throw recentRes.error;

      const weekScans = weekRes.data  ?? [];
      const recentRaw = recentRes.data ?? [];

      // Build weekly chart data (Sun=0 … Sat=6)
      const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const countByDay = {};
      weekScans.forEach(s => {
        const idx = new Date(s.created_at).getDay();
        countByDay[idx] = (countByDay[idx] || 0) + 1;
      });
      const weeklyData = DAY_NAMES.map((day, dayIndex) => ({
        day, dayIndex, count: countByDay[dayIndex] ?? 0,
      }));

      setStats({
        todayCount: todayRes.count ?? 0,
        thisWeek:   weekScans.length,
        weeklyData,
      });

      // Map raw rows to UI shape
      setRecentScans(recentRaw.map(s => {
        // FIX: name comes from the joined patients row
        const patientName = s.patients?.name ?? 'Unknown Patient';

        // FIX: condition lives inside the results JSONB, not a top-level column
        const rawCondition = s.results?.condition ?? null;

        const isPending =
          !rawCondition ||
          s.status === 'pending' ||
          s.status === 'processing';

        const severity = isPending
          ? 'yellow'
          : rawCondition === 'normal'
          ? 'green'
          : HIGH_SEVERITY_SET.has(rawCondition) ? 'red' : 'yellow';

        return {
          id:          s.id,
          shortId:     s.id.slice(-6).toUpperCase(),
          patientName,
          condition:   isPending
            ? 'Pending Analysis'
            : (CONDITION_LABELS[rawCondition] ?? rawCondition),
          severity,
          time:        getRelativeTime(s.created_at),
        };
      }));

    } catch (err) {
      console.error('HomeScreen fetchDashboardData:', err.message);
      setFetchError('Could not load dashboard. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // FIX: divide by 7 (true weekly average), not by days-with-scans (inflated)
  const avgPerDay = stats
    ? Math.round(stats.thisWeek / 7)
    : 0;

  // FIX: pass scanId so Reports screen can navigate to the specific record
  function handleScanPress(scan) {
    navigation.navigate('Reports', { scanId: scan.id });
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, styles.avatarCircle]}>
            <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {displayName.split(' ')[0]}
            </Text>
            <Text style={styles.subGreeting}>Lab Technician</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: TAB_BAR_CLEARANCE },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00BCD4"
            colors={['#00BCD4']}
          />
        }
      >
        {/* ── Error banner ── */}
        {fetchError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{fetchError}</Text>
          </View>
        ) : null}

        {/* ── Stat Cards ── */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsRow}>

          <View style={[styles.statCard, styles.statCardPrimary, { width: '48%' }]}>
            <MaterialCommunityIcons
              name="microscope" size={20} color="#6200EE"
              style={{ marginBottom: 6 }}
            />
            <Text style={styles.statLabel}>TODAY</Text>
            <Text style={styles.statValue}>
              {loading ? '—' : stats?.todayCount ?? 0}
            </Text>
            <Text style={styles.statSub}>scans done</Text>
          </View>

          <View style={[styles.statCard, { width: '48%' }]}>
            <MaterialCommunityIcons
              name="calendar-week" size={20} color="#10B981"
              style={{ marginBottom: 6 }}
            />
            <Text style={styles.statLabel}>THIS WEEK</Text>
            <Text style={styles.statValue}>
              {loading ? '—' : stats?.thisWeek ?? 0}
            </Text>
            <Text style={styles.statSub}>total scans</Text>
          </View>
        </View>

        {/* ── Weekly Chart ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <View>
              <Text style={styles.chartTitle}>Scans This Week</Text>
              <Text style={styles.chartSub}>
                avg. {loading ? '—' : avgPerDay} scans / day
              </Text>
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Today</Text>
            </View>
          </View>
          {loading ? (
            <View style={styles.chartSkeleton} />
          ) : stats ? (
            <WeeklyBarChart data={stats.weeklyData} />
          ) : null}
        </View>

        {/* ── Quick Action ── */}
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => navigation.navigate('Scan')}
          activeOpacity={0.85}
        >
          <View style={styles.quickActionLeft}>
            <MaterialCommunityIcons
              name="plus-circle-outline" size={22} color="#FFFFFF"
            />
            <Text style={styles.quickActionText}>Start a New Scan</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* ── Recent Scans ── */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          {recentScans.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          [1, 2, 3].map(i => (
            <View key={i} style={[styles.patientCard, styles.skeletonCard]} />
          ))
        ) : recentScans.length > 0 ? (
          recentScans.map(scan => (
            <ScanCard key={scan.id} scan={scan} onPress={handleScanPress} />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="clipboard-text-outline" size={48} color="#CBD5E1"
            />
            <Text style={styles.emptyText}>No scans recorded yet.</Text>
            <Text style={styles.emptySubText}>
              Tap "Start a New Scan" above to begin.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
