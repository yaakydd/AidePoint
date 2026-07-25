// utils/reportPin.js
//
// Manages the 4-digit PIN that protects the Reports screen.
// Uses expo-secure-store so the PIN is stored in the device keychain
// (encrypted at rest, not readable by other apps).
//
// Install: npx expo install expo-secure-store expo-local-authentication
//
// ── Why the PIN is scoped per user ID ─────────────────────────────────────────
// Lab devices are often shared between technicians. Storing the PIN under
// a single fixed key meant the first technician to ever set a PIN on a
// device effectively locked every other technician out of "create" mode
// forever -- the second technician to log in would be asked to enter the
// first technician's PIN instead of creating their own. Every storage key
// below is namespaced by the logged-in user's ID so each technician has
// their own independent PIN, even on a shared device.
//
// ── When is the PIN set? ──────────────────────────────────────────────────────
// System design choice: LAZY FIRST-ACCESS setup.
//
// Rationale:
//   - Setting a PIN during onboarding adds friction before the user has
//     seen any value from the app (they haven't done a scan yet).
//   - Setting it on first Reports access is contextually obvious:
//     "You're about to see patient data — please create a PIN."
//   - It also means PIN setup is tied to the moment they first have data
//     to protect, which makes the security prompt feel meaningful rather
//     than bureaucratic.
//
// Flow:
//   1. User taps Reports tab for the first time
//      → PinModal appears in "create" mode
//      → User sets 4-digit PIN, confirms it
//      → PIN saved to secure store, keyed to this user's ID
//      → Reports screen unlocks for this session
//
//   2. User returns to Reports (or app comes back from background)
//      → PinModal appears in "enter" mode
//      → Correct PIN → access granted for this session
//      → Wrong PIN → shake animation, counter shown after 3 fails
//
//   3. Optional biometric shortcut (FaceID / fingerprint)
//      → If device supports it, "Use biometrics" button appears
//      → On success → access granted without PIN entry
//
// ── Session lock behaviour ─────────────────────────────────────────────────────
// The PIN is re-required when:
//   - The app goes to background for > 60 seconds (configurable below)
//   - The user explicitly locks from Settings
// This balances security with usability in a busy lab setting.

import * as SecureStore         from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_KEY_PREFIX     = 'aidepoint:report_pin_v1:';
const PIN_SET_KEY_PREFIX = 'aidepoint:report_pin_created:';
const LOCK_AFTER_MS      = 60 * 1000; // lock after 60 s in background

// ── Storage ──────────────────────────────────────────────────────────────────

const getPinKey = (userId) => `${PIN_KEY_PREFIX}${userId}`;
const getPinSetKey = (userId) => `${PIN_SET_KEY_PREFIX}${userId}`;

export const isPinCreated = async (userId) => {
  const val = await SecureStore.getItemAsync(getPinSetKey(userId));
  return val === 'true';
};

export const savePin = async (userId, pin) => {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits.');
  await SecureStore.setItemAsync(getPinKey(userId), pin);
  await SecureStore.setItemAsync(getPinSetKey(userId), 'true');
};

export const verifyPin = async (userId, input) => {
  const stored = await SecureStore.getItemAsync(getPinKey(userId));
  return stored !== null && stored === input;
};

export const clearPin = async (userId) => {
  await SecureStore.deleteItemAsync(getPinKey(userId));
  await SecureStore.deleteItemAsync(getPinSetKey(userId));
};

// ── Biometrics ───────────────────────────────────────────────────────────────
// Biometrics are tied to the device, not a specific app user, so these
// stay unscoped -- there's only one fingerprint/face enrolled per device
// regardless of which technician is currently logged in.

export const isBiometricAvailable = async () => {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled   = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
};

export const authenticateWithBiometrics = async () => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage:         'Verify your identity to access patient reports',
    fallbackLabel:         'Use PIN instead',
    cancelLabel:           'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
};

// ── Session timer ─────────────────────────────────────────────────────────────
// Call startSession() when the user unlocks Reports.
// Call isSessionExpired() when the app resumes — if true, show PIN again.
// This is intentionally a single module-level timer, not per-user, since
// only one user is ever actively logged in and unlocked at a time.

let _sessionStartedAt = null;

export const startSession = () => {
  _sessionStartedAt = Date.now();
};

export const isSessionExpired = () => {
  if (_sessionStartedAt === null) return true;
  return Date.now() - _sessionStartedAt > LOCK_AFTER_MS;
};

export const endSession = () => {
  _sessionStartedAt = null;
};
