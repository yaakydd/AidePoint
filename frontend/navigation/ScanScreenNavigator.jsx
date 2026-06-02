import React from "react";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Scan from "../screens/Scan";
import CameraScreen from "../screens/CameraScreen";

const Stack = createNativeStackNavigator();

export default function ScanStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScanHome" component={Scan} />
      <Stack.Screen name="Camera" component={CameraScreen} />
    </Stack.Navigator>
  );
}
