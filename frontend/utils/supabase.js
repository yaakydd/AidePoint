import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// ─── GUARD ───────────────────────────────────────────────────────────────────
// If either variable is missing, crash loudly during development instead of
// getting a confusing "Invalid API key" error deep inside a Supabase call.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[AidePoint] Supabase env vars are missing.\n' +
    'Make sure your .env file is in the project ROOT and contains:\n' +
    '  EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n' +
    '  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...\n\n' +
    'Then restart Expo with:  npx expo start --clear'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:          AsyncStorage,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
});