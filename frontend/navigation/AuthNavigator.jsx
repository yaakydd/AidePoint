import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OnboardingScreen from '../auth/Onboarding';
import SignIn           from '../auth/SignIn';
import SignUp           from '../auth/SignUp';
import VerifyEmail      from '../auth/VerifyEmail';
import ForgotPassword   from '../auth/ForgotPassword';

const Stack = createNativeStackNavigator();
const LAUNCHED_KEY = 'aidepoint_has_launched';

export default function AuthNavigator() {
  // null = still checking, true = show onboarding, false = skip to SignIn
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    async function check() {
      try {
        const val = await AsyncStorage.getItem(LAUNCHED_KEY);
        if (val === null) {
          // First ever launch, show onboarding then mark as seen
          await AsyncStorage.setItem(LAUNCHED_KEY, 'true');
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch {
        setIsFirstLaunch(false); // fail safe: skip onboarding
      }
    }
    check();
  }, []);

  // Don't render the navigator until we know which screen to start on.
  // This avoids a flash of the wrong screen.
  if (isFirstLaunch === null) return null;

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      initialRouteName={isFirstLaunch ? 'Onboarding' : 'SignIn'}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="SignIn" component={SignIn} />
      <Stack.Screen name="SignUp" component={SignUp} />

      {/*
        VerifyEmail sits inside the Auth stack so it's reachable right after
        SignUp, before the user has a session. Once verifyOtp() succeeds,
        onAuthStateChange then authState moves to CONSENT or APP after
        RootRouter in App.js swaps the entire navigator automatically.
      */}
      <Stack.Screen name="VerifyEmail" component={VerifyEmail} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
    </Stack.Navigator>
  );
}
