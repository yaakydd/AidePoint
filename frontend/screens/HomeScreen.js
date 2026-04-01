import React, { useContext } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { homeStyles } from "../styles/HomeStyles";
import { AuthContext } from "../context/AuthContext";

const HomeScreen = () => {
  const { user } = useContext(AuthContext);

  // Fallback dummy user if context is empty
  const displayName = user?.name || "Joshua";

  // Helper function to render list items (Logic preserved, but not currently called in JSX)
  const renderPatientItem = (name, status, type, time, id) => (
    <View style={homeStyles.patientCard}>
      <View style={homeStyles.patientInfo}>
        <View style={[
          homeStyles.patientIcon, 
          { backgroundColor: type === "red" ? "#FEE2E2" : type === "green" ? "#D1FAE5" : "#FEF3C7" }
        ]}>
          <MaterialCommunityIcons
            name={type === "green" ? "check-circle-outline" : "alert-decagram-outline"}
            size={24}
            color={type === "red" ? "#EF4444" : type === "green" ? "#10B981" : "#F59E0B"}
          />
        </View>
        <View style={{ marginLeft: 12 }}>
          <Text style={homeStyles.patientName}>{name}</Text>
          <Text style={homeStyles.patientTime}>{time} • Patient {id}</Text>
        </View>
      </View>
      <View
        style={[
          homeStyles.statusBadge,
          { backgroundColor: type === "red" ? "#FEE2E2" : type === "green" ? "#D1FAE5" : "#FEF3C7" },
        ]}
      >
        <Text style={[
          homeStyles.statusText, 
          { color: type === "red" ? "#EF4444" : type === "green" ? "#10B981" : "#F59E0B" }
        ]}>
          {status}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={homeStyles.container}>
      {/* Header */}
      <View style={homeStyles.header}>
        <View style={homeStyles.profileRow}>
          <Image 
            source={{ uri: 'https://i.pravatar.cc/100' }} 
            style={homeStyles.avatar} 
          />
          <View>
            <Text style={homeStyles.greeting}>Hey, {displayName}</Text>
            <Text style={homeStyles.subGreeting}>Welcome back, Dr. {displayName}</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={26} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={homeStyles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
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
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" /> ! Critical
            </Text>
          </View>
        </View>

        {/* Chart Placeholder */}
        <View style={homeStyles.chartCard}>
          <Text style={homeStyles.statLabel}>Patients Analyzed per Day</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={homeStyles.statValue}>42</Text>
            <Text style={[homeStyles.avgText, { marginLeft: 4 }]}>avg.</Text>
          </View>
          <View style={homeStyles.placeholderChart} />
        </View>

        {/* Recent Scans Header */}
        <View style={homeStyles.listHeader}>
          <Text style={homeStyles.sectionTitle}>Recent Scans</Text>
          <TouchableOpacity>
            <Text style={homeStyles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Patient items are commented out below. 
          To enable them, remove the curly braces and forward slashes.
        */}

        {/* {renderPatientItem("Amara Okafor", "SICKLE CELL DETECTED", "red", "10 mins ago", "#8291")}
        {renderPatientItem("David Chen", "NORMAL", "green", "2 hours ago", "#8288")}
        {renderPatientItem("Sarah Jenkins", "MALARIA DETECTED", "yellow", "2 hours ago", "#8287")}
        */}
        
      </ScrollView>
    </View>
  );
};

export default HomeScreen;