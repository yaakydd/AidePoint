import React, { useRef } from "react";
import {
  View,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../assets/theme";
import HomeScreen from "../screens/HomeScreen";
import ScanScreenNavigator from "./ScanScreenNavigator"; // Scan has its OWN stack navigator
import ReportScreen from "../screens/ReportScreen";
import Chatbot from "../screens/Chatbot";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

// We get the physical screen width once here at module level.
const { width } = Dimensions.get("window");

// Since there are 5 tabs, each tab occupies exactly 1/5 of the bar.
const TAB_WIDTH = width / 5;

// Base height for the visual content of the tab bar (icons + padding),
// the same on every device. The system's bottom safe-area inset
// (insets.bottom) is added on top of this at render time, since that
// value varies per device: ~0 on old-style nav, ~16-24dp on gesture
// nav, ~48dp on 3-button nav, and can only be read via
// useSafeAreaInsets() inside the SafeAreaProvider tree (App.js).
const BASE_TAB_BAR_HEIGHT = 56;

function MainAppNavigator() {
  const insets = useSafeAreaInsets();

  // Total tab bar height = fixed icon area + whatever the system
  // reserves for its own nav bar/home indicator on this device.
  const TAB_BAR_HEIGHT = BASE_TAB_BAR_HEIGHT + insets.bottom;

  const translateX = useRef(new Animated.Value(0)).current;

  const animateTab = (index) => {
    Animated.spring(translateX, {
      toValue: TAB_WIDTH * index,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: "absolute",
            height: TAB_BAR_HEIGHT,
            paddingTop: 10,
            // insets.bottom lifts the icon row above the system nav bar
            // on Android (3-button or gesture) and above the home
            // indicator on iOS. The extra 10 is breathing room above that.
            paddingBottom: insets.bottom + 10,
            backgroundColor: COLORS.surface,
            borderTopWidth: 0.5,
            borderTopColor: COLORS.border,
            elevation: 10,          // Android shadow
            shadowColor: "#000",    // iOS shadow
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          },
          tabBarIcon: ({ focused }) => {
            let iconName;

            switch (route.name) {
              case "Home": iconName = focused ? "home" : "home-outline"; break;
              case "Scan": iconName = focused ? "scan" : "scan-outline"; break;
              case "Report":  iconName = focused ? "document-text" : "document-text-outline"; break;
              case "Chatbot": iconName = focused ? "chatbubble-ellipses"   : "chatbubble-ellipses-outline"; break;
              case "Profile": iconName = focused ? "person" : "person-outline"; break;
              default: iconName = "ellipse";
            }

            return (
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? COLORS.primaryDark : COLORS.textMuted}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} listeners={{ focus: () => animateTab(0) }} />
        <Tab.Screen name="Scan" component={ScanScreenNavigator} listeners={{ focus: () => animateTab(1) }} />
        <Tab.Screen name="Report" component={ReportScreen} listeners={{ focus: () => animateTab(2) }} />
        <Tab.Screen name="Chatbot" component={Chatbot} listeners={{ focus: () => animateTab(3) }} />
        <Tab.Screen name="Profile" component={ProfileScreen} listeners={{ focus: () => animateTab(4) }} />
      </Tab.Navigator>

      {/* Animated underline indicator, floats above the tab bar's top edge */}
      <View
        pointerEvents="none"
        style={[styles.indicatorContainer, { bottom: TAB_BAR_HEIGHT - 3 }]}
      >
        <Animated.View
          style={[
            styles.indicator,
            {
              width: TAB_WIDTH,
              transform: [{ translateX }],
            },
          ]}
        />
      </View>
    </View>
  );
}

export default MainAppNavigator;

// Exported so screens (HomeScreen, ReportScreen, etc.) can compute the
// same bottom padding to avoid content being hidden under the
// absolutely-positioned tab bar. Usage in a screen:
//
//   import { useSafeAreaInsets } from "react-native-safe-area-context";
//   import { getTabBarHeight } from "../navigation/MainAppNavigator";
//   const insets = useSafeAreaInsets();
//   const tabBarHeight = getTabBarHeight(insets);
//   ...
//   <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight }}>
export function getTabBarHeight(insets) {
  return BASE_TAB_BAR_HEIGHT + insets.bottom;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  indicatorContainer: {
    position: "absolute",
    left: 0,
    width: width,
  },
  indicator: {
    height: 3,
    borderRadius: 999,
    backgroundColor: COLORS.primaryDark,
  },
});
