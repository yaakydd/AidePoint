import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { homeStyles } from "../styles/HomeStyles";
import MainAppNavigator from "../navigation/MainAppNavigator";

const HomeScreen = () => {
  return (
    <View style={homeStyles.container}>
      {/* Header */}
      <View style={homeStyles.header}>
        <View style={homeStyles.profileRow}>
          <View style={homeStyles.avatar} />
          <View>
            <Text style={homeStyles.greeting}>Hey, Joshua</Text>
            <Text style={homeStyles.subGreeting}>Welcome back, Dr. Joshua</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={28} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={homeStyles.content}>
        <Text style={homeStyles.sectionTitle}>Dashboard Overview</Text>

        {/* Stats Row */}
        <View style={homeStyles.statsRow}>
          <View style={homeStyles.statCard}>
            <Text style={homeStyles.statLabel}>TOTAL SCANS</Text>
            <Text style={homeStyles.statValue}>128</Text>
            <Text style={homeStyles.statTrend}>
              <Ionicons name="trending-up" size={14} color="#10B981" /> +12%
            </Text>
          </View>
          <View style={homeStyles.statCard}>
            <Text style={homeStyles.statLabel}>PENDING</Text>
            <Text style={homeStyles.statValue}>5</Text>
            <Text style={homeStyles.statCritical}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" /> Critical
            </Text>
          </View>
        </View>

        {/* Chart Placeholder */}
        <View style={homeStyles.chartCard}>
          <Text style={homeStyles.statLabel}>Patients Analyzed per Day</Text>
          <Text style={homeStyles.statValue}>
            42 <Text style={homeStyles.avgText}>avg.</Text>
          </Text>
          <View style={homeStyles.placeholderChart} />
        </View>

        {/* Recent Scans */}
        <View style={homeStyles.listHeader}>
          <Text style={homeStyles.sectionTitle}>Recent Scans</Text>
          <TouchableOpacity>
            <Text style={homeStyles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {renderPatientItem("Amara Okafor", "SICKLE CELL DETECTED", "red")}
        {renderPatientItem("David Chen", "NORMAL", "green")}
      </ScrollView>

      {/* Bottom Tabs */}
      <MainAppNavigator />
    </View>
  );
};

const renderPatientItem = (name, status, type) => (
  <View style={homeStyles.patientCard}>
    <View style={homeStyles.patientInfo}>
      <View style={homeStyles.patientIcon}>
        <FontAwesome5
          name="user-injured"
          size={20}
          color={type === "red" ? "#EF4444" : "#10B981"}
        />
      </View>
      <View>
        <Text style={homeStyles.patientName}>{name}</Text>
        <Text style={homeStyles.patientTime}>10 mins ago • #8291</Text>
      </View>
    </View>
    <View
      style={[
        homeStyles.statusBadge,
        { backgroundColor: type === "red" ? "#FEE2E2" : "#D1FAE5" },
      ]}
    >
      <Text style={{ color: type === "red" ? "#EF4444" : "#10B981" }}>
        {status}
      </Text>
    </View>
  </View>
);

export default HomeScreen;