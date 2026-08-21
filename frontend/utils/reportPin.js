import * as SecureStore         from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_KEY_PREFIX     = 'aidepoint_report_pin_v1_';
const PIN_SET_KEY_PREFIX = 'aidepoint_report_pin_created_';
const LOCK_AFTER_MS      = 60 * 1000; // lock after 60 s in background



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

export const isBiometricAvailable = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
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
