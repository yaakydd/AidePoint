import React, { useContext, useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { homeStyles } from "../styles/HomeStyles";
import { AuthContext } from "../context/AuthContext";
// import { supabase } from "../lib/supabase"; 

const HomeScreen = () => {
  // 1. DYNAMIC USER DATA: We pull 'user' from your AuthContext
  const { user } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(false); // Set to false since we aren't fetching yet
  const [stats, setStats] = useState({ total: 0, pending: 0, avg: 0 });
  const [recentScans, setRecentScans] = useState([]);

  // Use the name from AuthContext, fallback to "Name" only if null
  const displayName = user?.name || "Name";
  const userRole = user?.role || "Lab Technician";

 useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // TODO: Connect to Supabase when backend is ready
      // Placeholder data for now
      const mockScans = [];
      
      setStats({
        total: 0,
        pending: 0,
        avg: 0
      });
      setRecentScans(mockScans);
    } catch (error) {
      console.error("Error fetching dashboard:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPatientItem = (name, status, type, time, id) => (
    <View key={id} style={homeStyles.patientCard}>
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
      <View style={[
          homeStyles.statusBadge,
          { backgroundColor: type === "red" ? "#FEE2E2" : type === "green" ? "#D1FAE5" : "#FEF3C7" },
        ]}>
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
    <SafeAreaView>
    <View style={homeStyles.container}>
      {/* HEADER: Updated to show real name and role */}
      <View style={homeStyles.header}>
        <View style={homeStyles.profileRow}>
          <Image source={{ uri: 'https://i.pravatar.cc/100' }} style={homeStyles.avatar} />
          <View>
            <Text style={homeStyles.greeting}>Hey, {displayName}</Text>
            <Text style={homeStyles.subGreeting}>Welcome back, {userRole}</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={26} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={homeStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={homeStyles.sectionTitle}>Dashboard Overview</Text>

        {/* STATS: These will be 0 for new users */}
        <View style={homeStyles.statsRow}>
          <View style={homeStyles.statCard}>
            <Text style={homeStyles.statLabel}>TOTAL SCANS</Text>
            <Text style={homeStyles.statValue}>{stats.total}</Text>
            {stats.total > 0 && (
              <Text style={homeStyles.statTrend}>
                <Ionicons name="trending-up" size={14} color="#10B981" /> +100%
              </Text>
            )}
          </View>
          <View style={homeStyles.statCard}>
            <Text style={homeStyles.statLabel}>PENDING</Text>
            <Text style={homeStyles.statValue}>{stats.pending}</Text>
            <Text style={stats.pending > 0 ? homeStyles.statCritical : homeStyles.statLabel}>
               {stats.pending > 0 ? "! Action Required" : "All Clear"}
            </Text>
          </View>
        </View>

        {/* CHART: Conditional rendering for the graph */}
        <View style={homeStyles.chartCard}>
          <Text style={homeStyles.statLabel}>Patients Analyzed per Day</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={homeStyles.statValue}>{stats.avg}</Text>
            <Text style={[homeStyles.avgText, { marginLeft: 4 }]}>avg.</Text>
          </View>
          
          {/* LOGIC: If scans are 0, show a flat line. If > 0, show the wavy chart */}
          {stats.total === 0 ? (
            <View style={{ 
              height: 2, 
              backgroundColor: '#E2E8F0', 
              marginTop: 50, 
              width: '100%',
              borderRadius: 1 
            }} />
          ) : (
            <View style={homeStyles.placeholderChart} />
          )}
        </View>

        <View style={homeStyles.listHeader}>
          <Text style={homeStyles.sectionTitle}>Recent Scans</Text>
          {recentScans.length > 0 && (
            <TouchableOpacity><Text style={homeStyles.viewAll}>View All</Text></TouchableOpacity>
          )}
        </View>

        {/* RECENT SCANS: Conditional rendering for the list */}
        {loading ? (
          <ActivityIndicator color="#10B981" style={{ marginTop: 20 }} />
        ) : recentScans.length > 0 ? (
          recentScans.map(scan => renderPatientItem(
            scan.patient_name, 
            scan.result, 
            scan.severity, 
            "Just now", 
            scan.id.toString().slice(0,4)
          ))
        ) : (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#CBD5E1" />
            <Text style={{ color: '#64748B', marginTop: 10 }}>No scans recorded yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
