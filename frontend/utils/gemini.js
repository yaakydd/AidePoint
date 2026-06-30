// utils/gemini.js

/**
 * Thin wrapper around the Gemini API (generateContent) for AideBot.
 *
 * Requires EXPO_PUBLIC_GEMINI_API_KEY to be set (Expo SDK 54 inlines any
 * env var prefixed with EXPO_PUBLIC_ at build time — no extra config
 * needed). Put it in a .env file at the project root:
 *
 *   EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
 *
 * Never commit the real key — keep .env in .gitignore and set the
 * production value in your EAS / build environment instead.
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_INSTRUCTION = `You are AideBot, the in-app assistant for AidePoint, an anaemia-detection
tool used by lab technicians in Ghana. You help interpret blood smear /
CBC results, and explain anaemia types (sickle cell, iron deficiency,
malaria-related, thalassemia, pernicious, megaloblastic, aplastic,
haemolytic) in clear clinical language. You are a support tool, not a
diagnostic authority — always note that a qualified physician should
confirm any diagnosis or treatment decision. Keep answers concise and
practical for someone working at a lab bench.`;

/**
 * @param {Array<{type: 'user'|'bot', text: string}>} history  conversation so far, oldest first
 * @returns {Promise<string>} the model's reply text
 */
export async function sendToGemini(history) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to your .env file and restart the dev server.'
    );
  }

  const contents = history
    .filter(m => m.text && m.text !== '...')
    .map(m => ({
      role: m.type === 'bot' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 512,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Gemini request failed (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!reply) {
    throw new Error('Gemini returned no usable response.');
  }

  return reply.trim();
}