// utils/api.js
// Talks to the Railway backend. App's online-only now so there's no
// connectivity pre-check or offline error type anymore — if the network's
// bad the fetch just fails and we surface something useful about it.

import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://your-app.railway.app';
const TIMEOUT_MS = 35000; // Railway cold start + upload on a slow connection can eat a few seconds

async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Your session has expired. Please log in again.');
  }
  return session.access_token;
}

export async function analyzeBloodSmear(imageUri, patientSampleId) {
  // patientSampleId ties this prediction back to the patients row Scan.js
  // already creates in Supabase before calling this function -- the
  // backend's /predict now requires it to build an audit trail record
  // (see audit_trail.py), so a missing value here would fail every scan
  // with a 400 rather than silently succeeding without an audit trail.
  if (!patientSampleId) {
    throw new Error('Missing patient reference — cannot analyze without a linked patient record.');
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

  let lastError = null;

  // one retry on transient failures — a cold Railway instance or a dropped
  // request shouldn't make the tech redo the whole form
  for (let attempt = 1; attempt <= 2; attempt++) {
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

      if (!response.ok) {
        const detail = json?.detail;

        if (response.status === 400) throw new Error(detail ?? 'Missing required scan information.');
        if (response.status === 401) throw new Error('Your session has expired. Please log in again.');
        if (response.status === 413) throw new Error('Image file is too large. Please use a smaller photo.');
        if (response.status === 415) throw new Error('Only JPEG or PNG images are accepted.');
        if (response.status === 503) throw new Error('Analysis server is starting up. Wait a few seconds and try again.');

        if (response.status === 422) {
          // detail can now be an object ({ error, message, image_quality })
          // for the "image unusable" case, or a plain string for other
          // validation failures -- handle both instead of assuming one shape.
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

      // don't bother retrying stuff that's just going to fail the same way twice
      const msg = err.message ?? '';
      const isClientError =
        msg.includes('session has expired') ||
        msg.includes('too large') ||
        msg.includes('Only JPEG') ||
        msg.includes('could not be read') ||
        msg.includes('Missing patient reference') ||
        msg.includes('Missing required scan information');

      if (isClientError) throw err;

      lastError = err;
      if (attempt === 1) await new Promise(r => setTimeout(r, 1500));
    }
  }

  throw lastError ?? new Error('Could not reach the analysis server. Check your connection and try again.');
}

export async function checkBackendHealth() {
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