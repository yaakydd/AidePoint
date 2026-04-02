// navigation/AppNavigator.js
import React, { useContext, useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthContext } from "../context/AuthContext";
import SplashScreen from "../screens/SplashScreen";
import SignIn from "../screens/SignIn";
import SignUp from "../screens/SignUp";
import MainAppNavigator from "./MainAppNavigator";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, isLoading, isFirstLaunch } = useContext(AuthContext);
  const [showSplash, setShowSplash] = useState(true);

  // Wait for isLoading to finish and then hide splash after 2.5s
  useEffect(() => {
    if (!isLoading && isFirstLaunch !== null) {
      const timer = setTimeout(() => setShowSplash(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isFirstLaunch]);

  // Show splash while loading or timer running
  if (isLoading || showSplash || isFirstLaunch === null) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Logged-in user => MainApp
          <Stack.Screen name="MainApp" component={MainAppNavigator} />
        ) : isFirstLaunch ? (
          // First-time user => SignUp
          <Stack.Screen name="SignUp" component={SignUp} />
        ) : (
          // Returning user => SignIn
          <Stack.Screen name="SignIn" component={SignIn} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;