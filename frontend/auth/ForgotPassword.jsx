import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { supabase }  from '../utils/supabase';
import { COLORS }    from '../assets/theme';
import { useAuth }   from '../context/AuthContext';

const OTP_BOXES = 6;
const MAX_ATTEMPTS   = 5;
const LOCKOUT_MS     = 60_000;
const RESEND_COOLDOWN = 30;

const PASSWORD_CHECKS = [
  { key: 'length',  label: 'At least 8 characters',         test: p => p.length >= 8 },
  { key: 'upper',   label: 'At least one uppercase letter',  test: p => /[A-Z]/.test(p) },
  { key: 'number',  label: 'At least one number',            test: p => /[0-9]/.test(p) },
  { key: 'special', label: 'At least one special character', test: p => /[@#!$%^&*()\-_=+]/.test(p) },
];

function getStrength(pwd) {
  const passed = PASSWORD_CHECKS.filter(c => c.test(pwd)).length;
  if (passed <= 1) return { label: 'Weak',        color: '#EF4444', score: 1 };
  if (passed === 2) return { label: 'Fair',        color: '#F97316', score: 2 };
  if (passed === 3) return { label: 'Strong',      color: '#84CC16', score: 3 };
  return              { label: 'Very Strong',      color: '#10B981', score: 4 };
}

const ForgotPassword = () => {
  const navigation = useNavigation();
  const { beginPasswordRecovery, endPasswordRecovery } = useAuth();

  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [lockRemaining, setLockRemaining] = useState(0);

  const [email, setEmail] = useState('');

  const [digits,    setDigits]    = useState(Array(OTP_BOXES).fill(''));
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const otpRefs = useRef([]);

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const strength = getStrength(newPassword);
  const isLocked = !!lockedUntil && Date.now() < lockedUntil;

  useEffect(() => {
    return () => {
      endPasswordRecovery();
    };
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockRemaining(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setFailedAttempts(0);
        setError('');
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  async function handleSendOTP() {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email address.'); return;
    }

    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {});

    setLoading(false);

    if (err) {
      setError('If that email is registered, a reset code has been sent.');
    }
    setStep(2);
  }

  function handleOtpChange(text, index) {
    if (text.length === OTP_BOXES) {
      const pasted = text.replace(/\D/g, '').slice(0, OTP_BOXES).split('');
      const filled = Array(OTP_BOXES).fill('').map((_, i) => pasted[i] ?? '');
      setDigits(filled);
      otpRefs.current[OTP_BOXES - 1]?.focus();
      return;
    }
    const char = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError('');
    if (char && index < OTP_BOXES - 1) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyPress(e, index) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerifyOTP() {
    if (lockedUntil && Date.now() < lockedUntil) {
      setError(`Too many attempts. Please wait ${lockRemaining}s and try again.`);
      return;
    }
    const token = digits.join('');
    if (token.length < OTP_BOXES) { setError('Please enter all 6 digits.'); return; }

    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });

    setLoading(false);

    if (err) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setError('Too many failed attempts. Please wait a minute and try again.');
      } else {
        setError('Invalid or expired code. Please try again.');
      }
      setDigits(Array(OTP_BOXES).fill(''));
      otpRefs.current[0]?.focus();
      return;
    }

    setFailedAttempts(0);
    beginPasswordRecovery();
    setStep(3);
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResending(true);
    setResendMsg('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    setResending(false);
    setResendCooldown(RESEND_COOLDOWN);
    setResendMsg(err ? 'Could not resend. Please try again.' : 'A new code has been sent to your email.');
  }

  async function handleSetPassword() {
    if (strength.score < 3) { setError('Password is too weak.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError('');

    const { data, error: err } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (err) {
      setLoading(false);
      setError(err.message ?? 'Could not update password. Please try again.');
      return;
    }

    const userId = data?.user?.id;
    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title:   'Password Changed',
        body:    'Your AidePoint password was successfully updated. If you did not make this change, contact support immediately.',
      });
    }

    await supabase.auth.signOut();
    endPasswordRecovery();

    setLoading(false);

    Alert.alert(
      'Password Updated',
      'Your password has been changed successfully.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardOpeningTime={0}
      >

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.ry} />
        </TouchableOpacity>

        <View style={styles.stepRow}>
          {[1, 2, 3].map(s => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                {step > s
                  ? <MaterialCommunityIcons name="check" size={13} color="#fff" />
                  : <Text style={[styles.stepNum, step === s && styles.stepNumActive]}>{s}</Text>
                }
              </View>
              {s < 3 && (
                <View style={[styles.stepLine, step > s && styles.stepLineActive]} />
              )}
            </View>
          ))}
        </View>

        {step === 1 && (
          <>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="lock-reset" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter the email you signed up with and we'll send you a reset code.
            </Text>

            {!!error && <Text style={styles.err}>{error}</Text>}

            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputRow, error && styles.inputError]}>
              <MaterialCommunityIcons name="email-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                maxLength={254}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              disabled={loading}
              onPress={handleSendOTP}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Send Reset Code</Text>
              }
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="email-check-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit reset code to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            <Text style={styles.spamNotice}>
              Don't see it? Check your spam or junk folder — it can take a minute to arrive.
            </Text>

            {!!error && <Text style={styles.err}>{error}</Text>}

            {isLocked && (
              <Text style={styles.lockMsg}>Try again in {lockRemaining}s</Text>
            )}

            {!!resendMsg && (
              <Text style={[styles.resendMsg, { color: resendMsg.includes('sent') ? '#10B981' : '#EF4444' }]}>
                {resendMsg}
              </Text>
            )}

            <View style={styles.otpRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={r => (otpRefs.current[i] = r)}
                  style={[
                    styles.otpBox,
                    d && styles.otpBoxFilled,
                    error && styles.otpBoxError,
                  ]}
                  value={d}
                  onChangeText={t => handleOtpChange(t, i)}
                  onKeyPress={e => handleOtpKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={OTP_BOXES}
                  textAlign="center"
                  autoFocus={i === 0}
                  selectTextOnFocus
                  editable={!isLocked}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btn, (loading || isLocked || digits.join('').length < OTP_BOXES) && styles.btnDisabled]}
              disabled={loading || isLocked || digits.join('').length < OTP_BOXES}
              onPress={handleVerifyOTP}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Verify Code</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={resending || resendCooldown > 0}>
              {resending
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : (
                  <Text style={styles.resendText}>
                    Didn't get a code?{' '}
                    <Text style={[styles.resendLink, resendCooldown > 0 && { opacity: 0.5 }]}>
                      {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                    </Text>
                  </Text>
                )
              }
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="lock-check-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>New Password</Text>
            <Text style={styles.subtitle}>
              Choose a strong password for your account.
            </Text>

            {!!error && <Text style={styles.err}>{error}</Text>}

            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="lock-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                value={newPassword}
                onChangeText={t => { setNewPassword(t); setError(''); }}
                secureTextEntry={!showNew}
                style={styles.input}
                maxLength={128}
              />
              <TouchableOpacity onPress={() => setShowNew(p => !p)}>
                <Feather name={showNew ? 'eye-off' : 'eye'} size={19} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {newPassword.length > 0 && (
              <>
                <View style={styles.barRow}>
                  {[1, 2, 3, 4].map(i => (
                    <View
                      key={i}
                      style={[styles.bar, { backgroundColor: i <= strength.score ? strength.color : '#E5E7EB' }]}
                    />
                  ))}
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
                <View style={{ gap: 3, marginBottom: 8 }}>
                  {PASSWORD_CHECKS.map(c => (
                    <Text
                      key={c.key}
                      style={[styles.check, c.test(newPassword) ? styles.checkPass : styles.checkFail]}
                    >
                      {c.test(newPassword) ? '✓' : '✗'}  {c.label}
                    </Text>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="lock-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                style={styles.input}
                maxLength={128}
              />
              <TouchableOpacity onPress={() => setShowConfirm(p => !p)}>
                <Feather name={showConfirm ? 'eye-off' : 'eye'} size={19} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              disabled={loading}
              onPress={handleSetPassword}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Update Password</Text>
              }
            </TouchableOpacity>
          </>
        )}

      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
export default ForgotPassword;

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#fff' },
  container:  { padding: 24, paddingBottom: 48 },

  backBtn:    { marginBottom: 8 },

  stepRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  stepItem:   { flexDirection: 'row', alignItems: 'center' },
  stepDot:    {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepNum:       { fontSize: 12, color: '#9CA3AF', fontWeight: '700' },
  stepNumActive: { color: '#fff' },
  stepLine:      { width: 48, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: COLORS.primary },

  iconWrap:  {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
  title:     { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subtitle:  { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginTop: 6, marginBottom: 12 },
  emailHighlight: { fontWeight: '600', color: '#111827' },

  spamNotice: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },

  label:     { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 11, backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#EF4444' },
  input:      { flex: 1, fontSize: 15, color: '#111827' },

  otpRow:    { flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 20 },
  otpBox: {
    width: 46, height: 56,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    borderRadius: 10, fontSize: 22,
    fontWeight: '700', color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  otpBoxError:  { borderColor: '#EF4444' },

  resendBtn:  { marginTop: 16, alignItems: 'center', padding: 8 },
  resendText: { fontSize: 14, color: '#6B7280' },
  resendLink: { color: COLORS.primary, fontWeight: '600' },
  resendMsg:  { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  lockMsg:    { fontSize: 13, textAlign: 'center', marginBottom: 8, color: '#EF4444', fontWeight: '600' },

  barRow:        { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  bar:           { flex: 1, height: 5, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '600', marginLeft: 6, minWidth: 68 },
  check:         { fontSize: 12, marginLeft: 2 },
  checkPass:     { color: '#10B981' },
  checkFail:     { color: '#9CA3AF' },

  btn: {
    backgroundColor: COLORS.ry,
    padding: 15, borderRadius: 12,
    marginTop: 24, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  err:       { color: '#EF4444', fontSize: 13, textAlign: 'center', marginTop: 4 },
});
