import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthNavigator     from "./navigation/AuthNavigator";
import MainAppNavigator  from "./navigation/MainAppNavigator";
import ConsentScreen     from "./screens/ConsentScreen";
import SplashScreen      from "./screens/SplashScreen";

function RootRouter() {
  const { authState } = useAuth();
  // The splash must show for at least 2 seconds (for branding),
  // and must wait for auth to finish booting.
  // Both conditions have to clear before moving on to the next.
  const [timerDone, setTimerDone] = React.useState(false);

React.useEffect(() => {
    const t = setTimeout(() => setTimerDone(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // If still loading, show splash screen
  if (authState === 'BOOTING' || !timerDone) {
    return <SplashScreen />;
  }

  // Not logged in,show Onboarding,SignIn ,SignUp flow
  if (authState === 'AUTH') {
    return <AuthNavigator />;
  }

  // Logged in but hasn't picked data preference yet
  if (authState === 'CONSENT') {
    return <ConsentScreen />;
  }

  // Fully set up, show the main app
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
