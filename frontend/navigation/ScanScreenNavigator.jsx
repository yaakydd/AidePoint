import React from "react";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Scan from "../screens/Scan";
import CameraView from "../screens/CameraView";

const Stack = createNativeStackNavigator();

export default function ScanStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScanHome" component={Scan} />
      <Stack.Screen name="CameraView" component={CameraView} />
    </Stack.Navigator>
  );
}