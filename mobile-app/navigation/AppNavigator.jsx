import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthContext } from "../context/AuthContext";
import SplashScreen from "../screens/SplashScreen";
import AuthNavigator from "./AuthNavigator";
import MainAppNavigator from "./MainAppNavigator";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  // user = the logged-in user object (or null if not logged in)
  // isLoading  = true while AsyncStorage is being read at app start
  const { user, isLoading } = useContext(AuthContext);

  // While we're checking if there's a saved session,
  // show a splash screen so the user doesn't see a blank flash.
  if (isLoading) return <SplashScreen />;

  // NavigationContainer is the root of ALL navigation in the app and its only one
  // Everything else (Stack, Tabs, Drawers) goes inside it.
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // If user object exists then the person is logged in, show the app
          <Stack.Screen name="MainApp" component={MainAppNavigator} />
        ) : (
          // no user then it needs to authenticate
          // AuthNavigator internally decides whether to show
          // Onboarding or SignIn based on isFirstLaunch
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;