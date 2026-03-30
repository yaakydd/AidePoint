import React, { useEffect, useContext, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons"; // Expo Vector Icons
import styles from "../styles/SplashScreen";
import { AuthContext } from "../context/AuthContext"; // Make sure you have this context

const SplashScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      if (user) {
        navigation.replace("Dashboard"); // User is logged in → go to main app
      } else {
        navigation.replace("Auth"); // User not logged in → go to auth flow
      }
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timer);
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Vector Icon instead of emoji */}
        <MaterialCommunityIcons name="dna" size={80} color="#0bc9da" />

        {/* App Name */}
        <Text style={styles.title}>AidePoint</Text>

        {/* Tagline */}
        <Text style={styles.subtitle}>AI-Powered Blood Diagnostics</Text>

        {/* Loader */}
        <ActivityIndicator size="large" color="#0bc9da" style={{ marginTop: 30 }} />
      </View>
    );
  }

  return null; // Nothing to render once loading is done; navigation.replace handles the screen switch
};

export default SplashScreen;