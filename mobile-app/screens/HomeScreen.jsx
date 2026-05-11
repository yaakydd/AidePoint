// screens/HomeScreen.js

import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { homeStyles } from "../styles/HomeStyles";

// ─── TAB BAR HEIGHT CONSTANT ─────────────────────────────────────────────────
// Every screen that uses MainAppNavigator's absolute tab bar must add
// this amount of padding to the bottom of its scrollable content.
// Without it, the last card sits under the tab bar and can't be tapped.
const TAB_BAR_CLEARANCE = Platform.OS === "ios" ? 105 : 90;

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// This data shapes the entire UI while the backend is being built.
// When the real API is ready, just replace MOCK_STATS and MOCK_SCANS
// with the fetch response. The UI code below doesn't need to change at all.
const MOCK_STATS = {
  todayCount:  12,     // scans performed today
  pending:      3,     // scans waiting for doctor review
  thisWeek:    47,     // total scans this week
  // dayIndex matches JavaScript's Date.getDay(): 0=Sun, 1=Mon ... 6=Sat
  weeklyData: [
    { day: "Mon", dayIndex: 1, count:  6 },
    { day: "Tue", dayIndex: 2, count:  9 },
    { day: "Wed", dayIndex: 3, count:  4 },
    { day: "Thu", dayIndex: 4, count: 11 },
    { day: "Fri", dayIndex: 5, count:  8 },
    { day: "Sat", dayIndex: 6, count:  5 },
    { day: "Sun", dayIndex: 0, count:  4 },
  ],
};

// The four most recent scans — shown in the "Recent Scans" list.
// severity "red" = critical condition found
// severity "green" = no condition / normal
// severity "yellow" = pending / inconclusive
const MOCK_SCANS = [
  { id: "1001", patientName: "Kwame Asante",   condition: "Iron Deficiency Anemia",  severity: "red",    time: "2 min ago"  },
  { id: "1002", patientName: "Ama Owusu",      condition: "Normal — No Condition",   severity: "green",  time: "18 min ago" },
  { id: "1003", patientName: "Kofi Mensah",    condition: "Sickle Cell Anemia",      severity: "red",    time: "1 hr ago"   },
  { id: "1004", patientName: "Abena Frimpong", condition: "Pending Review",          severity: "yellow", time: "2 hrs ago"  },
];

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

// Returns "Good morning", "Good afternoon", or "Good evening"
// based on the current device time. Looks professional in a medical app.
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// Converts a name like "Kwame Asante" into initials "KA".
// Used for the avatar circle instead of hitting an external image URL.
// The ?. and || guards handle null/undefined names safely.
const getInitials = (name) => {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Maps a severity string to its three display values: background, text colour, icon.
// Centralising this logic means we change colours in ONE place, not scattered
// across renderScanCard below.
const getSeverityStyle = (severity) => {
  switch (severity) {
    case "red":
      return { bg: "#FEE2E2", color: "#EF4444", icon: "alert-decagram-outline" };
    case "green":
      return { bg: "#D1FAE5", color: "#10B981", icon: "check-circle-outline" };
    default: // yellow / pending
      return { bg: "#FEF3C7", color: "#F59E0B", icon: "clock-alert-outline" };
  }
};

// ─── WEEKLY BAR CHART ─────────────────────────────────────────────────────────
// This is a self-contained sub-component. Notice it starts with a CAPITAL W —
// that makes it a React component, not a regular function.
// It receives the weekly data array and renders a bar for each day.
//
// We build this with plain Views instead of a chart library because:
//   - No extra package to install
//   - Fully customisable
//   - Easy to understand and maintain
//   - react-native-svg is available if we ever need more complexity
const WeeklyBarChart = ({ data }) => {
  // Find the tallest bar so all others can be drawn proportionally.
  // Math.max(...[6,9,4,11,8,5,4]) = 11
  // The || 1 guard prevents division by zero if all counts are 0.
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // The maximum pixel height a bar can reach.
  // A bar with count === maxCount gets this height.
  // Other bars get (count / maxCount) * BAR_MAX_H pixels.
  const BAR_MAX_H = 72;

  // Today's day index (0=Sunday, 1=Monday ... 6=Saturday).
  // We highlight today's bar differently.
  const todayIndex = new Date().getDay();

  return (
    // flexDirection: "row" lays the 7 bars side by side.
    // justifyContent: "space-between" spreads them evenly across the card width.
    <View style={chartStyles.barsRow}>
      {data.map((item) => {
        const isToday   = item.dayIndex === todayIndex;
        // Math.max(..., 3) ensures even a count of 0 shows a tiny visible nub.
        const barHeight = Math.max((item.count / maxCount) * BAR_MAX_H, 3);

        return (
          // Each column: count label on top, bar in middle, day label at bottom.
          <View key={item.day} style={chartStyles.barColumn}>

            {/* Count number above the bar — only shown if > 0 */}
            {item.count > 0 && (
              <Text style={[chartStyles.barCount, isToday && chartStyles.barCountToday]}>
                {item.count}
              </Text>
            )}

            {/* The bar track (grey background) + the coloured fill */}
            <View style={[chartStyles.barTrack, { height: BAR_MAX_H }]}>
              <View
                style={[
                  chartStyles.barFill,
                  {
                    height: barHeight,
                    // Today = solid purple. Other days = pale purple.
                    backgroundColor: isToday ? "#6200EE" : "#DDD6FE",
                    borderRadius: barHeight > 8 ? 6 : 3,
                  },
                ]}
              />
            </View>

            {/* Day label below the bar, bold + coloured for today */}
            <Text style={[chartStyles.dayLabel, isToday && chartStyles.dayLabelToday]}>
              {item.day}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── SCAN CARD ─────────────────────────────────────────────────────────────────
// A single row in the "Recent Scans" list.
// Accepts a SINGLE scan object — not positional arguments.
// This is much safer: { patientName, condition, severity, time, id }
// instead of renderPatientItem(name, status, type, time, id).
const ScanCard = ({ scan }) => {
  const { bg, color, icon } = getSeverityStyle(scan.severity);

  return (
    <TouchableOpacity style={homeStyles.patientCard} activeOpacity={0.75}>

      {/* LEFT: icon + name + time */}
      <View style={homeStyles.patientInfo}>
        <View style={[homeStyles.patientIcon, { backgroundColor: bg }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>

        <View style={homeStyles.patientTextContainer}>
          <Text style={homeStyles.patientName}>{scan.patientName}</Text>
          <Text style={homeStyles.patientTime}>
            {scan.time} · #{scan.id}
          </Text>
        </View>
      </View>

      {/* RIGHT: condition badge */}
      <View style={[homeStyles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[homeStyles.statusText, { color }]} numberOfLines={1}>
          {scan.condition}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const HomeScreen = () => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();

  const [loading, setLoading]     = useState(false);
  const [stats, setStats]         = useState(null);       // null = not yet fetched
  const [recentScans, setRecentScans] = useState([]);

  // Fallbacks — the user object might not have every field populated yet
  const displayName = user?.name || "there";
  const userRole    = user?.role  || "Lab Technician";

  // ─── FETCH DATA ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // ── TODO: Replace this block with a real API call ────────────────────
      // Example:
      //   const res  = await fetch(`${API_URL}/dashboard?userId=${user.id}`);
      //   const data = await res.json();
      //   setStats(data.stats);
      //   setRecentScans(data.recentScans);
      //
      // ── Simulate network delay ────────────────────────────────────────────
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStats(MOCK_STATS);
      setRecentScans(MOCK_SCANS);

    } catch (error) {
      console.error("Dashboard fetch error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculated from weekly data — the average scans per active day
  const avgPerDay = stats
    ? Math.round(
        stats.weeklyData.reduce((sum, d) => sum + d.count, 0) /
        stats.weeklyData.filter((d) => d.count > 0).length
      )
    : 0;

  return (
    <SafeAreaView style={homeStyles.safeArea} edges={["top"]}>
      {/*
        edges={["top"]} tells SafeAreaView to ONLY apply padding at the top.
        We handle the bottom ourselves via contentContainerStyle paddingBottom,
        because the bottom safe area would conflict with our tab bar clearance.
      */}

      <View style={homeStyles.container}>

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <View style={homeStyles.header}>

          {/* Avatar (initials-based) + greeting */}
          <View style={homeStyles.profileRow}>

            {/*
              Instead of loading an image from an external URL (which can fail
              on hospital networks), we show a circle with the user's initials.
              backgroundColor uses the first letter to pick a colour deterministically.
            */}
            <View style={[homeStyles.avatar, homeStyles.avatarCircle]}>
              <Text style={homeStyles.avatarInitials}>
                {getInitials(displayName)}
              </Text>
            </View>

            <View>
              <Text style={homeStyles.greeting}>
                {getGreeting()}, {displayName.split(" ")[0]}
              </Text>
              <Text style={homeStyles.subGreeting}>{userRole}</Text>
            </View>
          </View>

          {/* Notification button */}
          <TouchableOpacity style={homeStyles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#1E293B" />
            {/* Red dot — shown when there are pending scans */}
            {stats?.pending > 0 && <View style={homeStyles.notifDot} />}
          </TouchableOpacity>
        </View>

        {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            homeStyles.scrollContent,
            { paddingBottom: TAB_BAR_CLEARANCE },
            // paddingBottom pushes the last element up above the tab bar.
            // Without this, the last card is unreachable on most devices.
          ]}
        >

          {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
          <Text style={homeStyles.sectionTitle}>Today's Overview</Text>

          <View style={homeStyles.statsRow}>

            {/* CARD 1: Today's scans */}
            <View style={[homeStyles.statCard, homeStyles.statCardPrimary]}>
              <MaterialCommunityIcons name="microscope" size={20} color="#6200EE" style={{ marginBottom: 6 }} />
              <Text style={homeStyles.statLabel}>TODAY</Text>
              <Text style={homeStyles.statValue}>
                {loading ? "—" : stats?.todayCount ?? 0}
              </Text>
              <Text style={homeStyles.statSub}>scans done</Text>
            </View>

            {/* CARD 2: Pending review */}
            <View style={[homeStyles.statCard, stats?.pending > 0 && homeStyles.statCardWarning]}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={stats?.pending > 0 ? "#F59E0B" : "#94A3B8"} style={{ marginBottom: 6 }} />
              <Text style={homeStyles.statLabel}>PENDING</Text>
              <Text style={homeStyles.statValue}>
                {loading ? "—" : stats?.pending ?? 0}
              </Text>
              <Text style={[homeStyles.statSub, stats?.pending > 0 && { color: "#F59E0B" }]}>
                {stats?.pending > 0 ? "need review" : "all clear"}
              </Text>
            </View>

            {/* CARD 3: This week */}
            <View style={homeStyles.statCard}>
              <MaterialCommunityIcons name="calendar-week" size={20} color="#10B981" style={{ marginBottom: 6 }} />
              <Text style={homeStyles.statLabel}>THIS WEEK</Text>
              <Text style={homeStyles.statValue}>
                {loading ? "—" : stats?.thisWeek ?? 0}
              </Text>
              <Text style={homeStyles.statSub}>total scans</Text>
            </View>
          </View>

          {/* ── WEEKLY CHART ───────────────────────────────────────────────── */}
          <View style={homeStyles.chartCard}>

            {/* Chart header row */}
            <View style={homeStyles.chartHeaderRow}>
              <View>
                <Text style={homeStyles.chartTitle}>Scans This Week</Text>
                <Text style={homeStyles.chartSub}>
                  avg. {loading ? "—" : avgPerDay} scans / day
                </Text>
              </View>
              <View style={homeStyles.chartLegend}>
                <View style={homeStyles.legendDot} />
                <Text style={homeStyles.legendText}>Today</Text>
              </View>
            </View>

            {/* The actual chart — hidden while loading */}
            {loading ? (
              // While data is loading, show a skeleton placeholder row
              <View style={homeStyles.chartSkeleton} />
            ) : stats ? (
              <WeeklyBarChart data={stats.weeklyData} />
            ) : null}
          </View>

          {/* ── QUICK ACTION ────────────────────────────────────────────────── */}
          {/*
            A shortcut button directly on the dashboard.
            Lab techs run many scans per shift — saving them one tap matters.
            navigation.navigate("Scan") works because "Scan" is a Tab.Screen
            in MainAppNavigator.
          */}
          <TouchableOpacity
            style={homeStyles.quickActionBtn}
            onPress={() => navigation.navigate("Scan")}
            activeOpacity={0.85}
          >
            <View style={homeStyles.quickActionLeft}>
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#FFFFFF" />
              <Text style={homeStyles.quickActionText}>Start a New Scan</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* ── RECENT SCANS LIST ───────────────────────────────────────────── */}
          <View style={homeStyles.listHeader}>
            <Text style={homeStyles.sectionTitle}>Recent Scans</Text>
            {recentScans.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate("Report")}>
                <Text style={homeStyles.viewAll}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            // Skeleton cards while loading — better UX than a spinner
            // because the user can see the layout before data arrives
            [1, 2, 3].map((i) => (
              <View key={i} style={[homeStyles.patientCard, homeStyles.skeletonCard]} />
            ))

          ) : recentScans.length > 0 ? (
            // Render only the first 4 scans to keep the dashboard scannable.
            // "View All" above takes them to the Reports screen for more.
            recentScans.slice(0, 4).map((scan) => (
              <ScanCard key={scan.id} scan={scan} />
            ))

          ) : (
            // Empty state — shown when no scans have been done yet
            <View style={homeStyles.emptyContainer}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={48}
                color="#CBD5E1"
              />
              <Text style={homeStyles.emptyText}>No scans recorded yet.</Text>
              <Text style={homeStyles.emptySubText}>
                Tap "Start a New Scan" above to begin.
              </Text>
            </View>
          )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

// ─── CHART STYLES ─────────────────────────────────────────────────────────────
// Defined here (not in HomeStyles.js) because WeeklyBarChart only
// exists in this file. Co-locating the styles makes it self-contained.
const chartStyles = StyleSheet.create({
  barsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",     // bars grow upward from the same bottom line
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,                    // each column takes equal width automatically
    gap: 4,
  },
  barCount: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
  barCountToday: {
    color: "#6200EE",
    fontWeight: "700",
  },
  barTrack: {
    width: "60%",               // bar is 60% of the column width
    justifyContent: "flex-end", // bar grows from the BOTTOM of the track
    alignItems: "center",
  },
  barFill: {
    width: "100%",
  },
  dayLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "400",
    marginTop: 2,
  },
  dayLabelToday: {
    color: "#6200EE",
    fontWeight: "700",
  },
});
