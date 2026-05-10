import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";
import OnboardingScreen from "../screens/auth/OnboardingScreen";
import UserTypeScreen   from "../screens/auth/UserTypeScreen";
import SignIn           from "../screens/auth/SignIn";
import SignUp           from "../screens/auth/SignUp";

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const { isFirstLaunch } = useContext(AuthContext);

  // initialRouteName tells the stack which screen to open first.
  // If it's a new install goes to Onboarding screen.
  // If user has been here before but logged out goes to SignIn directly.

  return (
    <Stack.Navigator
      initialRouteName={isFirstLaunch ? "Onboarding" : "SignIn"}
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="UserType" component={UserTypeScreen} />
      <Stack.Screen name="SignIn" component={SignIn} />
      <Stack.Screen name="SignUp" component={SignUp} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;