import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSIONS_KEY_PREFIX = 'aidebot:sessions:';   // + userId
const USAGE_KEY_PREFIX    = 'aidebot:usage:';       // + userId + date

function sessionsKey(userId) {
  return `${SESSIONS_KEY_PREFIX}${userId ?? 'guest'}`;
}

function usageKey(userId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${USAGE_KEY_PREFIX}${userId ?? 'guest'}:${today}`;
}

//  Sessions 

export async function loadSessions(userId) {
  try {
    const raw = await AsyncStorage.getItem(sessionsKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('chatStorage.loadSessions:', err.message);
    return [];
  }
}

export async function saveSessions(userId, sessions) {
  try {
    await AsyncStorage.setItem(sessionsKey(userId), JSON.stringify(sessions));
  } catch (err) {
    console.error('chatStorage.saveSessions:', err.message);
  }
}

export async function clearAllSessions(userId) {
  try {
    await AsyncStorage.removeItem(sessionsKey(userId));
  } catch (err) {
    console.error('chatStorage.clearAllSessions:', err.message);
  }
}

/** Derives a short title from the first user message in a session. */
export function deriveSessionTitle(messages) {
  const firstUserMsg = messages.find(m => m.type === 'user');
  if (!firstUserMsg) return 'New Chat';
  const text = firstUserMsg.text.trim();
  return text.length > 32 ? `${text.slice(0, 32)}…` : text;
}

//  Daily usage / subscription limits 

export async function getTodayUsageCount(userId) {
  try {
    const raw = await AsyncStorage.getItem(usageKey(userId));
    return raw ? parseInt(raw, 10) : 0;
  } catch (err) {
    console.error('chatStorage.getTodayUsageCount:', err.message);
    return 0;
  }
}

export async function incrementTodayUsage(userId) {
  try {
    const current = await getTodayUsageCount(userId);
    const next = current + 1;
    await AsyncStorage.setItem(usageKey(userId), String(next));
    return next;
  } catch (err) {
    console.error('chatStorage.incrementTodayUsage:', err.message);
    return 0;
  }
}