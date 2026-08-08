// utils/api.js
//
// Talks to the backend running locally during development
// (uvicorn main:app --reload), and later to the deployed
// Hugging Face Spaces backend once that's live.
//
// EXPO_PUBLIC_API_URL in .env controls which one it hits.

import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const TIMEOUT_MS = 35000;

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

export async function analyzeBloodSmear(imageUri, patientSampleId) {
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

  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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

    if (err.name === 'AbortError') {
      throw new Error('Analysis timed out. This can happen on a slow connection — try again.');
    }
    if (err.message === 'Network request failed') {
      throw new Error(
        `Could not reach the backend at ${API_BASE_URL}. ` +
        `Make sure the server is running and reachable from this device.`
      );
    }

    throw err;
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