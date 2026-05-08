// screens/SplashScreen.js
import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import styles from "../styles/SplashScreen";

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="dna" size={80} color="#0bc9da" />
      <Text style={styles.title}>AidePoint</Text>
      <Text style={styles.subtitle}>AI-Powered Blood Diagnostics</Text>
      <ActivityIndicator size="large" color="#0bc9da" style={{ marginTop: 30 }} />
    </View>
  );
};

export default SplashScreen;