import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../utils/supabase";

export const AuthContext = createContext(null);

// ─────────────────────────────
// KEYS
// ─────────────────────────────
const KEYS = {
  HAS_LAUNCHED: "aidepoint_has_launched",
};

// ─────────────────────────────
// CONTEXT
// ─────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  const initialized = useRef(false);

  // ───────────────── BOOTSTRAP ─────────────────
  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!alive) return;

      if (session?.user) {
        await hydrate(session);
      } else {
        setUser(null);
        setNeedsConsent(false);
      }

      setIsBooting(false);
      initialized.current = true;
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!initialized.current) return;

        if (session?.user) {
          await hydrate(session);
        } else {
          setUser(null);
          setNeedsConsent(false);
        }
      }
    );

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // ───────────────── HYDRATE USER ─────────────────
  async function hydrate(session) {
    const uid = session.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    setUser({
      id: uid,
      email: session.user.email,
      name: profile?.name || "Unknown",
      role: profile?.role || "lab_technician",
      storeImages: profile?.store_images ?? false,
      token: session.access_token,
    });

    // 🔥 CONSENT IS DATABASE-DRIVEN
    setNeedsConsent(profile?.consent_required === true);
  }

  // ───────────────── AUTH ─────────────────
  async function register({ name, email, password }) {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          role: "lab_technician",
        },
      },
    });

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      needsVerification: true,
    };
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) return { success: false, error: error.message };

    return { success: true };
  }

  // ───────────────── CONSENT (FINAL STEP) ─────────────────
  async function completeConsent(storeImages) {
    if (!user) return { success: false };

    await supabase
      .from("profiles")
      .update({
        store_images: storeImages,
        consent_required: false,
      })
      .eq("id", user.id);

    setNeedsConsent(false);

    return { success: true };
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setNeedsConsent(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        needsConsent,
        isBooting,

        register,
        login,
        logout,

        completeConsent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);