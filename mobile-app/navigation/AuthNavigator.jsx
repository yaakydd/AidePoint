// navigation/AuthNavigator.js
//
// This navigator is shown when user = null (not logged in).
// It manages the 4 auth screens: Onboarding → UserType → SignUp / SignIn.
//
// IMPORTANT PATH NOTES:
// This file lives at  navigation/AuthNavigator.js
// Auth screens live at screens/auth/OnboardingScreen.js  etc.
// So the relative path goes UP one level (../) then into screens/auth/

import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";

// The original code had:
//   import Onboarding from "../auth/Onboarding";          ← wrong folder + wrong filename
// Correct paths (adjust these if your folder structure differs):
import OnboardingScreen from "../auth/Onboarding";
import UserTypeScreen from "../auth/UserTypeScreen";
import SignIn from "../auth/SignIn";
import SignUp from "../auth/SignUp";


const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const { isFirstLaunch } = useContext(AuthContext);

  // isFirstLaunch is always true or false by the time this renders
  // because AppNavigator shows the SplashScreen while isLoading = true,
  // and isLoading only becomes false AFTER AsyncStorage has been read.
  // So isFirstLaunch is never null here, is fixed by the startup flow.

  return (
    <Stack.Navigator
      initialRouteName={isFirstLaunch ? "SignUp" : "SignIn"}
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