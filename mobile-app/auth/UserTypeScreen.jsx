// screens/auth/UserTypeScreen.js
//
// TWO CONTEXTS — this screen is used in two different situations:
//
// 1. DURING SIGNUP (within AuthNavigator):
//    route.params.pendingUser is set.
//    The user filled in their name/email/password in SignUp, then came here.
//    Tapping a card calls register({ ...pendingUser, userType }).
//    AppNavigator reacts to the new user state and shows Onboarding.
//
// 2. POST GOOGLE SIGNIN (in AppNavigator, when needsUserType=true):
//    route.params.context === 'postSignup', pendingUser is NOT set.
//    The user signed in with Google (account already exists) but hasn't
//    picked a user type yet.
//    Tapping a card calls setUserType(userType).
//    AppNavigator then shows Onboarding.

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, scale, mScale } from '../assets/theme';

const USER_TYPES = [
  {
    id:              'hospital',
    icon:            'hospital-building',
    iconColor:       '#3B82F6',
    iconBg:          '#EFF6FF',
    title:           'Hospital / Institution',
    description:
      'I work at a hospital or medical institution. My administrator has set up access for our staff.',
    badgeText:      'Hospital Email Required',
    badgeColor:     '#DBEAFE',
    badgeTextColor: '#2563EB',
  },
  {
    id:              'solo',
    icon:            'account-circle-outline',
    iconColor:       '#22C55E',
    iconBg:          '#F0FDF4',
    title:           'Individual / Solo User',
    description:
      'I\'m an independent lab technician or researcher using AidePoint on my own.',
    badgeText:      'Any Email Address',
    badgeColor:     '#DCFCE7',
    badgeTextColor: '#16A34A',
  },
];

const UserTypeScreen = () => {
  const [isLoading, setIsLoading] = useState(false);

  const { register, setUserType, authError } = useAuth();
  const navigation = useNavigation();
  const route      = useRoute();

  // pendingUser is set when coming from SignUp screen.
  // It holds { name, email, password } collected there.
  const pendingUser = route.params?.pendingUser ?? null;

  // context === 'postSignup' when AppNavigator sends a Google user here.
  const isPostSignup = route.params?.context === 'postSignup';

  async function handleSelect(type) {
    setIsLoading(true);
    try {
      if (pendingUser) {
        // ── Path 1: Normal email signup ──────────────────────────────────
        // We have the user's form data from SignUp. Call register() now.
        const result = await register({ ...pendingUser, userType: type.id });
        if (!result.success) {
          Alert.alert('Registration Failed', result.error ?? 'Please try again.');
        }
        // On success: onAuthStateChange fires in AuthContext → user is set →
        // AppNavigator sees needsOnboarding=true → shows OnboardingScreen.
        // No navigation.navigate() needed here.

      } else if (isPostSignup) {
        // ── Path 2: Google signin — set type on existing account ──────────
        const result = await setUserType(type.id);
        if (!result.success) {
          Alert.alert('Error', result.error ?? 'Could not save user type. Please try again.');
        }
        // On success: setUserType() sets needsOnboarding=true →
        // AppNavigator switches to OnboardingScreen automatically.

      } else {
        // ── Fallback: shouldn't happen but just in case ───────────────────
        navigation.navigate('SignUp', { userType: type.id });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <MaterialCommunityIcons name="microscope" size={scale(28)} color={COLORS.primary} />
            <Text style={styles.logoText}>AidePoint</Text>
          </View>
          <Text style={styles.title}>How will you use AidePoint?</Text>
          <Text style={styles.subtitle}>
            Choose the option that matches your situation.
            This sets up your account correctly.
          </Text>
        </View>

        {/* Type cards */}
        {USER_TYPES.map(type => (
          <TouchableOpacity
            key={type.id}
            style={styles.card}
            onPress={() => handleSelect(type)}
            activeOpacity={0.75}
            disabled={isLoading}
          >
            <View style={[styles.cardIconBg, { backgroundColor: type.iconBg }]}>
              <MaterialCommunityIcons
                name={type.icon} size={scale(38)} color={type.iconColor}
              />
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{type.title}</Text>
              <Text style={styles.cardDescription}>{type.description}</Text>
              <View style={[styles.badge, { backgroundColor: type.badgeColor }]}>
                <Text style={[styles.badgeText, { color: type.badgeTextColor }]}>
                  {type.badgeText}
                </Text>
              </View>
            </View>

            {isLoading
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Feather name="chevron-right" size={scale(20)} color={COLORS.border} />
            }
          </TouchableOpacity>
        ))}

        {/* Only show "Sign In" link when coming from AuthNavigator (not post-signup) */}
        {!isPostSignup && (
          <TouchableOpacity
            style={styles.signInLink}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.signInText}>
              Already have an account?{' '}
              <Text style={styles.signInHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  scrollContent: {
    paddingHorizontal: SPACING.pagePad,
    paddingBottom: layout.bottomInset + SPACING['3xl'],
  },
  header:    { paddingTop: scale(36), paddingBottom: SPACING['2xl'] },
  logoRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING['2xl'] },
  logoText:  { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary },
  title:     { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, lineHeight: mScale(32) },
  subtitle:  { fontSize: FONTS.md, color: COLORS.textSecondary, lineHeight: mScale(22) },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: scale(1.5), borderColor: COLORS.border,
    gap: SPACING.lg, ...SHADOWS.sm,
  },
  cardIconBg: {
    width: scale(64), height: scale(64), borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardBody:        { flex: 1 },
  cardTitle:       { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  cardDescription: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: mScale(19), marginBottom: SPACING.sm },
  badge: {
    alignSelf: 'flex-start', paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3), borderRadius: RADIUS.full,
  },
  badgeText:    { fontSize: FONTS.xs, fontWeight: FONTS.semibold },
  signInLink:   { marginTop: SPACING['2xl'], alignItems: 'center' },
  signInText:   { fontSize: FONTS.md, color: COLORS.textSecondary },
  signInHighlight: { color: COLORS.primary, fontWeight: FONTS.semibold },
});

export default UserTypeScreen;