  import React, { useRef, useEffect } from "react";
  import { View, Animated, Dimensions } from "react-native";
  import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
  import { Ionicons } from "@expo/vector-icons";

  import HomeScreen from "../screens/HomeScreen";
  import ScanScreenNavigator from "./ScanScreenNavigator";
  import ReportScreen from "../screens/ReportScreen";
  import Chatbot from "../screens/Chatbot";
  import ProfileScreen from "../screens/ProfileScreen";


  const Tab = createBottomTabNavigator();
  const { width } = Dimensions.get("window");

  const MainAppNavigator = () => {
    const translateX = useRef(new Animated.Value(0)).current;
    const tabWidth = width / 5;

    const animateTab = (index) => {
      Animated.spring(translateX, {
        toValue: tabWidth * index,
        useNativeDriver: true,
      }).start();
    };

    return (
      <>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: false,
            tabBarIcon: ({ size, focused }) => {
              let iconName;

              switch (route.name) {
                case "Home":
                  iconName = "home-outline";
                  break;
                case "Scan":
                  iconName = "scan-outline";
                  break;
                case "Report":
                  iconName = "document-text-outline";
                  break;
                case "Chatbot":
                  iconName = "chatbubble-ellipses-outline";
                  break;
                case "Profile":
                  iconName = "person-outline";
                  break;
                default:
                  iconName = "ellipse";
              }

              return (
                <Ionicons
                  name={iconName}
                  size={size}
                  color={focused ? "#6200EE" : "#888"}
                />
              );
            },
          })}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            listeners={{ tabPress: () => animateTab(0) }}
          />

          <Tab.Screen
            name="Scan"
            component={ScanScreenNavigator}
            listeners={{ tabPress: () => animateTab(1) }}
          />

          <Tab.Screen
            name="Report"
            component={ReportScreen}
            listeners={{ tabPress: () => animateTab(2) }}
          />

          <Tab.Screen
            name="Chatbot"
            component={Chatbot}
            listeners={{ tabPress: () => animateTab(3) }}
          />

          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            listeners={{ tabPress: () => animateTab(4) }}
          />


        </Tab.Navigator>

        {/* Animated underline */}
        <View
          style={{
            position: "absolute",
            bottom: 65,
            width,
          }}
        >
          <Animated.View
            style={{
              width: tabWidth,
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