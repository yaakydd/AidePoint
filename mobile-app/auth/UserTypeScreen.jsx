// screens/auth/UserTypeScreen.js

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

import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  layout,
  scale,
  mScale,
} from "../assets/theme";

// Each card is a plain object which is easier to add more user types later
const User_Types = [
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
    id: "personal",
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
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <MaterialCommunityIcons
              name="microscope"
              size={scale(28)}
              color={COLORS.primary}
            />

            <Text style={styles.logoText}>AidePoint</Text>
          </View>

          <Text style={styles.title}>
            How will you use AidePoint?
          </Text>

          <Text style={styles.subtitle}>
            Choose the option that matches your situation.
            This sets up your account correctly.
          </Text>
        </View>

        {/* Type Cards */}
        {User_Types.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={styles.card}
            onPress={() => handleSelect(type)}
            activeOpacity={0.75}
          >
            {/* Icon area */}
            <View
              style={[
                styles.cardIconBg,
                { backgroundColor: type.iconBg },
              ]}
            >
              <MaterialCommunityIcons
                name={type.icon}
                size={scale(38)}
                color={type.iconColor}
              />
            </View>

            {/* Text content */}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {type.title}
              </Text>

              <Text style={styles.cardDescription}>
                {type.description}
              </Text>

              <View
                style={[
                  styles.badge,
                  { backgroundColor: type.badgeColor },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: type.badgeTextColor },
                  ]}
                >
                  {type.badgeText}
                </Text>
              </View>
            </View>

            {/* Arrow hint */}
            <Feather
              name="chevron-right"
              size={scale(20)}
              color={COLORS.border}
            />
          </TouchableOpacity>
        ))}

        {/* Sign-in link for returning users */}
        <TouchableOpacity
          style={styles.signInLink}
          onPress={() => navigation.navigate("SignIn")}
        >
          <Text style={styles.signInText}>
            Already have an account?{" "}
            <Text style={styles.signInHighlight}>
              Sign In
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: SPACING.pagePad,
    paddingBottom: layout.bottomInset + SPACING["3xl"],
  },

  header: {
    paddingTop: scale(36),
    paddingBottom: SPACING["2xl"],
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING["2xl"],
  },

  logoText: {
    fontSize: FONTS["2xl"],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  title: {
    fontSize: FONTS["2xl"],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    lineHeight: mScale(32),
  },

  subtitle: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    lineHeight: mScale(22),
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: scale(1.5),
    borderColor: COLORS.border,
    gap: SPACING.lg,
    ...SHADOWS.sm,
  },

  cardIconBg: {
    width: scale(64),
    height: scale(64),
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  cardBody: {
    flex: 1,
  },

  cardTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  cardDescription: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: mScale(19),
    marginBottom: SPACING.sm,
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: RADIUS.full,
  },

  badgeText: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semibold,
  },

  signInLink: {
    marginTop: SPACING["2xl"],
    alignItems: "center",
  },

  signInText: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
  },

  signInHighlight: {
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
  },
});

export default UserTypeScreen;