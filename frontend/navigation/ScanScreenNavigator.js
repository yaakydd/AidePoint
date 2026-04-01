import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import Scan from "../screens/Scan";
import CameraView from "../screens/CameraView";

const Stack = createStackNavigator();

export default function ScanStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScanHome" component={Scan} />
      <Stack.Screen name="AdvancedScan" component={CameraView} />
    </Stack.Navigator>
  );
}