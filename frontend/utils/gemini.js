import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const AIDEBOT_ENDPOINT = `${API_BASE_URL}/aidebot/chat`;

const MAX_HISTORY_MESSAGES = 10;

// How long to wait before giving up on a hung request. Without this, a
// dropped connection or a stalled backend just spins the "..." loading
// state forever with no way for the UI to recover or tell the user
// something went wrong.
const REQUEST_TIMEOUT_MS = 30000;

async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Your session has expired. Please log in again.');
  }
  return session.access_token;
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

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(AIDEBOT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        history: trimmedHistory,
        prediction_id: predictionId,
      }),
      signal: abortController.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AideBot took too long to respond. Please try again.');
    }
    throw new Error(`Could not reach AideBot: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 429) {
      // Authoritative server-side daily limit (aidebot.py's
      // _check_and_record_rate_limit, backed by the aidebot_messages
      // table). The client-side counter in chatstorage.js is a
      // same-numbers UX shortcut and can drift (new device, reinstall,
      // another session) -- this is the real limit.
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