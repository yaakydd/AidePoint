// context/AuthContext.js
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const hasLaunched = await AsyncStorage.getItem("hasLaunched");

        if (hasLaunched === null) {
          await AsyncStorage.setItem("hasLaunched", "true");
          setIsFirstLaunch(true); // first time user
        } else {
          setIsFirstLaunch(false);
        }

        if (storedUser) setUser(JSON.parse(storedUser));
      } catch (e) {
        console.log("AuthContext load error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isFirstLaunch, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};