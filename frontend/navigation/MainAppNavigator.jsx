import React, { useRef } from "react";
import {
  View,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import ScanScreenNavigator from "./ScanScreenNavigator"; // Scan has its OWN stack navigator
import ReportScreen from "../screens/ReportScreen";
import Chatbot from "../screens/Chatbot";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

// We get the physical screen width once here at module level.
// Dimensions.get("window") returns the usable area
// (excludes system bars on some Android devices).
const { width } = Dimensions.get("window");

// Since there are 5 tabs, each tab occupies exactly 1/5 of the bar.
// This number tells us how far to move the underline indicator per tab.
const TAB_WIDTH = width / 5;

// We define a fixed height instead of using useBottomTabBarHeight().
//
// Why NOT use useBottomTabBarHeight()?
// That hook only works when the component calling it is INSIDE
// a Bottom Tab Screen. MainAppNavigator IS the tab navigator itself,
// so the hook would crash — it has no parent tab navigator to query.
//
// Why different heights per platform?
// iOS has a "safe area" at the bottom (the home indicator gesture bar).
// We add extra padding (20px) so the tabs don't overlap it.
// Android has no safe area at the bottom, so 70px is enough.
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 85 : 70;

function MainAppNavigator() {

  // useRef creates a "box" that holds a value across re-renders
  // WITHOUT causing a re-render when the value changes.
  // This is important for animations — we don't want the component
  // to re-render every time the indicator moves.
  //
  // Animated.Value(0) starts the indicator at position 0 (far left = Home tab).
  // The value represents PIXELS from the left edge.
  const translateX = useRef(new Animated.Value(0)).current;

  // This function moves the underline to sit under whichever tab was pressed.
  // index 0 = Home, 1 = Scan, 2 = Report, 3 = Chatbot, 4 = Profile
  // TAB_WIDTH * index gives the pixel offset from the left.
  const animateTab = (index) => {
    Animated.spring(translateX, {
      toValue: TAB_WIDTH * index,

      // useNativeDriver: true means the animation runs on the
      // native thread (GPU), NOT the JavaScript thread.
      // This makes it smooth and non-blocking — other JS code
      // can run without the animation dropping frames.
      // IMPORTANT: useNativeDriver only works with transform and opacity.
      // You cannot use it with width, height, color, etc.
      useNativeDriver: true,

      // Spring physics controls:
      // tension = how strong the spring pulls (higher = snappier)
      // friction = how much damping there is (higher = less bouncy)
      tension: 120,
      friction: 14,
    }).start();
  };

  return (
    // The outer View wraps EVERYTHING: the tab navigator AND the
    // animated indicator. This is necessary because the indicator
    // is positioned absolutely OVER the tab bar — it's not inside
    // the Tab.Navigator, which would make it hard to position precisely.
    <View style={styles.container}>

      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          // screenOptions is a function that React Navigation calls
          // once per screen. `route` tells you which screen is being configured.
          // You use this to assign different icons to each tab.

          headerShown: false,       // We use our own headers inside each screen
          tabBarShowLabel: false,   // No text labels — icons only
          tabBarStyle: styles.tabBar,
          tabBarHideOnKeyboard: true,

          // tabBarIcon is called whenever this tab renders.
          // `focused` = true if this is the currently active tab.
          // We swap between filled and outline icons based on focus.
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
                color={focused ? "#6200EE" : "#9CA3AF"}
                // focused tab = purple, inactive = grey
              />
            );
          },
        })}
      >
        {/*
          Each Tab.Screen needs:
            name   = the route name used in navigation.navigate("Home")
            component = the screen to render when this tab is active
            listeners = event handlers. tabPress fires when the user taps the tab.

          We call animateTab(index) in the listener so the underline
          moves when the user taps. The index matches the tab position: 0-4.
        */}
        <Tab.Screen name="Home" component={HomeScreen} listeners={{ tabPress: () => animateTab(0),   // focus fires when this screen becomes active by ANY means
  // (tab press, programmatic navigation, deep link, etc.)
  focus: () => animateTab(0)}} />
        <Tab.Screen name="Scan" component={ScanScreenNavigator} listeners={{ tabPress: () => animateTab(1),   // focus fires when this screen becomes active by ANY means
  // (tab press, programmatic navigation, deep link, etc.)
  focus: () => animateTab(1)}} />
        <Tab.Screen name="Report"  component={ReportScreen} listeners={{ tabPress: () => animateTab(2),   // focus fires when this screen becomes active by ANY means
  // (tab press, programmatic navigation, deep link, etc.)
  focus: () => animateTab(2)}} />
        <Tab.Screen name="Chatbot" component={Chatbot} listeners={{ tabPress: () => animateTab(3),   // focus fires when this screen becomes active by ANY means
  // (tab press, programmatic navigation, deep link, etc.)
  focus: () => animateTab(3)}} />
        <Tab.Screen name="Profile" component={ProfileScreen} listeners={{ tabPress: () => animateTab(4),   // focus fires when this screen becomes active by ANY means
  // (tab press, programmatic navigation, deep link, etc.)
  focus: () => animateTab(4)}} />
      </Tab.Navigator>

      {/*
        THE ANIMATED UNDERLINE: how it works:

        This <View> sits OUTSIDE the Tab.Navigator but INSIDE the same
        parent View, so it can be positioned absolutely over the tab bar.

        pointerEvents="none" means touches pass THROUGH this view.
        If we didn't set this, the indicator would block taps on the tab bar.

        Position math:
          bottom: TAB_BAR_HEIGHT - 3
          This places the top of this container 3px below the top of the tab bar.
          Since the tab bar's bottom is at 0, and it's TAB_BAR_HEIGHT tall,
          the indicator sits at the very top of the tab bar.
      */}
      <View pointerEvents="none" style={styles.indicatorContainer}>
        <Animated.View
          style={[
            styles.indicator,
            {
              width: TAB_WIDTH, // exactly as wide as one tab slot
              transform: [
                {
                  // translateX moves the element horizontally.
                  // When animateTab(2) is called, translateX becomes
                  // TAB_WIDTH * 2 = the Report tab's position.
                  translateX,
                },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

export default MainAppNavigator;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // flex: 1 makes this View fill all available space.
    // The Tab.Navigator inside also has flex: 1 by default,
    // so it expands to fill this container.
  },

  tabBar: {
    position: "absolute",
    // position: "absolute" lifts the tab bar OUT of the normal flow.
    // This means screen content can render behind/under it.
    // IMPORTANT: every screen must add paddingBottom: TAB_BAR_HEIGHT
    // at its bottom so content isn't hidden under the tab bar.
    // You'll need this on HomeScreen, ScanScreen, etc.

    height: TAB_BAR_HEIGHT,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
    elevation: 10,          // Android shadow
    shadowColor: "#000",    // iOS shadow
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },

  indicatorContainer: {
    position: "absolute",
    bottom: TAB_BAR_HEIGHT - 3,  // floats just above the tab bar's top edge
    left: 0,
    width: width,                 // spans the full screen width
  },

  indicator: {
    height: 3,
    borderRadius: 999,            // fully rounded pill shape
    backgroundColor: "#6200EE",   // matches the focused icon colour
  },
});
