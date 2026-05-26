// src/utils/supabase.js
//
// The Supabase client. This is the single connection to your
// Supabase project. Import { supabase } wherever you need to
// talk to the database, auth, or storage.
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';



// YOUR SUPABASE CREDENTIALS 
// Find these in: Supabase Dashboard → Project Settings → API
//
// SUPABASE_URL      → "Project URL"        (looks like https://xxxx.supabase.co)
// SUPABASE_ANON_KEY → "anon public" key    (long string starting with "eyJ...")
//
//  Never share or commit these if using a .env file.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // AsyncStorage keeps the session on device so users stay logged in
    // across app restarts — they won't have to log in every time.
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    storage:          AsyncStorage,
    autoRefreshToken: true,   // automatically refreshes the JWT before it expires
    persistSession:   true,   // saves session to AsyncStorage
    detectSessionInUrl: false, // not needed in React Native (only for web)
  },

});
