// Import React hooks
import React, { useContext, useState, useEffect } from "react";

// Import React Native components
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";

// SafeAreaView prevents content from overlapping
// with phone notches, status bars, and navigation bars
import { SafeAreaView } from "react-native-safe-area-context";

// Icons
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// External styles
import { homeStyles } from "../styles/HomeStyles";

// Auth context
import { AuthContext } from "../context/AuthContext";

const HomeScreen = () => {
  /**
   * AUTHENTICATED USER
   * Pull logged-in user data from context
   */
  const { user } = useContext(AuthContext);

  /**
   * STATE MANAGEMENT
   */

  // Loading spinner state
  const [loading, setLoading] = useState(false);

  // Dashboard statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    avg: 0,
  });

  // Recent patient scans
  const [recentScans, setRecentScans] = useState([]);

  /**
   * FALLBACK VALUES
   * Prevents app crash if user data is missing
   */
  const displayName = user?.name || "Name";
  const userRole = user?.role || "Lab Technician";

  /**
   * RUN ON SCREEN LOAD
   */
  useEffect(() => {
    fetchDashboardData();
  }, []);

  /**
   * FETCH DASHBOARD DATA
   * Later this will connect to Supabase or your backend
   */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Placeholder data for now
      const mockScans = [];

      // Example statistics
      setStats({
        total: 0,
        pending: 0,
        avg: 0,
      });

      // Save scans into state
      setRecentScans(mockScans);
    } catch (error) {
      console.error("Dashboard Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * RENDER PATIENT CARD
   * Reusable component for each patient scan
   */
  const renderPatientItem = (name, status, type, time, id) => {
    // Determine colors based on scan severity
    const backgroundColor =
      type === "red"
        ? "#FEE2E2"
        : type === "green"
        ? "#D1FAE5"
        : "#FEF3C7";

    const textColor =
      type === "red"
        ? "#EF4444"
        : type === "green"
        ? "#10B981"
        : "#F59E0B";

    return (
      <View key={id} style={homeStyles.patientCard}>
        {/* LEFT SIDE */}
        <View style={homeStyles.patientInfo}>
          {/* Patient Status Icon */}
          <View
            style={[
              homeStyles.patientIcon,
              { backgroundColor: backgroundColor },
            ]}
          >
            <MaterialCommunityIcons
              name={
                type === "green"
                  ? "check-circle-outline"
                  : "alert-decagram-outline"
              }
              size={24}
              color={textColor}
            />
          </View>

          {/* Patient Details */}
          <View style={homeStyles.patientTextContainer}>
            <Text style={homeStyles.patientName}>{name}</Text>

            <Text style={homeStyles.patientTime}>
              {time} • Patient {id}
            </Text>
          </View>
        </View>

        {/* STATUS BADGE */}
        <View
          style={[
            homeStyles.statusBadge,
            { backgroundColor: backgroundColor },
          ]}
        >
          <Text style={[homeStyles.statusText, { color: textColor }]}>
            {status}
          </Text>
        </View>
      </View>
    );
  };

  return (
    /**
     * SAFE AREA VIEW
     * Ensures content stays inside visible screen area
     */
    <SafeAreaView style={homeStyles.safeArea}>
      {/* MAIN CONTAINER */}
      <View style={homeStyles.container}>
        
        {/* ================= HEADER ================= */}
        <View style={homeStyles.header}>
          
          {/* LEFT SIDE PROFILE */}
          <View style={homeStyles.profileRow}>
            <Image
              source={{ uri: "https://i.pravatar.cc/100" }}
              style={homeStyles.avatar}
            />

            <View>
              <Text style={homeStyles.greeting}>
                Hey, {displayName}
              </Text>

              <Text style={homeStyles.subGreeting}>
                Welcome back, {userRole}
              </Text>
            </View>
          </View>

          {/* NOTIFICATION BUTTON */}
          <TouchableOpacity style={homeStyles.notificationButton}>
            <Ionicons
              name="notifications-outline"
              size={26}
              color="#1E293B"
            />
          </TouchableOpacity>
        </View>

        {/* ================= MAIN CONTENT ================= */}
        <ScrollView
          style={homeStyles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION TITLE */}
          <Text style={homeStyles.sectionTitle}>
            Dashboard Overview
          </Text>

          {/* ================= STATS CARDS ================= */}
          <View style={homeStyles.statsRow}>
            
            {/* TOTAL SCANS */}
            <View style={homeStyles.statCard}>
              <Text style={homeStyles.statLabel}>
                TOTAL SCANS
              </Text>

              <Text style={homeStyles.statValue}>
                {stats.total}
              </Text>

              {stats.total > 0 && (
                <Text style={homeStyles.statTrend}>
                  <Ionicons
                    name="trending-up"
                    size={14}
                    color="#10B981"
                  />{" "}
                  +100%
                </Text>
              )}
            </View>

            {/* PENDING SCANS */}
            <View style={homeStyles.statCard}>
              <Text style={homeStyles.statLabel}>
                PENDING
              </Text>

              <Text style={homeStyles.statValue}>
                {stats.pending}
              </Text>

              <Text
                style={
                  stats.pending > 0
                    ? homeStyles.statCritical
                    : homeStyles.statLabel
                }
              >
                {stats.pending > 0
                  ? "! Action Required"
                  : "All Clear"}
              </Text>
            </View>
          </View>

          {/* ================= CHART CARD ================= */}
          <View style={homeStyles.chartCard}>
            
            <Text style={homeStyles.statLabel}>
              Patients Analyzed per Day
            </Text>

            {/* Average Number */}
            <View style={homeStyles.averageRow}>
              <Text style={homeStyles.statValue}>
                {stats.avg}
              </Text>

              <Text style={homeStyles.avgText}>
                avg.
              </Text>
            </View>

            {/* Placeholder Chart */}
            {stats.total === 0 ? (
              <View style={homeStyles.emptyChartLine} />
            ) : (
              <View style={homeStyles.placeholderChart} />
            )}
          </View>

          {/* ================= RECENT SCANS ================= */}
          <View style={homeStyles.listHeader}>
            <Text style={homeStyles.sectionTitle}>
              Recent Scans
            </Text>

            {recentScans.length > 0 && (
              <TouchableOpacity>
                <Text style={homeStyles.viewAll}>
                  View All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CONDITIONAL RENDERING */}
          {loading ? (
            // LOADING SPINNER
            <ActivityIndicator
              color="#10B981"
              size="large"
              style={{ marginTop: 20 }}
            />
          ) : recentScans.length > 0 ? (
            // PATIENT LIST
            recentScans.map((scan) =>
              renderPatientItem(
                scan.patient_name,
                scan.result,
                scan.severity,
                "Just now",
                scan.id.toString().slice(0, 4)
              )
            )
          ) : (
            // EMPTY STATE
            <View style={homeStyles.emptyContainer}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={50}
                color="#CBD5E1"
              />

              <Text style={homeStyles.emptyText}>
                No scans recorded yet.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;