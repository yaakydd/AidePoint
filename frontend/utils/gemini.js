import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const AIDEBOT_ENDPOINT = `${API_BASE_URL}/aidebot/chat`;

const MAX_HISTORY_MESSAGES = 10;

// How long to wait before giving up on a single hung request attempt.
const REQUEST_TIMEOUT_MS = 30000;

// NEW: retry config. Transient failures (network blip, cold-start 5xx)
// get one retry with a short backoff before giving up -- this is what
// was previously surfacing as "AideBot couldn't be reached" for requests
// that would have succeeded on a second try.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Your session has expired. Please log in again.');
  }
  return session.access_token;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// NEW: wraps fetch with a timeout AND a retry-with-backoff. Retries on
// network errors and 5xx responses (backend/cold-start failures) but
// never on 4xx (client errors -- retrying those would just fail again).
// Each attempt gets its own fresh timeout budget.
async function fetchWithRetry(url, options, retriesLeft = MAX_RETRIES) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: abortController.signal });

    if (!response.ok && response.status >= 500 && retriesLeft > 0) {
      await sleep(RETRY_DELAY_MS);
      return fetchWithRetry(url, options, retriesLeft - 1);
    }

    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      if (retriesLeft > 0) {
        await sleep(RETRY_DELAY_MS);
        return fetchWithRetry(url, options, retriesLeft - 1);
      }
      throw new Error('AideBot took too long to respond. Please try again.');
    }
    if (retriesLeft > 0) {
      await sleep(RETRY_DELAY_MS);
      return fetchWithRetry(url, options, retriesLeft - 1);
    }
    throw new Error(`Could not reach AideBot: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * @param {Array<{type: 'user'|'bot', text: string}>} history  conversation so far, oldest first
 * @param {string|null} predictionId  optional prediction_id to ground the reply in a specific report
 * @returns {Promise<string>} the model's reply text
 */
export async function sendToGemini(history, predictionId = null) {
  if (!API_BASE_URL) {
    throw new Error(
      'Missing EXPO_PUBLIC_API_URL. Add it to your .env file and restart the dev server.'
    );
  }

  const token = await getAuthToken();

  const trimmedHistory = history
    .filter(m => m.text && m.text !== '...')
    .slice(-MAX_HISTORY_MESSAGES)
    .map(m => ({
      role: m.type === 'bot' ? 'model' : 'user',
      text: m.text,
    }));

  const response = await fetchWithRetry(AIDEBOT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      history: trimmedHistory,
      prediction_id: predictionId,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      let body = null;
      try { body = await response.json(); } catch {}
      const limitError = new Error(
        (typeof body?.detail === 'string' ? body.detail : null)
          ?? "You've reached your daily AideBot message limit."
      );
      limitError.isChatLimitError = true;
      throw limitError;
    }
    const errBody = await response.text().catch(() => '');
    throw new Error(`AideBot request failed (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const reply = data?.reply;
  if (!reply) {
    throw new Error('AideBot returned no usable response.');
  }
  return reply.trim();
      }
