// context/AuthContext.js
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  // Load user and first launch info from AsyncStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const firstLaunch = await AsyncStorage.getItem("isFirstLaunch");

        if (storedUser) setUser(JSON.parse(storedUser));

        // If firstLaunch is null, this is the very first time
        setIsFirstLaunch(firstLaunch === null ? true : false);
      } catch (e) {
        console.log("Error loading auth data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // LOGIN function
  const login = async (userData) => {
    try {
      setUser(userData);
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      // Once user registers/logs in, mark first launch as false
      await AsyncStorage.setItem("isFirstLaunch", "false");
      setIsFirstLaunch(false);
    } catch (e) {
      console.log("Login error:", e);
    }
  };

  // LOGOUT function
  const logout = async () => {
    try {
      setUser(null);
      await AsyncStorage.removeItem("user");
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isFirstLaunch, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};