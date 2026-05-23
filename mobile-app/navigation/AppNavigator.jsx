// navigation/AppNavigator.js
//
// The root navigator. Decides which screen to show based on auth state.
//
// DECISION TREE (in order):
//   isLoading = true           → SplashScreen (checking saved session)
//   user = null                → AuthNavigator (SignIn / SignUp / UserType)
//   user + needsUserType=true  → UserTypeScreen (Google new users only)
//   user + needsOnboarding=true→ OnboardingScreen (5-slide feature tour)
//   user + needsConsent=true   → ConsentScreen (image storage preference)
//   user (all flags false)     → MainAppNavigator (bottom tabs)

import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, layout } from '../assets/theme';

// ── Navigators ────────────────────────────────────────────────────────────────
import AuthNavigator from './AuthNavigator';

// ── Post-signup flow screens (shown while user IS logged in) ─────────────────
import UserTypeScreen   from '../auth/UserTypeScreen';
import OnboardingScreen from '../auth/Onboarding';
import ConsentScreen    from '../screens/ConsentScreen';

// ── Main app screens ──────────────────────────────────────────────────────────
import HomeScreen    from '../screens/HomeScreen';
import ScanScreen    from '../screens/Scan';
import ReportsScreen from '../screens/ReportScreen';
import Chatbot       from '../screens/Chatbot';
import ProfileScreen from '../screens/ProfileScreen';

const AppStack  = createNativeStackNavigator();
const Tab       = createBottomTabNavigator();
const ScanStack = createNativeStackNavigator();


// ─── LOADING SPLASH ───────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}


// ─── SCAN STACK ───────────────────────────────────────────────────────────────
function ScanStackNavigator() {
  return (
    <ScanStack.Navigator screenOptions={{ headerShown: false }}>
      <ScanStack.Screen name="ScanHome" component={ScanScreen} />
      {/* CameraView pushed here when user taps "Take Photo" */}
    </ScanStack.Navigator>
  );
}


// ─── MAIN APP (BOTTOM TABS) ───────────────────────────────────────────────────
function MainAppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor:  COLORS.border,
          height:      Platform.OS === 'ios' ? 83 : 60,
          paddingBottom: Platform.OS === 'ios' ? layout.bottomInset : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize:   FONTS.xs,
          fontWeight: FONTS.medium,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home:    focused ? 'home'          : 'home-outline',
            Scan:    focused ? 'scan-circle'   : 'scan-circle-outline',
            Reports: focused ? 'document-text' : 'document-text-outline',
            Chatbot: focused ? 'chatbubbles'   : 'chatbubbles-outline',
            Profile: focused ? 'person-circle' : 'person-circle-outline',
          };
          return (
            <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="Scan"    component={ScanStackNavigator} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Chatbot" component={Chatbot} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}


// ─── ROOT NAVIGATOR ───────────────────────────────────────────────────────────
export default function AppNavigator() {
  const {
    user,
    isLoading,
    needsUserType,
    needsOnboarding,
    needsConsent,
  } = useAuth();

  // Case 1: Still checking saved session — show spinner outside NavigationContainer
  // so there's no navigation flash.
  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer>
      <AppStack.Navigator screenOptions={{ headerShown: false }}>

        {!user ? (
          // Case 2: Not logged in → Auth flow (SignIn / SignUp / UserType)
          <AppStack.Screen name="Auth" component={AuthNavigator} />

        ) : needsUserType ? (
          // Case 3: Logged in via Google but hasn't picked user type yet.
          // Pass context="postSignup" so UserTypeScreen knows to call setUserType()
          // instead of navigating to SignUp.
          <AppStack.Screen
            name="UserTypePost"
            component={UserTypeScreen}
            initialParams={{ context: 'postSignup' }}
          />

        ) : needsOnboarding ? (
          // Case 4: Just registered — show the 5-slide feature tour.
          // OnboardingScreen calls completeOnboardingSlides() on "Get Started".
          <AppStack.Screen name="Onboarding" component={OnboardingScreen} />

        ) : needsConsent ? (
          // Case 5: Finished onboarding — collect image storage preference.
          // ConsentScreen calls completeOnboarding(storeImages).
          <AppStack.Screen name="Consent" component={ConsentScreen} />

        ) : (
          // Case 6: Fully authenticated — show the main app.
          <AppStack.Screen name="Main" component={MainAppNavigator} />
        )}

      </AppStack.Navigator>
    </NavigationContainer>
  );
}


const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});