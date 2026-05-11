import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";
import Onboarding from "../auth/Onboarding";
import UserTypeScreen   from "../auth/UserTypeScreen";
import SignIn from "../auth/SignIn";
import SignUp from "../auth/SignUp";

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
      <Stack.Screen name="Onboarding" component={Onboarding} />
      <Stack.Screen name="UserType" component={UserTypeScreen} />
      <Stack.Screen name="SignIn" component={SignIn} />
      <Stack.Screen name="SignUp" component={SignUp} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;