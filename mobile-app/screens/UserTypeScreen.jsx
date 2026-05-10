// This screen lets the user identify themselves before they sign up or in.
// Hospital users authenticate via hospital email (domain-matched by backend).
// General users go through email + OTP verification.

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Each card is a plain object which is easier to add more user types later
const USER_TYPES = [
  {
    id: "hospital",
    icon: "hospital-building",
    iconColor: "#3B82F6",
    iconBg: "#EFF6FF",
    title: "Hospital / Institution",
    description:
      "I work at a hospital or medical institution. My administrator has set up access for our staff.",
    badgeText: "Hospital Email Required",
    badgeColor: "#DBEAFE",
    badgeTextColor: "#2563EB",
  },
  {
    id: "solo",
    icon: "account-circle-outline",
    iconColor: "#22C55E",
    iconBg: "#F0FDF4",
    title: "Individual / Solo User",
    description:
      "I'm an independent lab technician or researcher using AidePoint on my own.",
    badgeText: "Email Verification",
    badgeColor: "#DCFCE7",
    badgeTextColor: "#16A34A",
  },
];

const UserTypeScreen = () => {
  const navigation = useNavigation();

  // When user selects a type, we pass it as a route param to SignUp.
  // SignUp reads this param to show/hide hospital-only fields.
  const handleSelect = (type) => {
    navigation.navigate("SignUp", { userType: type.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <MaterialCommunityIcons name="microscope" size={28} color="#0EA5E9" />
            <Text style={styles.logoText}>AidePoint</Text>
          </View>
          <Text style={styles.title}>How will you use AidePoint?</Text>
          <Text style={styles.subtitle}>
            Choose the option that matches your situation. This sets up your account correctly.
          </Text>
        </View>

        {/* Type Cards */}
        {USER_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={styles.card}
            onPress={() => handleSelect(type)}
            activeOpacity={0.75}
          >
            {/* Icon area */}
            <View style={[styles.cardIconBg, { backgroundColor: type.iconBg }]}>
              <MaterialCommunityIcons
                name={type.icon}
                size={38}
                color={type.iconColor}
              />
            </View>

            {/* Text content */}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{type.title}</Text>
              <Text style={styles.cardDescription}>{type.description}</Text>
              <View style={[styles.badge, { backgroundColor: type.badgeColor }]}>
                <Text style={[styles.badgeText, { color: type.badgeTextColor }]}>
                  {type.badgeText}
                </Text>
              </View>
            </View>

            {/* Arrow hint */}
            <Feather name="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        {/* Sign-in link for returning users */}
        <TouchableOpacity
          style={styles.signInLink}
          onPress={() => navigation.navigate("SignIn")}
        >
          <Text style={styles.signInText}>
            Already have an account?{" "}
            <Text style={styles.signInHighlight}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 36,
    paddingBottom: 28,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 22,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  cardIconBg: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    marginBottom: 10,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  signInLink: {
    marginTop: 28,
    alignItems: "center",
  },
  signInText: {
    fontSize: 15,
    color: "#64748B",
  },
  signInHighlight: {
    color: "#0EA5E9",
    fontWeight: "600",
  },
});

export default UserTypeScreen;