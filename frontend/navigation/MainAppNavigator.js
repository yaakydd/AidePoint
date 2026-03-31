import React from "react";
import { View, TouchableOpacity, Text, Animated, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
//import Scan from "../screens/Scan";
import ReportScreen from "../screens/ReportScreen";
import Chatbot from "../screens/Chatbot";
import Badges from "../screens/Badges";
import { MaterialIcons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

const TAB_HEIGHT = 60;

const AnimatedTabButton = ({ children, onPress, accessibilityState }) => {
  const focused = accessibilityState.selected;

  const animation = React.useRef(new Animated.Value(focused ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animation, {
      toValue: focused ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const indicatorHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3], // height of the top highlight bar
  });

  const indicatorColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", "#0bc9da"],
  });

  return (
    <TouchableOpacity
      style={styles.tabButton}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Animated.View
        style={[styles.indicator, { height: indicatorHeight, backgroundColor: indicatorColor }]}
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
        tabBarLabelStyle: { fontSize: 12, fontWeight: "bold" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
          tabBarButton: (props) => <AnimatedTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Scan"
        component={Scan}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="qr-code-scanner" size={size} color={color} />,
          tabBarButton: (props) => <AnimatedTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="description" size={size} color={color} />,
          tabBarButton: (props) => <AnimatedTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Chatbot"
        component={Chatbot}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="chat-bubble" size={size} color={color} />,
          tabBarButton: (props) => <AnimatedTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Badges"
        component={Badges}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
          tabBarButton: (props) => <AnimatedTabButton {...props} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: TAB_HEIGHT,
    paddingBottom: 5,
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
    width: 24,
    borderRadius: 2,
    marginBottom: 4,
  },
});