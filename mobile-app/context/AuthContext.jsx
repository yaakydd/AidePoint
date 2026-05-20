// context/AuthContext.js
//
// This is the single source of truth for authentication across the whole app.
// Every screen that needs to know who is logged in reads from here.
//
// HOW IT WORKS WITH SUPABASE:
// 1. On app start → supabase.auth.getSession() checks for a saved session
// 2. supabase.auth.onAuthStateChange() listens for ANY auth event
//    (sign in, sign out, token refresh) and keeps our state in sync
// 3. After getting a session, we fetch the user's profile from the profiles table
//    to get their name, role, userType, and hospitalId
// 4. We combine the Supabase auth data + profile data into one 'user' object
//    so screens only need to read from AuthContext — not two separate places

import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../utils/supabase";

// createContext() creates the shared "box" that any component can read from
export const AuthContext = createContext();

// useAuth is a convenience hook so screens can write:
//   const { user, login } = useAuth();
// instead of:
//   const { user, login } = useContext(AuthContext);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // user = the full user object (combined auth + profile), or null if not logged in
  // Shape: { id, email, name, role, userType, hospitalId, token }
  const [user, setUser] = useState(null);

  // isLoading = true while we're checking for an existing session on startup
  // AppNavigator shows a SplashScreen until this is false
  const [isLoading, setIsLoading] = useState(true);

  // isFirstLaunch = true only on a brand-new install (onboarding not yet seen)
  // Starts as null (unknown), becomes true/false after AsyncStorage check
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  // authError = holds error messages from login/register failures
  // Screens can read this to show a banner without wrapping everything in try/catch
  const [authError, setAuthError] = useState(null);

  // ─── HELPER: build our user object from a Supabase session ───────────────
  // A Supabase session gives us the auth data (id, email, token).
  // The profile table gives us the app-specific data (name, role, userType).
  // We combine both into one object that screens can use.
  const buildUserFromSession = async (session) => {
    if (!session) return null;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, role, user_type, hospital_id")
        .eq("id", session.user.id)
        .single();

      if (error) {
        // Profile fetch failed — maybe the trigger hasn't run yet.
        // Return a minimal user so the app doesn't crash.
        console.warn("Could not fetch profile, using minimal user:", error.message);
        return {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name ?? "User",
          role: "lab_technician",
          userType: session.user.user_metadata?.user_type ?? "solo",
          hospitalId: null,
          token: session.access_token,
        };
      }

      return {
        id: session.user.id,
        email: session.user.email,
        name: profile.name,
        role: profile.role,             // 'lab_technician' | 'doctor' | 'admin'
        userType: profile.user_type,    // 'hospital' | 'solo'
        hospitalId: profile.hospital_id,
        token: session.access_token,
      };
    } catch (e) {
      console.error("buildUserFromSession error:", e);
      return null;
    }
  };

  // ─── APP STARTUP ─────────────────────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if the user has seen onboarding before.
        // AsyncStorage.getItem returns null if the key was never written.
        const firstLaunch = await AsyncStorage.getItem("isFirstLaunch");
        setIsFirstLaunch(firstLaunch === null); // null = never set = first launch

        // Ask Supabase: is there a saved session on this device?
        // @supabase/supabase-js persists the session in AsyncStorage automatically
        // because we configured it with { auth: { storage: AsyncStorage } }
        // in utils/supabase.js
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("getSession error:", error.message);
        } else if (session) {
          // Session found — user was previously logged in
          const userData = await buildUserFromSession(session);
          setUser(userData);
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        // Whether we found a session or not, stop showing the splash screen
        setIsLoading(false);
      }
    };

    initAuth();

    // ─── AUTH STATE LISTENER ───────────────────────────────────────────────
    // This fires automatically whenever auth state changes:
    //   SIGNED_IN        — after a successful login or signup
    //   SIGNED_OUT       — after logout
    //   TOKEN_REFRESHED  — Supabase silently refreshes the JWT before it expires
    //   USER_UPDATED     — if profile data changes
    //
    // This is how the app stays in sync without polling.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const userData = await buildUserFromSession(session);
        setUser(userData);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "TOKEN_REFRESHED" && session) {
        // Just update the token — no need to re-fetch the profile
        setUser((prev) =>
          prev ? { ...prev, token: session.access_token } : null
        );
      }
    });

    // Cleanup: unsubscribe when the provider unmounts (prevents memory leaks)
    return () => subscription.unsubscribe();
  }, []); // [] = run once on mount only

  // ─── LOGIN ───────────────────────────────────────────────────────────────
  // Called from SignIn screen.
  // Returns { success: true } or { success: false, error: "message" }
  // so the screen can handle the result without reading authError state.
  const login = async (email, password) => {
    try {
      setAuthError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      // Mark onboarding as seen — we never show it again after first login
      if (isFirstLaunch) {
        await AsyncStorage.setItem("isFirstLaunch", "false");
        setIsFirstLaunch(false);
      }

      // onAuthStateChange will fire SIGNED_IN and call buildUserFromSession.
      // We don't need to setUser here — the listener handles it.
      return { success: true };
    } catch (e) {
      const message = e.message ?? "Sign in failed. Please try again.";
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  // ─── REGISTER ────────────────────────────────────────────────────────────
  // Called from SignUp screen.
  // We pass the user's name and userType in options.data (called user_metadata
  // in Supabase). The on_auth_user_created trigger reads this metadata
  // and writes a row to the profiles table automatically.
  //
  // Returns:
  //   { success: true, requiresConfirmation: false } — logged in immediately
  //   { success: true, requiresConfirmation: true }  — email confirmation sent
  //   { success: false, error: "message" }           — something went wrong
  const register = async ({ email, password, fullName, userType }) => {
    try {
      setAuthError(null);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: fullName.trim(),
            user_type: userType, // 'hospital' | 'solo'
          },
        },
      });

      if (error) throw error;

      // If email confirmation is required (Supabase setting),
      // data.session will be null and data.user.identities will be empty.
      // In that case we return requiresConfirmation: true
      // so the screen can show "Check your email" instead of navigating.
      const requiresConfirmation = !data.session;

      if (!requiresConfirmation && isFirstLaunch) {
        await AsyncStorage.setItem("isFirstLaunch", "false");
        setIsFirstLaunch(false);
      }

      // If there IS a session (email confirmation off), onAuthStateChange
      // fires SIGNED_IN and sets the user automatically.
      return { success: true, requiresConfirmation };
    } catch (e) {
      const message = e.message ?? "Registration failed. Please try again.";
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  // ─── LOGOUT ──────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      setAuthError(null);
      await supabase.auth.signOut();
      // onAuthStateChange fires SIGNED_OUT and sets user to null automatically.
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isFirstLaunch,
        authError,
        login,      // (email, password) => { success, error? }
        register,   // ({ email, password, fullName, userType }) => { success, requiresConfirmation?, error? }
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};