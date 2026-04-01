// MainAppNavigator.js
import React, { useRef } from "react";
import { View, Animated, Dimensions } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import Scan from "../screens/Scan";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");

const MainAppNavigator = () => {
  const translateX = useRef(new Animated.Value(0)).current;

  const tabWidths = width / 2; // 2 tabs: Home + Scan

  const handleTabPress = (index) => {
    Animated.spring(translateX, {
      toValue: tabWidths * index,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size, focused }) => {
            let iconName;
            if (route.name === "Home") iconName = "home-outline";
            else if (route.name === "Scan") iconName = "scan-outline";

            return <Ionicons name={iconName} size={size} color={focused ? "#6200EE" : "#888"} />;
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          listeners={{
            tabPress: () => handleTabPress(0),
          }}
        />

        <Tab.Screen
          name="Scan"
          component={Scan}
          listeners={{
            tabPress: () => handleTabPress(1),
          }}
        />
      </Tab.Navigator>

      {/* Animated underline */}
      <View
        style={{
          position: "absolute",
          bottom: 65,
          flexDirection: "row",
          width,
        }}
      >
        <Animated.View
          style={{
            width: tabWidths,
            height: 3,
            backgroundColor: "#6200EE",
            transform: [{ translateX }],
          }}
        />
      </View>
    </>
  );
};

export default MainAppNavigator;