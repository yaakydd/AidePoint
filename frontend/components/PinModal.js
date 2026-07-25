// components/PinModal.js
//
// PIN entry / creation modal for the Reports screen.
// Handles both "create PIN" (first time) and "enter PIN" (subsequent visits).
// Supports biometric fallback where available.
//
// Usage in ReportScreen.js -- see that file for the full wiring, including
// the useFocusEffect that decides when to show this modal at all.

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  StyleSheet, Modal, Vibration, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  savePin, verifyPin,
  isBiometricAvailable, authenticateWithBiometrics,
} from '../utils/reportPin';
import { COLORS, FONTS, SPACING, RADIUS } from '../assets/theme';

const PIN_LENGTH = 4;
const BACKSPACE_KEY = 'backspace';
const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['',  '0', BACKSPACE_KEY],
];

export default function PinModal({ mode, userId, onSuccess }) {
  const [pin,        setPin]        = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step,       setStep]       = useState('enter');   // 'enter' | 'confirm'
  const [error,      setError]      = useState('');
  const [failCount,  setFailCount]  = useState(0);
  const [biometric,  setBiometric]  = useState(false);

  const shake = useRef(new Animated.Value(0)).current;

  const isCreate  = mode === 'create';
  const activePin = step === 'confirm' ? confirmPin : pin;

  useEffect(() => {
    isBiometricAvailable().then(setBiometric);
  }, []);

  const shakeAndError = (message) => {
    Vibration.vibrate(Platform.OS === 'android' ? [0, 80, 80, 80] : 400);
    setError(message);
    Animated.sequence([
      Animated.timing(shake, { toValue: 12,  duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8,   duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (isCreate) {
      if (step === 'enter') {
        // First entry -- move to confirm step
        setStep('confirm');
        setError('');
        return;
      }
      // Confirm step -- check they match
      if (confirmPin !== pin) {
        shakeAndError("PINs don't match. Try again.");
        setConfirmPin('');
        return;
      }
      await savePin(userId, pin);
      onSuccess();
    } else {
      // Verify mode
      const isCorrect = await verifyPin(userId, pin);
      if (isCorrect) {
        onSuccess();
      } else {
        const newFailCount = failCount + 1;
        setFailCount(newFailCount);
        shakeAndError(newFailCount >= 3 ? `Wrong PIN (${newFailCount} attempts)` : 'Wrong PIN');
        setPin('');
      }
    }
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (activePin.length === PIN_LENGTH) {
      const timer = setTimeout(handleSubmit, 120);
      return () => clearTimeout(timer);
    }
  }, [activePin]);

  const handleKey = (key) => {
    if (key === BACKSPACE_KEY) {
      if (step === 'confirm') setConfirmPin((p) => p.slice(0, -1));
      else                    setPin((p) => p.slice(0, -1));
      setError('');
      return;
    }
    if (key === '') return;
    const current = step === 'confirm' ? confirmPin : pin;
    if (current.length >= PIN_LENGTH) return;
    const next = current + key;
    if (step === 'confirm') setConfirmPin(next);
    else                    setPin(next);
    setError('');
  };

  const handleBiometric = async () => {
    const isSuccess = await authenticateWithBiometrics();
    if (isSuccess) onSuccess();
    else setError('Biometric authentication failed.');
  };

  const title = isCreate
    ? (step === 'enter' ? 'Create a PIN' : 'Confirm your PIN')
    : 'Enter PIN';

  const subtitle = isCreate
    ? (step === 'enter'
        ? 'Set a 4-digit PIN to protect patient reports'
        : 'Re-enter your PIN to confirm')
    : 'Enter your PIN to access patient reports';

  const displayPin = step === 'confirm' ? confirmPin : pin;

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <SafeAreaView style={styles.screen}>

        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="lock-outline" size={40} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, dotIndex) => (
            <View
              key={dotIndex}
              style={[styles.dot, dotIndex < displayPin.length && styles.dotFilled]}
            />
          ))}
        </Animated.View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.keypad}>
          {KEYS.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keyRow}>
              {row.map((key, keyIndex) => (
                <TouchableOpacity
                  key={keyIndex}
                  style={[styles.key, key === '' && styles.keyEmpty]}
                  onPress={() => handleKey(key)}
                  activeOpacity={0.65}
                  disabled={key === ''}
                >
                  {key === BACKSPACE_KEY ? (
                    <MaterialIcons name="backspace" size={22} color={COLORS.textPrimary} />
                  ) : (
                    <Text style={styles.keyText}>{key}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {biometric && !isCreate && (
          <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric}>
            <MaterialCommunityIcons name="fingerprint" size={28} color={COLORS.primary} />
            <Text style={styles.bioText}>Use biometrics instead</Text>
          </TouchableOpacity>
        )}

        {isCreate && (
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step === 'enter'   && styles.stepDotActive]} />
            <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
          </View>
        )}

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  iconWrap:     { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E0F7FA', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:        { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 8 },
  subtitle:     { fontSize: FONTS.sm, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40, marginBottom: 36, lineHeight: 20 },
  dotsRow:      { flexDirection: 'row', gap: 18, marginBottom: 12 },
  dot:          { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: 'transparent' },
  dotFilled:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  error:        { color: COLORS.danger, fontSize: FONTS.sm, marginBottom: 12, fontWeight: FONTS.semibold },
  keypad:       { marginTop: 24, gap: 12 },
  keyRow:       { flexDirection: 'row', gap: 20, justifyContent: 'center' },
  key:          { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  keyEmpty:     { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
  keyText:      { fontSize: FONTS.xl, fontWeight: FONTS.semibold, color: COLORS.textPrimary },
  bioBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
  bioText:      { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semibold },
  stepRow:      { flexDirection: 'row', gap: 8, marginTop: 32 },
  stepDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.divider },
  stepDotActive:{ backgroundColor: COLORS.primary },
});
