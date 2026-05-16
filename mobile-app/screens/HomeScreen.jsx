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
import { homeStyles as styles } from "../styles/HomeStyles";

//  TAB BAR HEIGHT CONSTANT 
// Every screen that uses MainAppNavigator's absolute tab bar must add
// this amount of padding to the bottom of its scrollable content.
// Without it, the last card sits under the tab bar and can't be tapped.
const TAB_BAR_CLEARANCE = Platform.OS === "ios" ? 105 : 90;

// MOCK DATA 

const MOCK_STATS = {
  todayCount: 12,     // scans performed today
  pending: 3,     // scans waiting for doctor review
  thisWeek: 47,     // total scans this week
  // dayIndex matches JavaScript's Date.getDay(): 0=Sun, 1=Mon ... 6=Sat
  weeklyData: [
    { day: "Mon", dayIndex: 1, count: 6 },
    { day: "Tue", dayIndex: 2, count: 9 },
    { day: "Wed", dayIndex: 3, count: 4 },
    { day: "Thu", dayIndex: 4, count: 11 },
    { day: "Fri", dayIndex: 5, count: 8 },
    { day: "Sat", dayIndex: 6, count: 5 },
    { day: "Sun", dayIndex: 0, count: 4 },
  ],
};

// The four most recent scans is shown in the "Recent Scans" list.
// severity "red" = critical condition found
// severity "green" = no condition / normal
// severity "yellow" = pending / inconclusive
const MOCK_SCANS = [
  { id: "1001", patientName: "Kwame Asante", condition: "Iron Deficiency Anemia", severity: "red", time: "2 min ago" },
  { id: "1002", patientName: "Ama Owusu", condition: "Normal - No Condition", severity: "green", time: "18 min ago" },
  { id: "1003", patientName: "Kofi Mensah", condition: "Sickle Cell Anemia", severity: "red", time: "1 hr ago" },
  { id: "1004", patientName: "Abena Frimpong", condition: "Pending Review", severity: "yellow", time: "2 hrs ago" },
];

//  HELPER FUNCTIONS 

// Returns "Good morning", "Good afternoon", or "Good evening"
// based on the current device time. 
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// Converts names into initials to be displayed in the avatar.
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

// WEEKLY BAR CHART 
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
  // Other bars get (count / maxCount) * Bar_Max_Height pixels.
  const Bar_Max_Height= 72;

  // Today's day index (0=Sunday, 1=Monday ... 6=Saturday).
  // We highlight today's bar differently.
  const todayIndex = new Date().getDay();

  return (
    // flexDirection: "row" lays the 7 bars side by side.
    // justifyContent: "space-between" spreads them evenly across the card width.
    <View style={styles.barsRow}>
      {data.map((item) => {
        const isToday = item.dayIndex === todayIndex;
        // Math.max(..., 3) ensures even a count of 0 shows a tiny visible nub.
        const barHeight = Math.max((item.count / maxCount) * Bar_Max_Height, 3);

        return (
          // Each column: count label on top, bar in middle, day label at bottom.
          <View key={item.day} style={styles.barColumn}>

            {/* Count number above the bar, only shown if > 0 */}
            {item.count > 0 && (
              <Text style={[styles.barCount, isToday && styles.barCountToday]}>
                {item.count}
              </Text>
            )}

            {/* The bar track (grey background) + the coloured fill */}
            <View style={[styles.barTrack, { height: Bar_Max_Height}]}>
              <View
                style={[
                  styles.barFill,
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
            <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
              {item.day}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
// SCAN CARD
// A single row in the "Recent Scans" list.
// Accepts a SINGLE scan object, not positional arguments.
// This is much safer: { patientName, condition, severity, time, id }
// instead of renderPatientItem(name, status, type, time, id).
const ScanCard = ({ scan }) => {
  const { bg, color, icon } = getSeverityStyle(scan.severity);

  return (
    <TouchableOpacity style={styles.patientCard} activeOpacity={0.75}>

      {/* LEFT: icon + name + time */}
      <View style={styles.patientInfo}>
        <View style={[styles.patientIcon, { backgroundColor: bg }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>

        <View style={styles.patientTextContainer}>
          <Text style={styles.patientName}>{scan.patientName}</Text>
          <Text style={styles.patientTime}>
            {scan.time} · #{scan.id}
          </Text>
        </View>
      </View>

      {/* RIGHT: condition badge */}
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusText, { color }]} numberOfLines={1}>
          {scan.condition}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// MAIN SCREEN 
const HomeScreen = () => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);       // null = not yet fetched
  const [recentScans, setRecentScans] = useState([]);

  // Fallbacks to the user object which might not have every field populated yet
  const displayName = user?.name || "Lab Technician";
  const userRole = user?.role  || "Lab Technician";

  //  FETCH DATA 
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      //  TODO: Replace this block with a real API call 
      // Example:
      //   const res  = await fetch(`${API_URL}/dashboard?userId=${user.id}`);
      //   const data = await res.json();
      //   setStats(data.stats);
      //   setRecentScans(data.recentScans);
      //
      //  Simulate network delay 
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
    <SafeAreaView style={styles.container}>
        {/* HEADER  */}
        <View style={styles.header}>

          {/* Avatar (initials-based) + greeting */}
          <View style={styles.profileRow}>

            {/*
              Instead of loading an image from an external URL (which can fail
              on hospital networks), we show a circle with the user's initials.
              backgroundColor uses the first letter to pick a colour deterministically.
            */}
            <View style={[styles.avatar, styles.avatarCircle]}>
              <Text style={styles.avatarInitials}>
                {getInitials(displayName)}
              </Text>
            </View>

            <View>
              <Text style={styles.greeting}>
                {getGreeting()}, {displayName.split(" ")[0] || "User"}
              </Text>
              <Text style={styles.subGreeting}>{userRole}</Text>
            </View>
          </View>

          {/* Notification button */}
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#1E293B" />
            {/* Red dot — shown when there are pending scans */}
            {stats?.pending > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>

        {/* SCROLLABLE CONTENT */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: TAB_BAR_CLEARANCE },
            // paddingBottom pushes the last element up above the tab bar.
            // Without this, the last card is unreachable on most devices.
          ]}
        >

          {/* STAT CARDS*/}
          <Text style={styles.sectionTitle}>Today's Overview</Text>

          {/*
            Solo users only need personal scan metrics.
            Hospital/lab users also need workflow metrics like pending reviews.
          */}
          {/*
            Example:
            user.userType === "solo"
            user.userType === "hospital"
          */}
          {/*
            This boolean controls conditional dashboard rendering.
          */}
          {/*
            We keep this logic close to the UI because it directly affects layout.
          */}
          {/*
            Hospital users:
              TODAY + PENDING + THIS WEEK

            Solo users:
              TODAY + THIS WEEK
          */}
          {/*
            Responsive width:
            - Hospital users: 3 cards
            - Solo users: 2 cards
          */}
          {/*
            This prevents overflow on smaller Android devices.
          */}
          {/*
            NOTE:
            The user object may not yet contain userType during onboarding,
            so we safely default to "solo".
          */}
          {/*
            Future expansion:
            doctor
            admin
            regional_lab
            national_program
          */}
          {/*
            Role-driven rendering scales very well as the app grows.
          */}
          {/*
            Example backend response:
            {
              name: "Kwame",
              role: "Lab Technician",
              userType: "hospital"
            }
          */}
          {/*
            IMPORTANT:
            We do NOT hardcode widths in styles because the width
            depends on the current user's dashboard type.
          */}
          {/*
            Dynamic inline width keeps the layout responsive.
          */}
          {/*
            31% = 3 cards fit nicely
            48% = 2 cards fit nicely
          */}
          {/*
            flexWrap allows cards to wrap on extremely small screens.
          */}
          {/*
            This avoids text overflowing outside the screen.
          */}
          {/*
            AidePoint must support:
            - small Android devices
            - large Samsung devices
            - iPhones
            - tablets
          */}

          {(() => {
            const isHospitalUser =
              (user?.userType || "solo") === "hospital";

            const statCardWidth = isHospitalUser ? "31%" : "48%";

            return (
              <View style={styles.statsRow}>

                {/* CARD 1: Today's scans */}
                <View
                  style={[
                    styles.statCard,
                    styles.statCardPrimary,
                    { width: statCardWidth },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="microscope"
                    size={20}
                    color="#6200EE"
                    style={{ marginBottom: 6 }}
                  />

                  <Text style={styles.statLabel}>TODAY</Text>

                  <Text style={styles.statValue}>
                    {loading ? "—" : stats?.todayCount ?? 0}
                  </Text>

                  <Text style={styles.statSub}>
                    scans done
                  </Text>
                </View>

                {/* CARD 2: Pending review */}
                {isHospitalUser && (
                  <View
                    style={[
                      styles.statCard,
                      stats?.pending > 0 &&
                        styles.statCardWarning,
                      { width: statCardWidth },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={20}
                      color={
                        stats?.pending > 0
                          ? "#F59E0B"
                          : "#94A3B8"
                      }
                      style={{ marginBottom: 6 }}
                    />

                    <Text style={styles.statLabel}>
                      PENDING
                    </Text>

                    <Text style={styles.statValue}>
                      {loading ? "—" : stats?.pending ?? 0}
                    </Text>

                    <Text
                      style={[
                        styles.statSub,
                        stats?.pending > 0 && {
                          color: "#F59E0B",
                        },
                      ]}
                    >
                      {stats?.pending > 0
                        ? "need review"
                        : "all clear"}
                    </Text>
                  </View>
                )}

                {/* CARD 3: This week */}
                <View
                  style={[
                    styles.statCard,
                    { width: statCardWidth },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="calendar-week"
                    size={20}
                    color="#10B981"
                    style={{ marginBottom: 6 }}
                  />

                  <Text style={styles.statLabel}>
                    THIS WEEK
                  </Text>

                  <Text style={styles.statValue}>
                    {loading ? "—" : stats?.thisWeek ?? 0}
                  </Text>

                  <Text style={styles.statSub}>
                    total scans
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* WEEKLY CHART */}
          <View style={styles.chartCard}>

            {/* Chart header row */}
            <View style={styles.chartHeaderRow}>
              <View>
                <Text style={styles.chartTitle}>Scans This Week</Text>
                <Text style={styles.chartSub}>
                  avg. {loading ? "—" : avgPerDay} scans / day
                </Text>
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Today</Text>
              </View>
            </View>

            {/* The actual chart — hidden while loading */}
            {loading ? (
              // While data is loading, show a skeleton placeholder row
              <View style={styles.chartSkeleton} />
            ) : stats ? (
              <WeeklyBarChart data={stats.weeklyData} />
            ) : null}
          </View>

          {/* QUICK ACTION  */}
          {/*
            A shortcut button directly on the dashboard.
            Lab techs run many scans per shift — saving them one tap matters.
            navigation.navigate("Scan") works because "Scan" is a Tab.Screen
            in MainAppNavigator.
          */}
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate("Scan")}
            activeOpacity={0.85}
          >
            <View style={styles.quickActionLeft}>
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Start a New Scan</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* RECENT SCANS LIST  */}
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            {recentScans.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate("Report")}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            // Skeleton cards while loading — better UX than a spinner
            // because the user can see the layout before data arrives
            [1, 2, 3].map((i) => (
              <View key={i} style={[styles.patientCard, styles.skeletonCard]} />
            ))

          ) : recentScans.length > 0 ? (
            // Render only the first 4 scans to keep the dashboard scannable.
            // "View All" above takes them to the Reports screen for more.
            recentScans.slice(0, 4).map((scan) => (
              <ScanCard key={scan.id} scan={scan} />
            ))

          ) : (
            // Empty state — shown when no scans have been done yet
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={48}
                color="#CBD5E1"
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
