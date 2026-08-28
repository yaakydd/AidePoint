import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  StyleSheet, Modal, Vibration, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  savePin, verifyPin, isPinCreated,
  isBiometricAvailable, authenticateWithBiometrics,
} from '../utils/reportPin';
import { supabase } from '../utils/supabase';
import { COLORS, FONTS, SPACING, RADIUS, scale, vScale } from '../assets/theme';

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
        // First entry , move to confirm step
        setStep('confirm');
        setError('');
        return;
      }
      // Confirm step , check they match
      if (confirmPin !== pin) {
        shakeAndError("PINs don't match. Try again.");
        setConfirmPin('');
        return;
      }

      // Check before saving -- distinguishes a genuine reset (user already
      // had a PIN) from first-time creation, so only a reset notifies the
      // user. First-time setup via PinSetup.js's onboarding flow never
      // reaches this branch, but PinModal can also be used to (re)create a
      // PIN from the Reports screen, which is the actual reset path.
      const hadExistingPin = await isPinCreated(userId);

      await savePin(userId, pin);

      if (hadExistingPin) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Report PIN Reset',
          body: 'Your AidePoint report PIN was successfully changed. If you did not make this change, contact support immediately.',
        });
      }

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
      <SafeAreaView style={styles.safe}>

        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Image
              source={require('../assets/brand/icon-white.png')}
              style={{ width: scale(36), height: scale(36) }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, dotIndex) => (
            <View
              key={dotIndex}
              style={[styles.dot, dotIndex < displayPin.length && styles.dotFilled]}
            />
          ))}
        </Animated.View>

        <View style={styles.errorSlot}>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.keypad}>
          {KEYS.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keyRow}>
              {row.map((key, keyIndex) => (
                <TouchableOpacity
                  key={keyIndex}
                  style={styles.key}
                  onPress={() => handleKey(key)}
                  activeOpacity={0.6}
                  disabled={key === ''}
                >
                  {key === BACKSPACE_KEY ? (
                    <MaterialIcons name="backspace" size={22} color={COLORS.white} />
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
            <MaterialCommunityIcons name="fingerprint" size={26} color={COLORS.white} />
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

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: { alignItems: 'center', marginBottom: SPACING['2xl'] },
  iconWrap: {
    width: scale(64), height: scale(64), borderRadius: scale(32),
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: { fontSize: FONTS['2xl'], fontWeight: FONTS.bold, color: COLORS.white, marginBottom: 6 },
  subtitle: { fontSize: FONTS.md, color: 'rgba(255,255,255,0.85)', textAlign: 'center', paddingHorizontal: SPACING['2xl'] },

  dotsRow: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.sm },
  dot: {
    width: scale(14), height: scale(14), borderRadius: scale(7),
    borderWidth: 2, borderColor: COLORS.white, backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: COLORS.white },

  errorSlot: { height: vScale(28), justifyContent: 'center' },
  error: { color: COLORS.white, fontSize: FONTS.sm, fontWeight: FONTS.semibold },

  keypad: { marginTop: SPACING.lg, gap: SPACING.md },
  keyRow: { flexDirection: 'row', gap: SPACING.xl, justifyContent: 'center' },
  key: {
    width: scale(72), height: scale(72),
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: FONTS['3xl'], fontWeight: FONTS.semibold, color: COLORS.white },

  bioBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xl },
  bioText: { fontSize: FONTS.sm, color: COLORS.white, fontWeight: FONTS.semibold },

  stepRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING['2xl'] },
  stepDot: { width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: 'rgba(255,255,255,0.35)' },
  stepDotActive: { backgroundColor: COLORS.white },
});