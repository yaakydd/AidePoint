import React, {
  createContext, useContext,
  useState, useEffect, useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';

export const AuthContext = createContext(null);

// Key to store user profile locally on the device
const USER_CACHE_KEY = 'aidepoint_user_cache';

export function AuthProvider({ children }) {

  // ─── STATE ───────────────────────────────────────────────
  //
  // authState drives the whole navigation tree:
  //   'BOOTING'  → app just opened, show splash screen
  //   'AUTH'     → no logged-in user, show SignIn / SignUp
  //   'CONSENT'  → user logged in but hasn't set preferences yet
  //   'APP'      → fully logged in and set up, show main screens
  //
  const [authState, setAuthState] = useState('BOOTING');
  const [user, setUser]           = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isOnline, setIsOnline]   = useState(true);

  // This ref prevents the Supabase auth listener from running before
  // the initial session check finishes (avoids double-running hydrate)
  const initialized = useRef(false);

  // ─── STARTUP ─────────────────────────────────────────────
  useEffect(() => {
    let alive = true; // prevents state updates if component unmounts mid-way

    async function bootstrap() {
      try {
        // Ask Supabase: "do we have a saved session on this device?"
        // This works offline because the session is stored in AsyncStorage
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        console.log("SESSION =", data.session);

        if (!alive) return;

        if (session?.user) {
          // There IS a saved session — figure out the user's profile
          await hydrateUser(session, alive);
        } else {
          // No session at all — send to login
          setUser(null);
          setAuthState('AUTH');
        }
      } catch (err) {
        // Something crashed (rare) — fail safe to login screen
        if (alive) {
          setUser(null);
          setAuthState('AUTH');
        }
      } finally {
        if (alive) initialized.current = true;
      }
    }

    bootstrap();

    // This listener fires whenever auth changes (login, logout, token refresh).
    // We skip it until bootstrap() finishes to avoid duplicate calls.
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!initialized.current) return;

        if (session?.user) {
          await hydrateUser(session, true);
        } else {
          await clearUserCache();
          setUser(null);
          setAuthState('AUTH');
          setAuthError(null);
        }
      }
    );

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // ─── HYDRATE ─────────────────────────────────────────────
  // Takes a Supabase session → fetches profile → updates state.
  // If we're offline, falls back to the locally cached profile.
  async function hydrateUser(session, alive) {
    const uid = session.user.id;

    let profile = null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (!error && data) {
        profile = data;
        setIsOnline(true);
      } else {
        throw new Error('profile fetch failed');
      }
    } catch {
      // Can't reach Supabase — try the local cache instead
      setIsOnline(false);
      const cached = await getCachedUser();

      if (cached?.id === uid && alive) {
        // We have a cached profile for this user — let them in
        setUser(cached);
        setAuthState(cached.consentDone ? 'APP' : 'CONSENT');
      } else if (alive) {
        // Cache is empty or belongs to a different user
        setUser(null);
        setAuthState('AUTH');
      }
      return;
    }

    if (!alive) return;

    // Build our user object from the Supabase data
    const userData = {
      id:          uid,
      email:       session.user.email,
      name:        profile?.name             || 'Unknown',
      role:        profile?.role             || 'lab_technician',
      hospitalLab: profile?.hospital_lab     || null,
      storeImages: profile?.store_images     ?? false,
      consentDone: profile?.consent_required === false,
      token:       session.access_token,
    };

    // Save to device so it works offline next time
    await cacheUser(userData);

    setUser(userData);
    setAuthState(userData.consentDone ? 'APP' : 'CONSENT');
  }

  // ─── CACHE HELPERS ───────────────────────────────────────
  async function cacheUser(data) {
    try {
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(data));
    } catch { /* ignore storage errors */ }
  }

  async function getCachedUser() {
    try {
      const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async function clearUserCache() {
    try {
      await AsyncStorage.removeItem(USER_CACHE_KEY);
    } catch { /* ignore */ }
  }

  // ─── REGISTER ────────────────────────────────────────────
async function register({ name, email, password, hospitalLab }) {
  setAuthError(null);

  try {
    // ── Offline check (from second version)
    if (!isOnline) {
      const msg =
        'No internet connection. You need internet to create an account.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    // ── Supabase signup (merged both versions)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          hospital_lab: hospitalLab, // stored in auth metadata → used by trigger
        },
      },
    });

    // ── Handle signup error
    if (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    }

    // ── Email verification logic (cleaned + unified)
    const needsVerification = data.session === null;

    return {
      success: true,
      needsVerification,
      email: email.trim().toLowerCase(),
      user: data.user,
    };
  } catch (err) {
    const msg = 'Signup failed. Please try again.';
    setAuthError(msg);
    return { success: false, error: msg };
  }
}

  // ─── VERIFY EMAIL OTP ────────────────────────────────────
  // Called from the VerifyEmail screen with the 6-digit code the user types.
  // On success Supabase fires onAuthStateChange → hydrateUser runs →
  // authState moves to 'CONSENT' or 'APP' automatically.
  async function verifyEmail(email, token) {
    setAuthError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type:  'signup', // 'signup' = email confirmation after sign-up
    });

    if (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  // ─── RESEND VERIFICATION EMAIL ────────────────────────────
  async function resendVerification(email) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // ─── LOGIN ───────────────────────────────────────────────
  async function login(email, password) {
    setAuthError(null);

    if (!isOnline) {
      const msg = 'No internet connection. Please connect to sign in.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    }

    // On success: onAuthStateChange listener fires → hydrateUser runs →
    // authState changes to 'CONSENT' or 'APP'. No navigate() needed here.
    return { success: true };
  }

  // ─── CONSENT ─────────────────────────────────────────────
  async function completeConsent(storeImages) {
    if (!user) return { success: false, error: 'Not logged in' };

    const updated = { ...user, storeImages, consentDone: true };

    if (!isOnline) {
      await cacheUser({ ...updated, consentPending: true });
      setUser(updated);
      setAuthState('APP');
      return { success: true };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ store_images: storeImages, consent_required: false })
      .eq('id', user.id);

    if (error) return { success: false, error: error.message };

    await cacheUser(updated);
    setUser(updated);
    setAuthState('APP');
    return { success: true };
  }

  // ─── UPDATE PROFILE ──────────────────────────────────────
  async function updateProfile(changes) {
    if (!user) return { success: false, error: 'Not logged in' };

    const dbChanges = {};
    if (changes.storeImages !== undefined) dbChanges.store_images = changes.storeImages;
    if (changes.hospitalLab !== undefined) dbChanges.hospital_lab = changes.hospitalLab;
    if (changes.name        !== undefined) dbChanges.name         = changes.name;

    const updated = {
      ...user,
      ...(changes.storeImages !== undefined && { storeImages: changes.storeImages }),
      ...(changes.hospitalLab !== undefined && { hospitalLab: changes.hospitalLab }),
      ...(changes.name        !== undefined && { name:        changes.name }),
    };

    // Optimistic update — save locally first so UI responds instantly
    await cacheUser(updated);
    setUser(updated);

    if (isOnline) {
      const { error } = await supabase
        .from('profiles')
        .update(dbChanges)
        .eq('id', user.id);

      if (error) {
        // Revert on failure
        await cacheUser(user);
        setUser(user);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }

  // ─── LOGOUT ──────────────────────────────────────────────
  async function logout() {
    await supabase.auth.signOut();
    await clearUserCache();
    setUser(null);
    setAuthState('AUTH');
    setAuthError(null);
  }

  // ─── CLEAR ERROR ─────────────────────────────────────────
  function clearError() {
    setAuthError(null);
  }

  // ─── PROVIDE ─────────────────────────────────────────────
  return (
    <AuthContext.Provider value={{
      authState,          // 'BOOTING' | 'AUTH' | 'CONSENT' | 'APP'
      user,               // { id, email, name, role, storeImages, consentDone, token }
      authError,          // string or null
      isOnline,           // boolean
      register,
      verifyEmail,
      resendVerification,
      updateProfile,
      login,
      logout,
      completeConsent,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);