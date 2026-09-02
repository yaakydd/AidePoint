import React from "react";
import { View, Text, ActivityIndicator, StatusBar, Image } from "react-native";

import { COLORS } from "../assets/theme";
import styles from "../styles/SplashScreen";

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <Image
        source={require("../assets/brand/wordmark-white.png")}
        style={styles.wordmark}
        resizeMode="contain"
      />
      <Text style={styles.subtitle}>AI-Powered Anemia Screening</Text>
    </View>
  );
};

export default SplashScreen;