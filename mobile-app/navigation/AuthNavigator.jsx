// navigation/AuthNavigator.js
//
// Shown when user = null (not logged in).
//
// FIRST LAUNCH (isFirstLaunch = true):
//   Onboarding (5 slides) → SignUp → [ConsentScreen handled by AppNavigator]
//
// RETURNING USER (isFirstLaunch = false):
//   SignIn → MainApp
//
// NEW USER (not first launch, no account):
//   SignIn → "Create account" link → SignUp → [ConsentScreen handled by AppNavigator]
//
// NOTE: UserTypeScreen has been REMOVED. All users are solo lab technicians.
//       register() is called directly from SignUp — no intermediate step.
//       Google auth has been REMOVED. Email + password only.
//
// PATH NOTES:
//   This file:    navigation/AuthNavigator.js
//   Auth screens: screens/auth/
//   Relative:     ../screens/auth/

import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthContext } from '../context/AuthContext';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import SignIn           from '../screens/auth/SignIn';
import SignUp           from '../screens/auth/SignUp';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const { isFirstLaunch } = useContext(AuthContext);

  // isFirstLaunch is always true or false by the time this renders.
  // AppNavigator holds at SplashScreen while isLoading = true,
  // and isLoading only becomes false AFTER AsyncStorage has been read.
  // So isFirstLaunch is never null/undefined here.

  return (
    <Stack.Navigator
      // First-ever launch → show Onboarding slides before SignUp.
      // All other cases → go straight to SignIn.
      initialRouteName={isFirstLaunch ? 'Onboarding' : 'SignIn'}
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      {/* Shown once ever on the very first app launch.
          OnboardingScreen calls navigation.navigate('SignUp')
          on the "Get Started" button. */}
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />

      {/* Default entry point for all returning users. */}
      <Stack.Screen name="SignIn" component={SignIn} />

      {/* Reached via:
            - "Create account" link on SignIn (new user, not first launch)
            - Automatically after Onboarding (first launch)
          SignUp collects name + email + password, then calls register() directly.
          On success AppNavigator detects needsConsent=true and shows ConsentScreen. */}
      <Stack.Screen name="SignUp" component={SignUp} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
