// src/utils/supabase.js

import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import AsyncStorage from '@react-native-async-storage/async-storage';



// Environment Variables


const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;


// DEBUG (temporary)
console.log('SUPABASE URL:', SUPABASE_URL);
console.log('SUPABASE KEY EXISTS:', !!SUPABASE_ANON_KEY);



// Create Supabase Client


export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);