// utils/api.js
//
// Talks to the backend running locally during development
// (uvicorn main:app --reload), and later to the deployed
// Hugging Face Spaces backend once that's live.
//
// EXPO_PUBLIC_API_URL in .env controls which one it hits.

import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// 35s was too tight even for a healthy local backend on a real device --
// the first request after `uvicorn --reload` restarts, or the first
// request after the model is lazy-loaded, can take a while on its own
// before any network latency is added on top. Bumped to 60s. If you're
// still hitting timeouts at 60s, the model call itself is the bottleneck,
// not this constant -- check the timing logs below.
const TIMEOUT_MS = 60000;

// Separate, short timeout just for the lightweight warmup ping.
const WARMUP_TIMEOUT_MS = 8000;

if (!API_BASE_URL) {
  console.warn(
    'EXPO_PUBLIC_API_URL is not set in .env — API calls will fail. ' +
    'Set it to your backend URL (e.g. http://localhost:8000) and restart Expo with -c.'
  );
}

async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Your session has expired. Please log in again.');
  }
  return session.access_token;
}

export async function analyzeBloodSmear(imageUri, patientSampleId, temperature, bloodPressure) {
  formData.append('patient_sample_id', String(patientSampleId));
  if (temperature) formData.append('temperature', temperature);
  if (bloodPressure) formData.append('blood_pressure', bloodPressure);
  if (!patientSampleId) {
    throw new Error('Missing patient reference — cannot analyze without a linked patient record.');
  }
  if (!API_BASE_URL) {
    throw new Error('Backend URL is not configured. Check EXPO_PUBLIC_API_URL in .env.');
  }

  const token = await getAuthToken();

  const ext = imageUri.split('.').pop().split('?')[0].toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: `blood_smear.${ext}`,
    type: mimeType,
  });
  formData.append('patient_sample_id', String(patientSampleId));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Timing so you can see in the logs whether it's the request itself
  // that's slow, vs. something upstream (auth, form building, etc).
  const startedAt = Date.now();
  console.log(`>>> /predict request starting (timeout ${TIMEOUT_MS}ms)`);

  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const elapsedMs = Date.now() - startedAt;
    console.log(`>>> /predict responded in ${elapsedMs}ms with status ${response.status}`);

    let json = null;
    try { json = await response.json(); } catch {}
    console.log('/predict response:', response.status, JSON.stringify(json));

    if (!response.ok) {
      const detail = json?.detail;

      if (response.status === 400) throw new Error(detail ?? 'Missing required scan information.');
      if (response.status === 401) throw new Error('Your session has expired. Please log in again.');
      if (response.status === 413) throw new Error('Image file is too large. Please use a smaller photo.');
      if (response.status === 415) throw new Error('Only JPEG or PNG images are accepted.');
      if (response.status === 503) throw new Error('Analysis server is starting up. Wait a few seconds and try again.');

      if (response.status === 422) {
        if (detail && typeof detail === 'object') {
          const qualityError = new Error(
            detail.message ?? 'The image could not be analyzed. Please try a different photo.'
          );
          qualityError.imageQuality = detail.image_quality ?? null;
          qualityError.isImageQualityError = true;
          throw qualityError;
        }
        throw new Error(detail ?? 'The image could not be read. Please try a different photo.');
      }

      const detailMessage = detail && typeof detail === 'object'
        ? (detail.message ?? JSON.stringify(detail))
        : detail;
      throw new Error(detailMessage ?? `Analysis failed (server error ${response.status}).`);
    }

    return json;

  } catch (err) {
    clearTimeout(timeoutId);
    const elapsedMs = Date.now() - startedAt;

    if (err.name === 'AbortError') {
      console.error(`>>> /predict aborted after ${elapsedMs}ms (timeout was ${TIMEOUT_MS}ms)`);
      throw new Error(
        `Analysis timed out after ${Math.round(TIMEOUT_MS / 1000)}s. ` +
        `The server may still be processing — check your backend logs, or try again.`
      );
    }
    if (err.message === 'Network request failed') {
      console.error(`>>> /predict network failure after ${elapsedMs}ms`);
      throw new Error(
        `Could not reach the backend at ${API_BASE_URL}. ` +
        `Make sure your phone and computer are on the same wifi network, the server is running, ` +
        `and Windows/macOS firewall isn't blocking port 8000.`
      );
    }

    throw err;
  }
}

// Call this when the Scan screen mounts (or as soon as an image is picked)
// so a slow first-request model load happens in the background while the
// user is still filling in patient details, instead of eating into the
// 60s timeout budget once they tap "Start Analysis".
export async function warmupBackend() {
  if (!API_BASE_URL) return false;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const resp = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    console.log(`>>> backend warmup ${resp.ok ? 'succeeded' : 'failed'} in ${Date.now() - startedAt}ms`);
    return resp.ok;
  } catch (err) {
    clearTimeout(timeoutId);
    console.log(`>>> backend warmup errored after ${Date.now() - startedAt}ms:`, err.message);
    return false;
  }
}

export async function checkBackendHealth() {
  if (!API_BASE_URL) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return resp.ok;
  } catch {
    return false;
  }
}


export async function updatePredictionNotes(predictionId, notes) {
  if (!API_BASE_URL) {
    throw new Error('Backend URL is not configured. Check EXPO_PUBLIC_API_URL in .env.');
  }
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}/predict/${predictionId}/notes`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.detail ?? `Failed to save notes (server error ${response.status}).`);
  }

  return response.json();
}