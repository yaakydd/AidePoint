import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import MainAppNavigator from './MainAppNavigator';
import ConsentScreen from '../screens/ConsentScreen';
import SplashScreen from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {

  const { authState } = useAuth();

  if (authState === 'BOOTING') {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {authState === 'AUTH' && (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}

        {authState === 'CONSENT' && (
          <Stack.Screen name="Consent" component={ConsentScreen} />
        )}

        {authState === 'APP' && (
          <Stack.Screen name="Main" component={MainAppNavigator} />
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}