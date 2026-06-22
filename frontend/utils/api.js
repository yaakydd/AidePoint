// utils/api.js
// Single source of truth for all Railway backend communication.
// No screen imports fetch() directly — everything goes through here.

import { supabase } from './supabase';

// Set your Railway URL here after deploying.
// For local testing replace with: http://<your-local-ip>:8000
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://your-app.railway.app';

const TIMEOUT_MS = 35_000; // 35 s — first cold-start on Railway free tier is slow

/**
 * Gets the current Supabase JWT.
 * Throws a user-friendly error if the session is gone.
 */
async function getAuthToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Your session has expired. Please log in again.');
  }
  return session.access_token;
}

/**
 * Sends a blood smear image to the Railway /predict endpoint.
 *
 * @param {string} imageUri  Local file URI from camera or document picker
 * @returns {Promise<object>} Full clinical result from the AI model
 *
 * Non-functional requirements:
 *   - 35 s AbortController timeout (no infinite spinner)
 *   - Retries ONCE on network failure (not on 4xx user errors)
 *   - All errors return plain English strings safe to show in Alert
 *   - Auth token attached automatically — screens never touch tokens
 */
export async function analyzeBloodSmear(imageUri) {
  const token = await getAuthToken();

  // Determine file extension for correct MIME type
  const ext      = imageUri.split('.').pop().toLowerCase();
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
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT manually set Content-Type for FormData —
          // fetch sets it automatically with the correct boundary
        },
        body:   formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let json;
      try {
        json = await response.json();
      } catch {
        throw new Error('Server returned an unreadable response. Please try again.');
      }

      if (!response.ok) {
        // 401 — session expired on server side
        if (response.status === 401) {
          throw new Error('Your session has expired. Please log in again.');
        }
        // 413 — image too large
        if (response.status === 413) {
          throw new Error('Image is too large. Please use a smaller photo.');
        }
        // 415 — wrong file type
        if (response.status === 415) {
          throw new Error('Only JPEG or PNG images are supported.');
        }
        // 503 — model not ready (Railway cold start)
        if (response.status === 503) {
          throw new Error('The analysis server is starting up. Please try again in 10 seconds.');
        }
        // Everything else
        throw new Error(json?.detail ?? `Analysis failed (error ${response.status}).`);
      }

      // Success
      return json;

    } catch (err) {
      lastError = err;

      // Timeout — no retry
      if (err.name === 'AbortError') {
        throw new Error(
          'Analysis timed out. Please check your connection and try again.'
        );
      }

      // User/input errors (4xx) — no retry
      const msg = err.message ?? '';
      if (
        msg.includes('session has expired') ||
        msg.includes('too large') ||
        msg.includes('Only JPEG') ||
        msg.includes('error 4')
      ) {
        throw err;
      }

      // Network failure on first attempt — wait 1.5 s then retry
      if (attempt === 1) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }

      // Both attempts failed
      throw new Error(
        'Could not reach the analysis server. Please check your internet connection.'
      );
    }
  }

  throw lastError;
}

/**
 * Health check — useful for testing connectivity before letting user scan.
 * Returns true if backend is up, false otherwise.
 */
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return resp.ok;
  } catch {
    return false;
  }
}
