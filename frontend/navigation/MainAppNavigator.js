// MainAppNavigator.js
import React, { useRef } from "react";
import { View, Animated, Dimensions } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
//import ProfileScreen from "../screens/ProfileScreen";
//import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");

const MainAppNavigator = () => {
  const translateX = useRef(new Animated.Value(0)).current;

  const tabWidths = width / 3; // 3 tabs

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
            //else if (route.name === "Profile") iconName = "person-outline";
            //else if (route.name === "Settings") iconName = "settings-outline";

            // color changes safely
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
        {/*
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          listeners={{
            tabPress: () => handleTabPress(1),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          listeners={{
            tabPress: () => handleTabPress(2),
          }}
        />
        */}
      </Tab.Navigator>
      
      
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