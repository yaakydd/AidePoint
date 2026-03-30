import React, { useEffect } from "react";
import styles from "../styles/SplashScreen";
import { View, Text, ActivityIndicator } from "react-native";

const SplashScreen = ({ navigation }) => {
  
  useEffect(() => {
    setTimeout(() => {
      navigation.replace("SignUp");
    }, 2500); // 2.5 seconds
  }, []);

  return (
    <View style={styles.container}>
      
      {/* Logo / App Name */}
      <Text style={styles.logo}>🧬</Text>
      <Text style={styles.title}>AidePoint</Text>

      {/* Tagline */}
      <Text style={styles.subtitle}>
        AI-Powered Blood Diagnostics
      </Text>

      {/* Loader */}
      <ActivityIndicator size="large" color="#0bc9da" style={{ marginTop: 30 }} />

    </View>
  );
};

export default SplashScreen;