import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  StyleSheet, Vibration, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { savePin } from '../utils/reportPin';
import { COLORS, FONTS, SPACING, RADIUS, scale, vScale } from '../assets/theme';

const PIN_LENGTH = 4;
const BACKSPACE_KEY = 'backspace';
const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['',  '0', BACKSPACE_KEY],
];

const PinSetup = () => {
  const { user, completePinSetup } = useAuth();

  const [pin,        setPin]        = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step,       setStep]       = useState('enter'); // 'enter' | 'confirm'
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);

  const shake = useRef(new Animated.Value(0)).current;

  const activePin = step === 'confirm' ? confirmPin : pin;

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
    if (step === 'enter') {
      setStep('confirm');
      setError('');
      return;
    }

    // Confirm step , check the retype matches
    if (confirmPin !== pin) {
      shakeAndError("PINs don't match. Try again.");
      setConfirmPin('');
      return;
    }

    setSaving(true);
    try {
      await savePin(user.id, pin);
      completePinSetup();
    } catch (err) {
      shakeAndError(err.message ?? 'Could not save your PIN. Please try again.');
      setConfirmPin('');
    } finally {
      setSaving(false);
    }
  };

  // Auto-submit once 4 digits are entered, same UX as PinModal.js
  useEffect(() => {
    if (activePin.length === PIN_LENGTH && !saving) {
      const timer = setTimeout(handleSubmit, 120);
      return () => clearTimeout(timer);
    }
  }, [activePin]);

  const handleKey = (key) => {
    if (saving) return;
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

  const handleBack = () => {
    if (step !== 'confirm' || saving) return;
    setStep('enter');
    setConfirmPin('');
    setError('');
  };

  const title = step === 'enter' ? 'Create a PIN' : 'Confirm your PIN';
  const subtitle = step === 'enter'
    ? 'Set a 4-digit PIN to protect AidePoint'
    : 'Re-enter your PIN to confirm';

  const displayPin = step === 'confirm' ? confirmPin : pin;

  return (
    <SafeAreaView style={styles.safe}>
      {step === 'confirm' && (
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="shield-key-outline" size={scale(32)} color={COLORS.white} />
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
                disabled={key === '' || saving}
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

      <View style={styles.stepRow}>
        <View style={[styles.stepDot, step === 'enter'   && styles.stepDotActive]} />
        <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
      </View>
    </SafeAreaView>
  );
};

export default PinSetup;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: SPACING.xl,
    left: SPACING.lg,
    zIndex: 1,
  },

  header: { 
    alignItems: 'center', 
    marginBottom: SPACING['2xl'] 
  },
  iconWrap: {
    width: scale(64), 
    height: scale(64), 
    borderRadius: scale(32),
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: { 
    fontSize: FONTS['2xl'], 
    fontWeight: FONTS.bold, 
    color: COLORS.white, 
    marginBottom: 6 },
  subtitle: { 
    fontSize: FONTS.sm, 
    color: 'rgba(255,255,255,0.85)', 
    textAlign: 'center', 
    paddingHorizontal: SPACING['2xl'] 
  },

  dotsRow: { 
    flexDirection: 'row', 
    gap: SPACING.lg, 
    marginBottom: SPACING.sm 
  },
  dot: {
    width: scale(14), 
    height: scale(14), 
    borderRadius: scale(7),
    borderWidth: 2, 
    borderColor: COLORS.white, 
    backgroundColor: 'transparent',
  },
  dotFilled: { 
    backgroundColor: COLORS.white 
  },

  errorSlot: { 
    height: vScale(28), 
    justifyContent: 'center' 
  },
  error: { 
    color: COLORS.white, 
    fontSize: FONTS.sm, 
    fontWeight: FONTS.semibold 
  },

  keypad: { 
    marginTop: SPACING.lg, 
    gap: SPACING.md 
  },
  keyRow: { 
    flexDirection: 'row', 
    gap: SPACING.xl, justifyContent: 'center' },
  key: {
    width: scale(72), 
    height: scale(72),
    alignItems: 'center', 
    justifyContent: 'center',
  },
  keyText: { 
    fontSize: FONTS.xl, 
    fontWeight: FONTS.semibold, 
    color: COLORS.white 
  },

  stepRow: { 
    flexDirection: 'row', 
    gap: SPACING.sm, 
    marginTop: SPACING['2xl'] 
  },
  stepDot: { 
    width: scale(8), 
    height: scale(8), 
    borderRadius: scale(4), 
    backgroundColor: 'rgba(255,255,255,0.35)' 
  },
  stepDotActive: { 
    backgroundColor: COLORS.white 
  },
});
