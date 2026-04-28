import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthContext } from "../context/AuthContext";
import SplashScreen from "../screens/SplashScreen";

import AuthNavigator from "./AuthNavigator";
import MainAppNavigator from "./MainAppNavigator";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, isLoading } = useContext(AuthContext);

  // Show splash while loading
  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/*<Stack.Screen name="Auth" component={AuthNavigator} /> */}

        
        {user ? (
          <Stack.Screen name="MainApp" component={MainAppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;