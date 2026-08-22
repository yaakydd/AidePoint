import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OnboardingScreen from '../auth/Onboarding';
import SignIn           from '../auth/SignIn';
import SignUp           from '../auth/SignUp';
import VerifyEmail      from '../auth/VerifyEmail';
import ForgotPassword   from '../auth/ForgotPassword';
import SplashScreen from "../screens/SplashScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicy";
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();
const LAUNCHED_KEY = 'aidepoint_has_launched';

export default function AuthNavigator() {
  const { consumePendingAuthScreen } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    async function check() {
      try {
        const val = await AsyncStorage.getItem(LAUNCHED_KEY);
        if (val === null) {
          await AsyncStorage.setItem(LAUNCHED_KEY, 'true');
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch {
        setIsFirstLaunch(false);
      }
    }
    check();
  }, []);

  if (isFirstLaunch === null) {
    return <SplashScreen />;
  }

  // Consumed once, here, at the same point initialRouteName is computed
  // -- not in an effect -- so it's read exactly when this navigator
  // mounts into an 'AUTH' authState, and reset immediately so a later
  // unrelated remount (e.g. plain sign-out afterward) doesn't reuse a
  // stale value.
  const pendingScreen = consumePendingAuthScreen();
  const initialRoute = pendingScreen || (isFirstLaunch ? 'Onboarding' : 'SignIn');

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="SignIn" component={SignIn} />
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmail} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}