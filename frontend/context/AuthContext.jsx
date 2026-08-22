import React, {
  createContext, useContext,
  useState, useEffect, useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';

import { isPinCreated } from '../utils/reportPin';

export const AuthContext = createContext(null);

// Key to store user profile locally on the device
const USER_CACHE_KEY = 'aidepoint_user_cache';

export function AuthProvider({ children }) {

  //  STATE 
  //
  // authState drives the whole navigation tree:
  //   'BOOTING'    : app just opened, show splash screen
  //   'AUTH'       : no logged-in user, show SignIn / SignUp
  //   'CONSENT'    : user logged in but hasn't set preferences yet
  //   'PIN_SETUP'  : consent done but no device PIN set yet
  //   'APP'        : fully logged in and set up, show main screens
  //
  const [authState, setAuthState] = useState('BOOTING');
  const [user, setUser]           = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isOnline, setIsOnline]   = useState(true);


  const initialized = useRef(false);
  const suppressHydration = useRef(false);

  // Lets a caller specify which screen AuthNavigator should open on the
  // next time it mounts into the 'AUTH' state, instead of always falling
  // back to SignIn. Currently only used by account deletion (-> SignUp),
  // since signOut()/logout() should keep landing on SignIn as normal.
  // A ref, not state: this needs to be readable by AuthNavigator the
  // moment it mounts (during the same render pass authState flips to
  // 'AUTH'), before any effect could set state and cause a second render.
  const pendingAuthScreen = useRef(null);

  function consumePendingAuthScreen() {
    const screen = pendingAuthScreen.current;
    pendingAuthScreen.current = null;
    return screen;
  }

  //  STARTUP 
  useEffect(() => {
    let alive = true; // prevents state updates if component unmounts mid-way

    async function bootstrap() {
      try {
        // Ask Supabase: "do we have a saved session on this device?"
        // This works offline because the session is stored in AsyncStorage
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (__DEV__) console.log("Session present:", !!data.session);

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

    // This listener fires whenever auth changes (login, logout, token refresh,
    // password recovery). We skip it until bootstrap() finishes to avoid
    // duplicate calls.
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!initialized.current) return;

        // Covers PASSWORD_RECOVERY explicitly, and also any other event
        // that may fire while a password-recovery session is active
        // (see suppressHydration comment above). ForgotPassword.js owns
        // this flag end-to-end.
        if (event === 'PASSWORD_RECOVERY' || suppressHydration.current) return;
        if (event === 'INITIAL_SESSION') return;
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

  // Resolves whether a user should land on PIN_SETUP or APP, given that
  // consent is already known to be done. Centralised here so hydrateUser
  // and completeConsent can't drift out of sync on this check.
  async function resolvePostConsentState(uid) {
    try {
      const hasPin = await isPinCreated(uid);
      return hasPin ? 'APP' : 'PIN_SETUP';
    } catch (err) {
      console.error('AuthContext resolvePostConsentState:', err.message);
      // Fail toward PIN_SETUP rather than skipping it — worse to let
      // someone into the app with no PIN check than to ask again.
      return 'PIN_SETUP';
    }
  }

  //  HYDRATE 
  // Takes a Supabase session : fetches profile : updates state.
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
        if (!cached.consentDone) {
          setAuthState('CONSENT');
        } else {
          setAuthState(await resolvePostConsentState(uid));
        }
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
      avatarUrl:   profile?.avatar_url       || null,
      consentDone: profile?.consent_required === false,
    };

    // Save to device so it works offline next time
    await cacheUser(userData);

    setUser(userData);
    if (!userData.consentDone) {
      setAuthState('CONSENT');
    } else {
      setAuthState(await resolvePostConsentState(uid));
    }
  }

  function sanitizeDbError(error) {
    if (__DEV__) console.log('DB error:', error?.code, error?.message);

    switch (error?.code) {
      case '23505': // unique_violation
        return 'That value is already in use.';
      case '23503': // foreign_key_violation
      case '23502': // not_null_violation
      case '22P02': // invalid_text_representation (bad input type)
        return 'That value is not valid. Please check and try again.';
      case '42501': // insufficient_privilege (RLS denial)
        return "You don't have permission to make that change.";
      default:
        return 'Could not save your changes. Please try again.';
    }
  }

  //  CACHE HELPERS 
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

    function isNetworkError(error) {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('network request failed') ||
      message.includes('failed to fetch') ||
      message.includes('network error') ||
      error?.name === 'AuthRetryableFetchError'
    );
  }

  function looksLikeRawErrorBlob(message) {
    if (!message) return false;
    const trimmed = String(message).trim();
    // Raw Supabase error bodies come back as JSON text, e.g.
    // {"code":500,"error_code":"unexpected_failure","msg":"..."}.
    // A normal human-readable Auth error message never looks like this.
    return trimmed.startsWith('{') && trimmed.endsWith('}');
  }

  function sanitizeAuthError(error) {
    if (__DEV__) console.log('Auth error:', error?.status, error?.name, error?.message);

    if (isNetworkError(error)) {
      return "You're offline. Please check your internet connection and try again.";
    }

    const message = error?.message;

    if (looksLikeRawErrorBlob(message)) {
      // Something server-side failed in a way that returned its raw
      // error body as the message (e.g. a 500 / unexpected_failure)
      // instead of a human string -- never show that verbatim.
      return 'Something went wrong on our end. Please try again in a moment.';
    }

    if (typeof error?.status === 'number' && error.status >= 500) {
      return 'Something went wrong on our end. Please try again in a moment.';
    }

    return message || 'Something went wrong. Please try again.';
  }

  //  REGISTER 
  async function register({ name, email, password, hospitalLab }) {
    setAuthError(null);

    try {
      //  Offline check (from second version)
      if (!isOnline) {
        const msg =
          'No internet connection. You need internet to create an account.';
        setAuthError(msg);
        return { success: false, error: msg };
      }

      //  Supabase signup (merged both versions)
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name.trim(),
            hospital_lab: hospitalLab, // stored in auth metadata : used by trigger
          },
        },
      });

      //  Handle signup error
      if (error) {
        const friendly = sanitizeAuthError(error);
        setAuthError(friendly);
        return { success: false, error: friendly };
      }

      //  Email verification logic (cleaned + unified)
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

  //  VERIFY EMAIL OTP 
  // Called from the VerifyEmail screen with the 6-digit code the user types.
  // On success Supabase fires onAuthStateChange - hydrateUser runs -
  // authState moves to 'CONSENT', 'PIN_SETUP', or 'APP' automatically.
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

  //  RESEND VERIFICATION EMAIL 
  async function resendVerification(email) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

    //  LOGIN 
  async function login(email, password) {
    setAuthError(null);

    if (!isOnline) {
      const msg = 'No internet connection. Please connect to sign in.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        // Supabase's own "Confirm email" setting (if enabled project-side)
        // returns this as an ordinary error rather than a thrown
        // exception -- route it the same way as our own explicit check
        // below, rather than showing it as a generic auth failure.
        if (/email not confirmed/i.test(error.message || '')) {
          const msg = 'Please verify your email before signing in.';
          setAuthError(msg);
          return {
            success: false,
            error: msg,
            needsVerification: true,
            email: email.trim().toLowerCase(),
          };
        }

        const friendly = sanitizeAuthError(error);
        setAuthError(friendly);
        return { success: false, error: friendly };
      }

      // Defense in depth: don't rely solely on the Supabase project's
      // "Confirm email" setting to block an unverified account from
      // signing in -- confirm it explicitly here too. If this ever
      // returns a session for an unconfirmed user (misconfigured
      // setting, edge case, or stale test data), sign it back out
      // immediately rather than letting hydrateUser() treat it as a
      // real login.
      const emailConfirmedAt =
        data?.user?.email_confirmed_at ?? data?.session?.user?.email_confirmed_at;

      if (!emailConfirmedAt) {
        await supabase.auth.signOut();
        const msg = 'Please verify your email before signing in.';
        setAuthError(msg);
        return {
          success: false,
          error: msg,
          needsVerification: true,
          email: email.trim().toLowerCase(),
        };
      }

      // On success: onAuthStateChange listener fires -> hydrateUser runs
      // -> authState changes to 'CONSENT', 'PIN_SETUP', or 'APP'.
      return { success: true };
    } catch (err) {
      const friendly = sanitizeAuthError(err);
      setAuthError(friendly);
      return { success: false, error: friendly };
    }
  }
  
  async function completeConsent(storeImages) {
    if (!user) return { success: false, error: 'Not logged in' };

    const updated = { ...user, storeImages, consentDone: true };

    if (!isOnline) {
      await cacheUser({ ...updated, consentPending: true });
      setUser(updated);
      setAuthState(await resolvePostConsentState(user.id));
      return { success: true };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ store_images: storeImages, consent_required: false })
      .eq('id', user.id);

    if (error) return { success: false, error: sanitizeDbError(error) };

    await cacheUser(updated);
    setUser(updated);
    setAuthState(await resolvePostConsentState(user.id));
    return { success: true };
  }

  //  PIN SETUP 
  // Called by PinSetup.js after it has already saved the PIN itself via
  // savePin() in utils/reportPin.js. This function only advances the
  // navigation state, it does not touch PIN storage, since that's owned
  // entirely by reportPin.js (single source of truth for both this screen
  // and the Reports-screen PIN re-entry flow).
  function completePinSetup() {
    setAuthState('APP');
  }

  //  UPDATE PROFILE 
  async function updateProfile(changes) {
    if (!user) return { success: false, error: 'Not logged in' };

    const dbChanges = {};
    if (changes.storeImages !== undefined) dbChanges.store_images = changes.storeImages;
    if (changes.hospitalLab !== undefined) dbChanges.hospital_lab = changes.hospitalLab;
    if (changes.name        !== undefined) dbChanges.name         = changes.name;
    if (changes.avatarUrl   !== undefined) dbChanges.avatar_url   = changes.avatarUrl;

    const updated = {
      ...user,
      ...(changes.storeImages !== undefined && { storeImages: changes.storeImages }),
      ...(changes.hospitalLab !== undefined && { hospitalLab: changes.hospitalLab }),
      ...(changes.name        !== undefined && { name:        changes.name }),
      ...(changes.avatarUrl   !== undefined && { avatarUrl:   changes.avatarUrl }),
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
        return { success: false, error: sanitizeDbError(error) };
      }
    }

    return { success: true };
  }

  //  LOGOUT 
  async function logout() {
    await supabase.auth.signOut();
    await clearUserCache();
    setUser(null);
    setAuthState('AUTH');
    setAuthError(null);
  }

  //  DELETE-ACCOUNT SIGN OUT 
  // Same teardown as logout(), except it tells AuthNavigator to open on
  // SignUp instead of SignIn once it mounts -- deleting an account isn't
  // the same as signing out of one, and "sign back in" doesn't make
  // sense when there's no account left to sign into.
  async function deleteAccountSignOut() {
    pendingAuthScreen.current = 'SignUp';
    await supabase.auth.signOut();
    await clearUserCache();
    setUser(null);
    setAuthState('AUTH');
    setAuthError(null);
  }

  //  CLEAR ERROR 
  function clearError() {
    setAuthError(null);
  }

  //  PASSWORD RECOVERY GUARDS 
  // ForgotPassword.js calls beginPasswordRecovery() the moment
  // verifyOtp({ type: 'recovery' }) succeeds, and endPasswordRecovery()
  // right after it signs that recovery session back out. Between those
  // two calls, onAuthStateChange ignores every event so the recovery
  // session never gets mistaken for a real login and swaps the navigator
  // to the Home stack.
  function beginPasswordRecovery() {
    suppressHydration.current = true;
  }

  function endPasswordRecovery() {
    suppressHydration.current = false;
  }

  // PROVIDE 
  return (
        <AuthContext.Provider value={{
      authState,
      user,
      authError,
      isOnline,
      register,
      verifyEmail,
      resendVerification,
      updateProfile,
      login,
      logout,
      deleteAccountSignOut,
      completeConsent,
      completePinSetup,
      clearError,
      beginPasswordRecovery,
      endPasswordRecovery,
      consumePendingAuthScreen,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
