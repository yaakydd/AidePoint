// navigation/AppNavigator.js

import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';

import { COLORS } from '../assets/theme';

import AuthNavigator from './AuthNavigator';
import MainAppNavigator from './MainAppNavigator';

import ConsentScreen from '../screens/ConsentScreen';

const Stack = createNativeStackNavigator();



// Splash screen shown while restoring auth session

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator
        size="large"
        color={COLORS.primary}
      />
    </View>
  );
}



// ROOT NAVIGATOR
// Decides which navigator to show based on auth state:
//   - If no user → AuthNavigator (onboarding + sign in/up)
//   - If user but needsConsent → ConsentScreen
//   - If user and consented → MainAppNavigator (the whole app)
export default function AppNavigator() {

  const {
    user,
    isLoading,
    needsConsent,
  } = useAuth();

  // Still restoring auth session
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >

        {!user ? (

          // Not logged in
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
          />

        ) : needsConsent ? (

          // New signup → consent screen
          <Stack.Screen
            name="Consent"
            component={ConsentScreen}
          />

        ) : (

          // Fully authenticated
          <Stack.Screen
            name="Main"
            component={MainAppNavigator}
          />

        )}

      </Stack.Navigator>

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