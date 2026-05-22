// context/AuthContext.js
//
// The central authentication state for the entire app.
// Wrap your app in <AuthProvider> and use useAuth() anywhere
// to access the user and auth functions.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase }  from '../utils/supabase';

// ─── ASYNC STORAGE KEYS ───────────────────────────────────────────
// We keep these as constants so there are no typos across the app.
const STORAGE_KEYS = {
  HAS_LAUNCHED: 'aidepoint_has_launched', // true after first ever launch
};

// ─── CONTEXT ──────────────────────────────────────────────────────
export const AuthContext = createContext({});

// ─── PROVIDER ─────────────────────────────────────────────────────
export function AuthProvider({ children }) {

  // ── State ────────────────────────────────────────────────────────
  const [user,          setUser]          = useState(null);
  const [isLoading,     setIsLoading]     = useState(true);  // true while checking session
  const [isFirstLaunch, setIsFirstLaunch] = useState(false); // true only on very first open
  const [authError,     setAuthError]     = useState(null);


  // ── On mount: check session + first launch ───────────────────────
  useEffect(() => {

    // 1. Check if this is the very first time the app has ever opened.
    //    We store a flag in AsyncStorage after the first launch.
    checkFirstLaunch();

    // 2. Check if there is already a saved session on this device.
    //    @supabase/supabase-js automatically reads from AsyncStorage.
    //    If there is a session, log the user in immediately without
    //    asking them to enter their email/password again.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Session exists — fetch the full profile and set the user.
        fetchAndSetUser(session);
      } else {
        // No session — user will see the sign-in screen.
        setIsLoading(false);
      }
    });

    // 3. Subscribe to auth state changes.
    //    This fires whenever:
    //      - A user logs in
    //      - A user logs out
    //      - The JWT token refreshes (every hour, automatic)
    //    This is the single source of truth for auth state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          await fetchAndSetUser(session);
        } else {
          // Logged out — clear the user from state.
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Clean up the subscription when the component unmounts.
    return () => subscription.unsubscribe();

  }, []);


  // ── Helpers ──────────────────────────────────────────────────────

  // Check and set whether this is the first time the app has opened.
  async function checkFirstLaunch() {
    try {
      const hasLaunched = await AsyncStorage.getItem(STORAGE_KEYS.HAS_LAUNCHED);
      if (!hasLaunched) {
        // First ever launch — show onboarding.
        setIsFirstLaunch(true);
        // Mark that the app has been launched (so onboarding won't show again).
        await AsyncStorage.setItem(STORAGE_KEYS.HAS_LAUNCHED, 'true');
      }
    } catch (e) {
      // If AsyncStorage fails, default to not showing onboarding.
      console.warn('AuthContext: checkFirstLaunch error', e);
    }
  }

  // After getting a session, fetch the user's profile row from the
  // profiles table and build the user object the app uses everywhere.
  async function fetchAndSetUser(session) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        // Profile not found — this can happen in a rare race condition
        // right after signup (trigger hasn't fired yet). Fall back to
        // auth metadata which was set during signUp.
        const meta = session.user.user_metadata ?? {};
        setUser({
          id:          session.user.id,
          name:        meta.name        ?? 'Unknown',
          email:       session.user.email,
          role:        meta.role        ?? 'lab_technician',
          userType:    meta.user_type   ?? 'solo',
          hospitalId:  meta.hospital_id ?? null,
          storeImages: false,
          token:       session.access_token,
        });
      } else {
        // Profile found — use it as the source of truth.
        setUser({
          id:          session.user.id,
          name:        profile.name,
          email:       session.user.email,
          role:        profile.role,
          userType:    profile.user_type,
          hospitalId:  profile.hospital_id ?? null,
          storeImages: profile.store_images ?? false,
          token:       session.access_token,
        });
      }
    } catch (e) {
      console.error('AuthContext: fetchAndSetUser error', e);
    } finally {
      setIsLoading(false);
    }
  }


  // ── Auth Functions ────────────────────────────────────────────────

  // LOGIN — email + password (solo users and hospital users until SSO is built)
  //
  // Returns: { success: true } or { success: false, error: 'message' }
  //
  // After a successful login, onAuthStateChange fires automatically
  // and sets the user — you do NOT need to call setUser here.
  async function login(email, password) {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      return { success: true };

    } catch (error) {
      const message = error.message ?? 'Login failed. Please try again.';
      setAuthError(message);
      return { success: false, error: message };
    }
  }


  // REGISTER — create a new solo lab technician account
  //
  // What happens behind the scenes:
  //   1. Supabase Auth creates a new user in auth.users
  //   2. The trigger (on_auth_user_created) fires and creates a
  //      row in the profiles table automatically
  //   3. onAuthStateChange fires and sets the user
  //
  // Returns: { success: true } or { success: false, error: 'message' }
  async function register(name, email, password) {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // This data is passed to the trigger so it can create
          // the profile row with the right values.
          data: {
            name,
            role:      'lab_technician',
            user_type: 'solo',
            // hospital_id is null for solo users — not included here
          },
        },
      });

      if (error) throw error;

      return { success: true };

    } catch (error) {
      const message = error.message ?? 'Registration failed. Please try again.';
      setAuthError(message);
      return { success: false, error: message };
    }
  }


  // LOGOUT — clears session from device and state
  async function logout() {
    setAuthError(null);
    await supabase.auth.signOut();
    // onAuthStateChange fires after this and sets user to null automatically.
  }


  // COMPLETE ONBOARDING
  //
  // Called at the end of the onboarding flow.
  // Saves the user's image storage preference (store_images) to their
  // profile in the database. This is the preference the app uses from
  // now on whenever a scan is submitted.
  //
  // storeImages: boolean — did the user agree to store images?
  async function completeOnboarding(storeImages) {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ store_images: storeImages })
        .eq('id', user.id);

      if (error) {
        console.warn('AuthContext: completeOnboarding error', error);
        return { success: false };
      }

      // Update local user state so the app reflects the new preference immediately.
      setUser(prev => ({ ...prev, storeImages }));

      return { success: true };

    } catch (e) {
      console.error('AuthContext: completeOnboarding error', e);
      return { success: false };
    }
  }


  // UPDATE STORE IMAGES PREFERENCE
  //
  // Called from ProfileScreen when the user toggles the
  // image storage preference after onboarding.
  //
  // storeImages: boolean
  async function updateStoreImages(storeImages) {
    try {
      if (!user) return { success: false };

      const { error } = await supabase
        .from('profiles')
        .update({ store_images: storeImages })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state immediately so the UI reflects it right away.
      setUser(prev => ({ ...prev, storeImages }));

      return { success: true };

    } catch (e) {
      const message = e.message ?? 'Could not update preference.';
      console.error('AuthContext: updateStoreImages error', e);
      return { success: false, error: message };
    }
  }


  // CLEAR ERROR
  // Call this whenever you want to dismiss an error message in the UI.
  function clearError() {
    setAuthError(null);
  }


  // ── Context Value ────────────────────────────────────────────────
  return (
    <AuthContext.Provider value={{
      // State
      user,           // null when logged out, user object when logged in
      isLoading,      // true while checking session on startup
      isFirstLaunch,  // true only on the very first app open ever
      authError,      // string error message, or null

      // Auth actions
      login,
      register,
      logout,
      clearError,

      // Onboarding + preferences
      completeOnboarding,   // called once at end of onboarding
      updateStoreImages,    // called from ProfileScreen
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── HOOK ─────────────────────────────────────────────────────────
// Use this in any screen: const { user, login, logout } = useAuth();
export const useAuth = () => useContext(AuthContext);