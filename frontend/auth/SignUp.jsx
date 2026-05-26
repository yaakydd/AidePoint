// Collects name, email, password.
// Calls register() directly — no UserType step.
// All users are solo lab technicians (hardcoded in AuthContext.register).

//
// Password strength meter blocks submit until strength >= Strong.
// On success: AppNavigator detects needsConsent=true → ConsentScreen.
// No navigation.navigate() needed here after register().

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet,
  StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../assets/theme';

// PASSWORD STRENGTH
// Each check is tested live as the user types.
// The button is disabled until score >= 3 (Strong).
const PASSWORD_CHECKS = [
  { key: 'length',    label: 'At least 8 characters', test: p => p.length >= 8 },
  { key: 'uppercase', label: 'At least one uppercase letter',  test: p => /[A-Z]/.test(p) },
  { key: 'number',    label: 'At least one number',            test: p => /[0-9]/.test(p) },
  { key: 'special',   label: 'At least one special character (@#!)', test: p => /[@#!$%^&*()\-_=+]/.test(p) },
];

function getStrength(pwd) {
  if (!pwd) return { label: '', color: '', score: 0 };
  const passed = PASSWORD_CHECKS.filter(c => c.test(pwd)).length;
  if (passed <= 1) return { label: 'Weak', color: '#EF4444', score: 1 };
  if (passed === 2) return { label: 'Fair', color: '#F97316', score: 2 };
  if (passed === 3) return { label: 'Strong', color: '#84CC16', score: 3 };
  return{ 
    label: 'Very Strong', color: '#10B981', score: 4 
  };
}


const SignUp = () => {
  const [name, setName] = useState('');
  const [email, setEmail]= useState('');
  const [password,  setPassword]= useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isRegistering, setIsRegistering] = useState(false);

  const { register, authError, clearError } = useAuth();
  const navigation = useNavigation();

  // Computed live — drives the strength bar and button disabled state
  const strength = getStrength(password);
  const canSubmit = strength.score >= 3 && !isRegistering;

  // Validation 
  function validate() {
    const e = {};
    if (!name.trim())
      e.name = 'Full name is required';
    else if (name.trim().length < 2)
      e.name = 'Name must be at least 2 characters';

    if (!email.trim())
      e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = 'Enter a valid email address';

    if (!password)
      e.password = 'Password is required';
    else if (strength.score < 3)
      e.password = 'Password must be at least Strong';

    if (!confirmPassword)
      e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword)
      e.confirmPassword = 'Passwords do not match';

    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  function clearField(key) {
    if (fieldErrors[key]) setFieldErrors(p => ({ ...p, [key]: null }));
    clearError();
  }

  // Register 
  // Calls register() directly. userType = 'solo' is hardcoded inside register().
  // On success: AuthContext sets needsConsent=true → AppNavigator shows ConsentScreen.
  // No navigate() needed here.
  async function handleCreateAccount() {
    if (!validate()) return;

    setIsRegistering(true);
    try {
      const result = await register({
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        password,
      });

      if (!result.success) {
        // Show the Supabase error under the email field
        setFieldErrors(prev => ({ ...prev, email: result.error }));
      }
    } finally {
      setIsRegistering(false);
    }
  }

  // Render 
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <MaterialCommunityIcons name="microscope" size={28} color={COLORS.primary} />
            <Text style={styles.logoText}>AidePoint</Text>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Set up your account to start running blood smear analysis.
          </Text>
        </View>

        {/* ── Global auth error banner (from Supabase) ── */}
        {authError ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorBannerText}>{authError}</Text>
          </View>
        ) : null}

        {/* Full Name  */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={[styles.inputBox, fieldErrors.name && styles.inputBoxError]}>
            <MaterialIcons
              name="person"
              size={20}
              color={fieldErrors.name ? '#EF4444' : '#94A3B8'}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. Kwame Mensah"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={t => { setName(t); clearField('name'); }}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          {fieldErrors.name
            ? <Text style={styles.fieldError}>{fieldErrors.name}</Text>
            : null}
        </View>

        {/*  Email  */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputBox, fieldErrors.email && styles.inputBoxError]}>
            <MaterialIcons
              name="email"
              size={20}
              color={fieldErrors.email ? '#EF4444' : '#94A3B8'}
            />
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={t => { setEmail(t); clearField('email'); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </View>
          {fieldErrors.email
            ? <Text style={styles.fieldError}>{fieldErrors.email}</Text>
            : null}
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputBox, fieldErrors.password && styles.inputBoxError]}>
            <MaterialIcons
              name="lock"
              size={20}
              color={fieldErrors.password ? '#EF4444' : '#94A3B8'}
            />
            <TextInput
              style={styles.input}
              placeholder="Minimum 8 characters"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={t => { setPassword(t); clearField('password'); }}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
            />
            <TouchableOpacity
              onPress={() => setShowPass(p => !p)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name={showPass ? 'eye-off' : 'eye'} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          {fieldErrors.password
            ? <Text style={styles.fieldError}>{fieldErrors.password}</Text>
            : null}

          {/* Password Strength Meter */}
          {/* Shown as soon as the user starts typing */}
          {password.length > 0 && (
            <View style={styles.strengthWrap}>

              {/* Label row */}
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthLabelText}>Password strength</Text>
                <Text style={[styles.strengthValue, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>

              {/* 4-segment progress bar */}
              <View style={styles.strengthBar}>
                {[1, 2, 3, 4].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.strengthSegment,
                      { backgroundColor: i <= strength.score ? strength.color : '#E2E8F0' },
                    ]}
                  />
                ))}
              </View>

              {/* Per-requirement checklist with live  */}
              <View style={styles.checkList}>
                {PASSWORD_CHECKS.map(check => {
                  const passed = check.test(password);
                  return (
                    <View key={check.key} style={styles.checkRow}>
                      <Text style={[styles.checkIcon, { color: passed ? '#10B981' : '#EF4444' }]}>
                        {passed ? '✓' : '✗'}
                      </Text>
                      <Text style={[styles.checkLabel, { color: passed ? '#10B981' : '#94A3B8' }]}>
                        {check.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.inputBox, fieldErrors.confirmPassword && styles.inputBoxError]}>
            <MaterialIcons
              name="lock"
              size={20}
              color={fieldErrors.confirmPassword ? '#EF4444' : '#94A3B8'}
            />
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#94A3B8"
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); clearField('confirmPassword'); }}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(p => !p)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          {fieldErrors.confirmPassword
            ? <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
            : null}
        </View>

        {/*  Submit — disabled until password is Strong ─ */}
        <TouchableOpacity
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          onPress={handleCreateAccount}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {isRegistering
            ? <ActivityIndicator color="#FFFFFF" />
            : (
              <>
                <Text style={styles.btnText}>Create Account</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </>
            )
          }
        </TouchableOpacity>

        {/*  Sign in link  */}
        <TouchableOpacity
          style={styles.signInLink}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.linkText}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles 
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },

  header:    { paddingTop: 48, paddingBottom: 28 },
  logoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  logoText:  { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  title:     { fontSize: 26, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  subtitle:  { fontSize: 14, color: '#64748B', lineHeight: 21 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorBannerText: { fontSize: 13, color: '#DC2626', flex: 1 },

  fieldGroup:    { marginBottom: 16 },
  label:         { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    backgroundColor: '#F8FAFC', gap: 10,
  },
  inputBoxError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  input:         { flex: 1, fontSize: 15, color: '#0F172A' },
  fieldError:    { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 2 },

  // Strength meter
  strengthWrap:     { marginTop: 10 },
  strengthHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  strengthLabelText:{ fontSize: 12, color: '#64748B' },
  strengthValue:    { fontSize: 12, fontWeight: '600' },
  strengthBar:      { flexDirection: 'row', gap: 4, marginBottom: 8 },
  strengthSegment:  { flex: 1, height: 4, borderRadius: 2 },
  checkList:        { gap: 4 },
  checkRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkIcon:        { fontSize: 13, fontWeight: '700', width: 14 },
  checkLabel:       { fontSize: 12 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, paddingVertical: 16,
    borderRadius: 14, gap: 8, marginBottom: 20, marginTop: 8,
  },
  btnDisabled: { opacity: 0.50 },
  btnText:     { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  signInLink: { alignItems: 'center', marginTop: 4 },
  footerText: { fontSize: 14, color: '#64748B' },
  linkText:   { color: COLORS.primary, fontWeight: '600' },
});

export default SignUp;
