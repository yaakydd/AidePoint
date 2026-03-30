import React from "react";
import { AuthProvider } from "./context/AuthContext";
import AppNavigator from "./Navigation/AppNavigator";

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}