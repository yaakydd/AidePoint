// screens/SplashScreen.js

import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StatusBar,
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import styles from "../styles/SplashScreen";

const SplashScreen = () => {
  return (
    <View style={styles.container}>

      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F172A"
      />

      <MaterialCommunityIcons
        name="dna"
        size={90}
        color="#0bc9da"
      />

      <Text style={styles.title}>
        AidePoint
      </Text>

      <Text style={styles.subtitle}>
        AI-Powered Blood Diagnostics
      </Text>

      <ActivityIndicator
        size="large"
        color="#0bc9da"
        style={{ marginTop: 35 }}
      />

    </View>
  );
};

export default SplashScreen;