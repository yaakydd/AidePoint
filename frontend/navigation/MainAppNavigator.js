import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import Scan from "../screens/Scan";
import ReportScreen from "../screens/ReportScreen";
import Chatbot from "../screens/Chatbot";
import Badges from "../screens/Badges";
import { MaterialIcons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

// Custom tab button with top indicator
const TabBarButton = ({ children, onPress, accessibilityState }) => {
  const focused = accessibilityState.selected;
  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Top indicator */}
      <View
        style={[
          styles.indicator,
          { backgroundColor: focused ? "#0bc9da" : "transparent" },
        ]}
      />
      {children}
    </TouchableOpacity>
  );
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "bold" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarActiveTintColor: "#0bc9da",
          tabBarInactiveTintColor: "#9ca3af",
        }}
      />
      <Tab.Screen
        name="Scan"
        component={Scan}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="qr-code-scanner" size={size} color={color} />
          ),
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarActiveTintColor: "#0bc9da",
          tabBarInactiveTintColor: "#9ca3af",
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="description" size={size} color={color} />
          ),
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarActiveTintColor: "#0bc9da",
          tabBarInactiveTintColor: "#9ca3af",
        }}
      />
      <Tab.Screen
        name="Chatbot"
        component={Chatbot}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat-bubble" size={size} color={color} />
          ),
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarActiveTintColor: "#0bc9da",
          tabBarInactiveTintColor: "#9ca3af",
        }}
      />
      <Tab.Screen
        name="Badges"
        component={Badges}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarActiveTintColor: "#0bc9da",
          tabBarInactiveTintColor: "#9ca3af",
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    paddingBottom: 10,
    paddingTop: 5,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    marginBottom: 4,
  },
});