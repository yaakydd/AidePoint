import React from "react";
import { NavigationContainer } from "@react-navigation/native";

import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthNavigator from "./navigation/AuthNavigator";
import MainAppNavigator from "./navigation/MainAppNavigator";
import ConsentScreen from "./screens/ConsentScreen";
import SplashScreen from "./screens/SplashScreen";

function RootRouter() {
  const { user, needsConsent, isBooting } = useAuth();

  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (isBooting || showSplash) return <SplashScreen />;

  if (!user) return <AuthNavigator />;

  if (needsConsent) return <ConsentScreen />;

  return <MainAppNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootRouter />
      </NavigationContainer>
    </AuthProvider>
  );
}