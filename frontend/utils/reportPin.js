// utils/reportPin.js
//
// Manages the 4-digit PIN that protects the Reports screen.
// Uses expo-secure-store so the PIN is stored in the device keychain
// (encrypted at rest, not readable by other apps).
//
// Install: npx expo install expo-secure-store expo-local-authentication
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
//      → PIN saved to secure store
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

import * as SecureStore          from 'expo-secure-store';
import * as LocalAuthentication  from 'expo-local-authentication';

const PIN_KEY        = 'aidepoint:report_pin_v1';
const PIN_SET_KEY    = 'aidepoint:report_pin_created';
const LOCK_AFTER_MS  = 60 * 1000; // lock after 60 s in background

// ── Storage ──────────────────────────────────────────────────────────────────

export async function isPinCreated() {
  const val = await SecureStore.getItemAsync(PIN_SET_KEY);
  return val === 'true';
}

export async function savePin(pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits.');
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await SecureStore.setItemAsync(PIN_SET_KEY, 'true');
}

export async function verifyPin(input) {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored !== null && stored === input;
}

export async function clearPin() {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await SecureStore.deleteItemAsync(PIN_SET_KEY);
}

// ── Biometrics ───────────────────────────────────────────────────────────────

export async function isBiometricAvailable() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled   = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function authenticateWithBiometrics() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage:       'Verify your identity to access patient reports',
    fallbackLabel:       'Use PIN instead',
    cancelLabel:         'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}

// ── Session timer ─────────────────────────────────────────────────────────────
// Call startSession() when the user unlocks Reports.
// Call isSessionExpired() when the app resumes — if true, show PIN again.

let _sessionStartedAt = null;

export function startSession() {
  _sessionStartedAt = Date.now();
}

export function isSessionExpired() {
  if (_sessionStartedAt === null) return true;
  return Date.now() - _sessionStartedAt > LOCK_AFTER_MS;
}

export function endSession() {
  _sessionStartedAt = null;
}
