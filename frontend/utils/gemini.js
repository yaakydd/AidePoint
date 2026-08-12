// utils/gemini.js
/**
 * Thin wrapper around AideBot's chat endpoint.
 *
 * IMPORTANT: this no longer calls the Gemini API directly from the app.
 * Doing so required EXPO_PUBLIC_GEMINI_API_KEY, and any EXPO_PUBLIC_
 * env var is inlined into the JS bundle at build time -- meaning the
 * key would ship inside the compiled app binary, extractable by anyone
 * with the APK/IPA. For a clinical tool with real API billing behind
 * it, that's not an acceptable place to keep a secret.
 *
 * Instead, this calls a /aidebot/chat endpoint on the existing FastAPI
 * backend (the same service already running the ONNX model). The
 * backend holds GEMINI_API_KEY as a server-side secret, forwards the
 * conversation to Gemini, and returns just the reply text. This also
 * gives you one place to add auth checks (only logged-in lab techs can
 * use AideBot), rate limiting, and logging later, none of which is
 * possible when the client calls Gemini directly.
 *
 * AUTH: aidebot_chat is protected by verify_supabase_token on the
 * backend, same as /predict -- so every request here must carry the
 * current user's Supabase access token as a Bearer header, exactly
 * like analyzeBloodSmear does in utils/api.js. Without it, the backend
 * returns 401 Missing or malformed Authorization header.
 *
 * Requires EXPO_PUBLIC_API_BASE_URL to point at your FastAPI backend,
 * e.g. in a .env file at the project root:
 *
 *   EXPO_PUBLIC_API_BASE_URL=https://api.aidepoint.example.com
 *
 * See backend/routers/aidebot.py (or wherever you add it) for the
 * matching server-side endpoint -- it should own SYSTEM_INSTRUCTION,
 * the Gemini model name, and the actual generateContent call.
 */

import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const AIDEBOT_ENDPOINT = `${API_BASE_URL}/aidebot/chat`;

// Hard cap on how much conversation history gets sent per request.
// Without this, a long AideBot session sends the ENTIRE history every
// single turn -- token usage (and therefore latency and backend cost)
// grows unbounded the longer someone chats, even though only recent
// context actually matters for a follow-up question. 20 messages is
// generous for a lab-bench Q&A session while keeping each request small.
const MAX_HISTORY_MESSAGES = 20;

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
      'Missing EXPO_PUBLIC_API_BASE_URL. Add it to your .env file and restart the dev server.'
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