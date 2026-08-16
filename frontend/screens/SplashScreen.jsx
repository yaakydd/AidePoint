import React from "react";
import { View, Text, ActivityIndicator, StatusBar, Image } from "react-native";

import { COLORS } from "../assets/theme";
import styles from "../styles/SplashScreen";

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.logoWrap}>
        <Image
          source={require("../assets/brand/icon-white.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      <Image
        source={require("../assets/brand/wordmark-white.png")}
        style={styles.wordmark}
        resizeMode="contain"
      />

      <Text style={styles.subtitle}>AI-Powered Blood Diagnostics</Text>

      <ActivityIndicator size="large" color={COLORS.white} style={styles.loader} />
    </View>
  );
};

export default SplashScreen;