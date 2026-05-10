// context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// createContext() creates a "shared box" that any child component
// can reach into without prop-drilling through every parent.
export const AuthContext = createContext();

// A custom hook so screens can write:
//   const { user, login } = useAuth();
// instead of:
//   const { user, login } = useContext(AuthContext);
// It also throws a clear error if you forget to wrap your app
// in AuthProvider (common mistake during setup).
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);   // logged-in user object or null
  const [isLoading, setIsLoading]     = useState(true);   // true while reading AsyncStorage
  const [isFirstLaunch, setIsFirstLaunch] = useState(null); // null = not yet determined
  const [authError, setAuthError]     = useState(null);   // holds login/signup error messages

  // ─── BOOT CHECK ──────────────────────────────────────────────────────────────
  // Every time the app starts, we check AsyncStorage for a saved session.
  // AsyncStorage is like localStorage for React Native — it persists across
  // app restarts. The [] dependency array means this runs ONCE on mount.
  useEffect(() => {
    const loadData = async () => {
      try {
        // multiGet fetches multiple keys in one disk read — more efficient
        // than two separate getItem() calls.
        // Result: [ ['user', '{"name":"..."}'], ['isFirstLaunch', 'false'] ]
        const [[, storedUser], [, firstLaunch]] = await AsyncStorage.multiGet([
          "user",
          "isFirstLaunch",
        ]);

        if (storedUser) {
          // JSON.parse converts the stored string back into a JS object
          setUser(JSON.parse(storedUser));
        }

        // If 'isFirstLaunch' key was never written, firstLaunch === null.
        // That only happens on a brand-new install — so isFirstLaunch = true.
        // Once the user completes auth, we write 'false' to this key.
        setIsFirstLaunch(firstLaunch === null);

      } catch (e) {
        console.error("Error loading auth data:", e);
      } finally {
        // Whether success or error, stop showing the loading screen
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // ─── LOGIN ────────────────────────────────────────────────────────────────────
  // Call this after a successful API response.
  // Pass in the user object from the backend (id, name, email, role, etc).
  const login = async (userData) => {
    try {
      setAuthError(null);
      setUser(userData);

      // Persist the session. Next time the app opens, loadData() above
      // will find this and restore the logged-in state automatically.
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      // Mark onboarding as seen. We never want to show it again after
      // the user has gone through the auth flow at least once.
      if (isFirstLaunch) {
        await AsyncStorage.setItem("isFirstLaunch", "false");
        setIsFirstLaunch(false);
      }
    } catch (e) {
      console.error("Login error:", e);
      setAuthError("Failed to save your session. Please try again.");
    }
  };

  // ─── LOGOUT ───────────────────────────────────────────────────────────────────
  // Clears state and removes the persisted session.
  // Notice: we do NOT remove 'isFirstLaunch' — the user has already
  // seen onboarding, no need to show it again if they log out and back in.
  const logout = async () => {
    try {
      setUser(null);
      setAuthError(null);
      await AsyncStorage.removeItem("user");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isFirstLaunch, authError, login, logout, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
};