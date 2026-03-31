import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";

import SplashScreen from "../screens/SplashScreen";
import AuthNavigator from "./AuthNavigator";
import MainTabNavigator from "./MainAppNavigator";
import { AuthContext } from "../context/AuthContext";

export default function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  // Show splash while checking storage
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {user ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}