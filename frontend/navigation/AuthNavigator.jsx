import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import OnboardingScreen from "../auth/Onboarding";
import SignIn from "../auth/SignIn";
import SignUp from "../auth/SignUp";
import VerifyEmail from "../auth/VerifyEmail";   
import ForgotPassword from "../auth/ForgotPassword";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="SignIn"     component={SignIn} />
      <Stack.Screen name="SignUp"     component={SignUp} />

      {/*
        VerifyEmail sits inside the Auth stack so it's reachable right after
        SignUp, before the user has a session. Once verifyOtp() succeeds,
        onAuthStateChange fires → authState moves to CONSENT or APP →
        RootRouter in App.js swaps the entire navigator automatically.
      */}
      <Stack.Screen name="VerifyEmail" component={VerifyEmail} />
      <Stack.Screen name="ForgotPassword"  component={ForgotPassword} />
    </Stack.Navigator>
  );
}