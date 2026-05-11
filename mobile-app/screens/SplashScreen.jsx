// screens/SplashScreen.js
// This screen shows while the app boots and reads AsyncStorage.
// It's not a "route" the user navigates to — it's a temporary render
// inside AppNavigator: if (isLoading) return <SplashScreen />
// Once isLoading becomes false, React re-renders AppNavigator
// and this disappears, replaced by either Auth or MainApp.

import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import styles from "../styles/SplashScreen";

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      {/* dna icon — represents the medical/biology theme */}
      <MaterialCommunityIcons name="dna" size={80} color="#0bc9da" />
      <Text style={styles.title}>AidePoint</Text>
      <Text style={styles.subtitle}>AI-Powered Blood Diagnostics</Text>
      {/*
        ActivityIndicator is React Native's built-in spinner.
        size="large" = bigger circle.
        color = the spinner ring colour.
        No animation logic needed — it spins automatically.
      */}
      <ActivityIndicator size="large" color="#0bc9da" style={{ marginTop: 30 }} />
    </View>
  );
};

export default SplashScreen;
