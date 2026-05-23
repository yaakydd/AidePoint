// hooks/useGoogleSignIn.js
//
// Wraps expo-auth-session's Google provider.
// Use this hook in SignIn and SignUp screens — NOT directly in AuthContext,
// because expo-auth-session must be called as a hook inside a component.
//
// SETUP (do this once):
//   npx expo install expo-auth-session expo-web-browser expo-crypto
//   Then follow the Google Cloud Console steps in the README.
//
// USAGE:
//   const { promptAsync, isReady } = useGoogleSignIn();
//   <Button onPress={() => promptAsync()} disabled={!isReady} />

import { useEffect } from 'react';
import * as Google     from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';

// Required: tells Expo to close the browser tab and hand control back
// to the app after the OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

// ── Replace these with your actual client IDs from Google Cloud Console ──────
// Get them from: console.cloud.google.com → APIs & Services → Credentials
const GOOGLE_CLIENT_IDS = {
  androidClientId: '434527019636-5nhd58a8gq2hr5nvqkucsm6gsjme8blm.apps.googleusercontent.com',
  // iosClientId:     'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  // webClientId:     'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  // Uncomment this only when testing in Expo Go (not a standalone build):
  // expoClientId: 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
};

export function GoogleSignIn() {
  const { loginWithGoogle, setAuthError } = useAuth();

  // useAuthRequest returns:
  //   request    → the prepared OAuth request object (null until ready)
  //   response   → the result after the user interacts with the Google screen
  //   promptAsync→ the function to call to open the Google sign-in screen
  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CLIENT_IDS);

  useEffect(() => {
    if (response?.type === 'success') {
      // Google returned successfully. The id_token is what Supabase needs.
      const { id_token } = response.params;

      if (id_token) {
        loginWithGoogle(id_token);
        // loginWithGoogle() calls supabase.auth.signInWithIdToken.
        // onAuthStateChange fires → fetchAndSetUser → user is set.
        // AppNavigator handles the rest.
      } else {
        // This shouldn't happen but handle it gracefully.
        console.warn('useGoogleSignIn: response was success but id_token is missing', response);
      }

    } else if (response?.type === 'error') {
      console.warn('useGoogleSignIn: OAuth error', response.error);
    }
    // 'cancel' and 'dismiss' are silent (user closed the browser).
  }, [response]);

  return {
    // Call promptAsync() to open the Google sign-in screen.
    promptAsync,
    // isReady is false while expo-auth-session is setting up.
    // Disable your button until this is true.
    isReady: !!request,
  };
}