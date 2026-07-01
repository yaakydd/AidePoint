// utils/api.js
// Refined — keeps your existing logic, adds clearer error handling,
// proper timeout cleanup, and a connectivity pre-check.
// No on-device inference here (that comes later).

import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://your-app.railway.app';
const TIMEOUT_MS   = 35_000; // 35 s — generous for Railway cold-start + 2G upload

// ── Auth ─────────────────────────────────────────────────────────────────────
async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Your session has expired. Please log in again.');
  }
  return session.access_token;
}

// ── Connectivity pre-check ────────────────────────────────────────────────────
// Fails fast with a clear message instead of letting the request hang.
async function assertOnline() {
  const state = await NetInfo.fetch();
  if (!state.isConnected || !state.isInternetReachable) {
    throw new Error('No internet connection. Please check your network and try again.');
  }
}

// ── analyzeBloodSmear ─────────────────────────────────────────────────────────
export async function analyzeBloodSmear(imageUri) {
  await assertOnline();

  const token = await getAuthToken();

  const ext      = imageUri.split('.').pop().split('?')[0].toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri:  imageUri,
    name: `blood_smear.${ext}`,
    type: mimeType,
  });

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
        signal:  controller.signal,
      });

      clearTimeout(timeoutId);

      // Try to parse JSON body for all status codes (error detail lives here)
      let json = null;
      try { json = await response.json(); } catch {}

      if (!response.ok) {
        const detail = json?.detail ?? null;
        switch (response.status) {
          case 401: throw new Error('Your session has expired. Please log in again.');
          case 413: throw new Error('Image file is too large. Please use a smaller photo.');
          case 415: throw new Error('Only JPEG or PNG images are accepted.');
          case 422: throw new Error('The image could not be read. Please try a different photo.');
          case 503: throw new Error('Analysis server is starting up. Please wait 10 seconds and try again.');
          default:  throw new Error(detail ?? `Analysis failed (server error ${response.status}).`);
        }
      }

      return json;

    } catch (err) {
      clearTimeout(timeoutId); // safety cleanup

      // Timeout
      if (err.name === 'AbortError') {
        throw new Error('Analysis timed out. This can happen on slow connections — please try again.');
      }

      // Non-retryable errors (client errors, session issues)
      const msg = err.message ?? '';
      const isClientError =
        msg.includes('session has expired') ||
        msg.includes('too large') ||
        msg.includes('Only JPEG') ||
        msg.includes('could not be read');
      if (isClientError) throw err;

      lastError = err;

      // Retry once after a short pause
      if (attempt === 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  throw lastError ?? new Error('Could not reach the analysis server. Please check your connection.');
}

// ── Health check ──────────────────────────────────────────────────────────────
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 8000);
    const resp       = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return resp.ok;
  } catch {
    return false;
  }
}
