// navigation/AuthNavigator.js

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';

import OnboardingScreen from '../auth/OnboardingScreen';
import SignIn from '../auth/SignIn';
import SignUp from '../auth/SignUp';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const { isFirstLaunch } = useAuth();

  return (
    <Stack.Navigator
      initialRouteName={
        isFirstLaunch
          ? 'Onboarding'
          : 'SignIn'
      }
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
      />

      <Stack.Screen
        name="SignIn"
        component={SignIn}
      />

      <Stack.Screen
        name="SignUp"
        component={SignUp}
      />
    </Stack.Navigator>
  );
}