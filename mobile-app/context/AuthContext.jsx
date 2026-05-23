// context/AuthContext.js
//
// Central auth state. Every screen reads user data and calls auth functions
// from here. Wrap your app root in <AuthProvider>.
//
// AUTH FLOW (new user):
//   SignUp → UserType → register() → [needsOnboarding=true] →
//   OnboardingScreen → completeOnboardingSlides() → [needsConsent=true] →
//   ConsentScreen → completeOnboarding() → MainApp
//
// AUTH FLOW (returning user):
//   SignIn → login() → MainApp
//
// AUTH FLOW (Google – new user):
//   loginWithGoogle() → fetchAndSetUser detects null user_type →
//   [needsUserType=true] → UserTypeScreen → setUserType() → [needsOnboarding=true] →
//   ... same as above

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';

// ── AsyncStorage keys ────────────────────────────────────────────────────────
// Per-user keys prevent one user's state from leaking to another on the same device.
// The base key is static (for first-launch which is device-level).
const KEYS = {
  HAS_LAUNCHED:     'aidepoint_has_launched',
  // Dynamic — always call as KEYS.needsOnboarding(userId) etc.
  needsOnboarding:  (uid) => `aidepoint_needs_onboarding_${uid}`,
  needsConsent:     (uid) => `aidepoint_needs_consent_${uid}`,
};

export const AuthContext = createContext({});

export function AuthProvider({ children }) {

  // ── State ────────────────────────────────────────────────────────────────
  const [user,          setUser]          = useState(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [authError,     setAuthError]     = useState(null);

  // Post-signup flow gates. AppNavigator checks these in order:
  //   needsUserType  → show UserTypeScreen (Google new users only)
  //   needsOnboarding→ show OnboardingScreen (5 slides)
  //   needsConsent   → show ConsentScreen (image storage preference)
  const [needsUserType,   setNeedsUserType]   = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsConsent,    setNeedsConsent]    = useState(false);


  // ── Startup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    checkFirstLaunch();

    // Check for a persisted session (from a previous login).
    // Supabase reads it from AsyncStorage automatically.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchAndSetUser(session);
      } else {
        setIsLoading(false);
      }
    });

    // Single source of truth for auth state.
    // Fires on: login, logout, token refresh (every hour).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          await fetchAndSetUser(session);
        } else {
          setUser(null);
          setNeedsUserType(false);
          setNeedsOnboarding(false);
          setNeedsConsent(false);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);


  // ── Helpers ──────────────────────────────────────────────────────────────

  async function checkFirstLaunch() {
    try {
      const seen = await AsyncStorage.getItem(KEYS.HAS_LAUNCHED);
      if (!seen) {
        setIsFirstLaunch(true);
        await AsyncStorage.setItem(KEYS.HAS_LAUNCHED, 'true');
      }
    } catch (e) {
      console.warn('AuthContext: checkFirstLaunch error', e);
    }
  }

  // Build the user object and restore any persisted flow-gate flags.
  // Called every time a session is detected (startup or login).
  async function fetchAndSetUser(session) {
    try {
      const uid = session.user.id;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error || !profile) {
        // Race condition: trigger hasn't created the profile row yet.
        // Fall back to auth metadata (set during signUp or Google auth).
        const meta = session.user.user_metadata ?? {};
        setUser({
          id:          uid,
          name:        meta.name        ?? meta.full_name ?? 'Unknown',
          email:       session.user.email,
          role:        meta.role        ?? 'lab_technician',
          userType:    meta.user_type   ?? null,
          hospitalId:  meta.hospital_id ?? null,
          storeImages: false,
          token:       session.access_token,
        });
        // If we fell back and there's no user_type, treat as new Google user.
        if (!meta.user_type) setNeedsUserType(true);
      } else {
        setUser({
          id:          uid,
          name:        profile.name,
          email:       session.user.email,
          role:        profile.role       ?? 'lab_technician',
          userType:    profile.user_type  ?? null,
          hospitalId:  profile.hospital_id ?? null,
          storeImages: profile.store_images ?? false,
          token:       session.access_token,
        });

        // New Google user: user_type hasn't been set yet.
        if (!profile.user_type) {
          setNeedsUserType(true);
        }
      }

      // Restore persisted flow-gate flags from AsyncStorage.
      // This survives app kills mid-onboarding flow.
      const [ob, co] = await Promise.all([
        AsyncStorage.getItem(KEYS.needsOnboarding(uid)),
        AsyncStorage.getItem(KEYS.needsConsent(uid)),
      ]);
      if (ob === 'true') setNeedsOnboarding(true);
      if (co === 'true') setNeedsConsent(true);

    } catch (e) {
      console.error('AuthContext: fetchAndSetUser error', e);
    } finally {
      setIsLoading(false);
    }
  }


  // ── Auth Functions ────────────────────────────────────────────────────────

  // LOGIN (email + password)
  // Called from SignInScreen.
  // Returns { success: true } or { success: false, error: 'message' }
  async function login(email, password) {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      const msg = e.message ?? 'Login failed. Please try again.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }


  // REGISTER (email + password)
  // Called from UserTypeScreen AFTER the user fills in the form in SignUp
  // and picks their user type. UserType passes { name, email, password, userType }.
  //
  // What happens:
  //   1. Supabase Auth creates the user in auth.users
  //   2. The on_auth_user_created trigger creates the profiles row using the metadata
  //   3. onAuthStateChange fires → fetchAndSetUser → user is set
  //   4. We persist flow-gate flags in AsyncStorage so they survive app kills
  //
  // Returns { success: true } or { success: false, error: 'message' }
  async function register({ name, email, password, userType = 'solo' }) {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // This metadata is used by the on_auth_user_created trigger
          // to populate the profiles table row automatically.
          data: {
            name:      name.trim(),
            role:      'lab_technician',
            user_type: userType,
          },
        },
      });

      if (error) throw error;

      // Email confirmation is OFF in dev, so data.session exists immediately.
      // If you turn it ON, data.session will be null and the user needs
      // to verify their email before onAuthStateChange fires.
      const requiresConfirmation = !data.session;

      if (!requiresConfirmation && data.user) {
        const uid = data.user.id;
        // Persist flow-gate flags. These are read back in fetchAndSetUser
        // if the app is killed and relaunched mid-flow.
        await AsyncStorage.setItem(KEYS.needsOnboarding(uid), 'true');
        await AsyncStorage.setItem(KEYS.needsConsent(uid),    'true');
        setNeedsOnboarding(true);
        setNeedsConsent(true);
      }

      return { success: true, requiresConfirmation };

    } catch (e) {
      const msg = e.message ?? 'Registration failed. Please try again.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }


  // LOGIN WITH GOOGLE
  // Called with the id_token received from expo-auth-session / Google OAuth.
  // Supabase exchanges it for a session internally.
  //
  // New Google users will have a null user_type in their profile.
  // fetchAndSetUser detects this and sets needsUserType=true,
  // which routes them through UserTypeScreen → Onboarding → Consent.
  //
  // Returning Google users skip all of that (flags already cleared).
  async function loginWithGoogle(idToken) {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token:    idToken,
      });
      if (error) throw error;
      // onAuthStateChange fires → fetchAndSetUser handles the rest.
      return { success: true };
    } catch (e) {
      const msg = e.message ?? 'Google sign-in failed. Please try again.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }


  // SET USER TYPE (for Google new users — called from UserTypeScreen)
  // Updates the profiles row, clears needsUserType,
  // and sets the onboarding flags.
  async function setUserType(userType) {
    try {
      if (!user) return { success: false };

      const { error } = await supabase
        .from('profiles')
        .update({ user_type: userType })
        .eq('id', user.id);

      if (error) throw error;

      await AsyncStorage.setItem(KEYS.needsOnboarding(user.id), 'true');
      await AsyncStorage.setItem(KEYS.needsConsent(user.id),    'true');

      setUser(prev => ({ ...prev, userType }));
      setNeedsUserType(false);
      setNeedsOnboarding(true);
      setNeedsConsent(true);

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }


  // COMPLETE ONBOARDING SLIDES (called from OnboardingScreen "Get Started")
  // Clears the onboarding flag and advances to the ConsentScreen.
  async function completeOnboardingSlides() {
    try {
      if (user) {
        await AsyncStorage.removeItem(KEYS.needsOnboarding(user.id));
      }
      setNeedsOnboarding(false);
      // needsConsent is still true → AppNavigator shows ConsentScreen next.
    } catch (e) {
      console.warn('AuthContext: completeOnboardingSlides error', e);
      setNeedsOnboarding(false); // Always advance the user
    }
  }


  // COMPLETE ONBOARDING / CONSENT (called from ConsentScreen)
  // Saves the image storage preference to the profile,
  // then clears needsConsent so AppNavigator shows the main app.
  async function completeOnboarding(storeImages) {
    try {
      if (!user) return { success: false };

      const { error } = await supabase
        .from('profiles')
        .update({ store_images: storeImages })
        .eq('id', user.id);

      if (error) {
        // DB failure is non-fatal. The default (false) is the safe fallback.
        console.warn('AuthContext: completeOnboarding DB error', error);
      }

      await AsyncStorage.removeItem(KEYS.needsConsent(user.id));

      setUser(prev => ({ ...prev, storeImages }));
      setNeedsConsent(false);

      return { success: true };
    } catch (e) {
      console.error('AuthContext: completeOnboarding error', e);
      setNeedsConsent(false); // Always let the user through
      return { success: false };
    }
  }


  // UPDATE STORE IMAGES (called from ProfileScreen)
  // Lets the user change their image storage preference after onboarding.
  async function updateStoreImages(storeImages) {
    try {
      if (!user) return { success: false };

      const { error } = await supabase
        .from('profiles')
        .update({ store_images: storeImages })
        .eq('id', user.id);

      if (error) throw error;

      setUser(prev => ({ ...prev, storeImages }));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message ?? 'Could not update preference.' };
    }
  }


  // LOGOUT
  async function logout() {
    setAuthError(null);
    setNeedsUserType(false);
    setNeedsOnboarding(false);
    setNeedsConsent(false);
    await supabase.auth.signOut();
    // onAuthStateChange fires → user set to null → AppNavigator shows AuthNavigator.
  }


  // CLEAR ERROR (call when user starts editing after seeing an error)
  function clearError() {
    setAuthError(null);
  }


  return (
    <AuthContext.Provider value={{
      // State
      user,
      isLoading,
      isFirstLaunch,
      authError,
      needsUserType,
      needsOnboarding,
      needsConsent,

      // Auth
      login,
      register,
      loginWithGoogle,
      logout,
      clearError,

      // Post-signup flow
      setUserType,
      completeOnboardingSlides,
      completeOnboarding,
      updateStoreImages,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);