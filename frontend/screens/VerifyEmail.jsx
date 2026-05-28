import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../assets/theme';

const BOXES = 6;

export default function VerifyEmail() {
  const navigation   = useNavigation();
  const route        = useRoute();
  const email        = route.params?.email ?? '';

  const { verifyEmail, resendVerification, authError, clearError } = useAuth();

  const [digits, setDigits]     = useState(Array(BOXES).fill(''));
  const [loading, setLoading]   = useState(false);
  const [resending, setResend]  = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [error, setError]       = useState('');

  const refs = useRef([]);        // one ref per input box

  // ─── INPUT HANDLING ──────────────────────────────────────
  function handleChange(text, index) {
    // Handle paste: if user pastes all 6 digits into first box
    if (text.length === BOXES) {
      const pasted = text.replace(/\D/g, '').slice(0, BOXES).split('');
      const filled = [...Array(BOXES)].map((_, i) => pasted[i] ?? '');
      setDigits(filled);
      refs.current[BOXES - 1]?.focus();
      return;
    }

    const char = text.replace(/\D/g, '').slice(-1); // digits only, last char
    const next  = [...digits];
    next[index] = char;
    setDigits(next);
    setError('');
    clearError?.();

    if (char && index < BOXES - 1) {
      refs.current[index + 1]?.focus();   // jump to next box
    }
  }

  function handleKeyPress(e, index) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();   // jump back on delete
    }
  }

  // ─── VERIFY ──────────────────────────────────────────────
  async function handleVerify() {
    const token = digits.join('');
    if (token.length < BOXES) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyEmail(email, token);

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Invalid code. Please try again.');
      setDigits(Array(BOXES).fill(''));   // clear boxes on failure
      refs.current[0]?.focus();
    }
    // On success: AuthContext moves authState → 'CONSENT' or 'APP'
    // The root navigator handles the screen swap automatically.
  }

  // ─── RESEND ──────────────────────────────────────────────
  async function handleResend() {
    setResend(true);
    setResendMsg('');

    const result = await resendVerification(email);

    setResend(false);
    setResendMsg(
      result.success
        ? 'A new code has been sent to your email.'
        : result.error ?? 'Could not resend. Try again.'
    );
  }

  const token = digits.join('');
  const ready = token.length === BOXES && !loading;

  // ─── UI ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
      </TouchableOpacity>

      <View style={styles.container}>

        {/* ICON */}
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="email-check-outline" size={52} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.sub}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {/* OTP BOXES */}
        <View style={styles.boxRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={r => (refs.current[i] = r)}
              style={[
                styles.box,
                d ? styles.boxFilled : null,
                error ? styles.boxError : null,
              ]}
              value={d}
              onChangeText={t => handleChange(t, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={BOXES}        // allows paste on first box
              textAlign="center"
              autoFocus={i === 0}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* ERROR */}
        {(!!error || !!authError) && (
          <Text style={styles.err}>{error || authError}</Text>
        )}

        {/* RESEND MESSAGE */}
        {!!resendMsg && (
          <Text style={[
            styles.resendMsg,
            { color: resendMsg.includes('sent') ? 'green' : 'red' }
          ]}>
            {resendMsg}
          </Text>
        )}

        {/* VERIFY BUTTON */}
        <TouchableOpacity
          style={[styles.btn, !ready && { opacity: 0.5 }]}
          disabled={!ready}
          onPress={handleVerify}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Verify Email</Text>
          }
        </TouchableOpacity>

        {/* RESEND */}
        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={resending}
        >
          {resending
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={styles.resendText}>Didn't get a code? <Text style={styles.resendLink}>Resend</Text></Text>
          }
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#fff' },
  back:       { padding: 16 },
  container:  { flex: 1, paddingHorizontal: 28, alignItems: 'center', paddingTop: 20 },

  iconWrap:   { 
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },

  title:      { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 10 },

  sub:        { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emailText:  { fontWeight: '600', color: '#111' },

  boxRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },

  box: {
    width: 46, height: 56,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    backgroundColor: '#F9FAFB',
  },
  boxFilled:  { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  boxError:   { borderColor: '#EF4444' },

  err:        { color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  resendMsg:  { fontSize: 13, marginBottom: 12, textAlign: 'center' },

  btn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    padding: 15, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
  },
  btnText:    { color: '#fff', fontWeight: '600', fontSize: 16 },

  resendBtn:  { marginTop: 20, padding: 8 },
  resendText: { fontSize: 14, color: '#555' },
  resendLink: { color: COLORS.primary, fontWeight: '600' },
});