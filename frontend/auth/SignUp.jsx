// screens/auth/SignUp.js
//
// Collects name, email, and password.
// Does NOT call register() — that happens in UserTypeScreen
// after the user picks hospital vs solo.
//
// On submit: validate → navigate('UserType', { pendingUser: { name, email, password } })

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
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../assets/theme';
import { Button } from '../components/Button';

const SignUp = () => {
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [fieldErrors,     setFieldErrors]     = useState({});

  // authError is set by AuthContext if register() fails (shown after UserType).
  // clearError resets it when the user starts editing.
  const { authError, clearError } = useAuth();
  const navigation = useNavigation();

  // ── Validation ────────────────────────────────────────────────────────────
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
    else if (password.length < 8)
      e.password = 'Must be at least 8 characters';

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

  // ── Submit handler ────────────────────────────────────────────────────────
  // We do NOT register here. We pass the collected data to UserTypeScreen
  // as a route param. UserTypeScreen calls register() after the user picks
  // hospital vs solo. This way the userType is included in the Supabase
  // sign-up call and the trigger can set up the profile correctly.
  function handleContinue() {
    if (!validate()) return;
    navigation.navigate('UserType', {
      pendingUser: {
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        password,
      },
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <MaterialCommunityIcons name="microscope" size={28} color={COLORS.primary} />
            <Text style={styles.logoText}>AidePoint</Text>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Set up your AidePoint account in two quick steps.
          </Text>
        </View>

        {/* Auth error from a previous register() attempt */}
        {authError ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorBannerText}>{authError}</Text>
          </View>
        ) : null}

        {/* Full name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={[styles.inputBox, fieldErrors.name && styles.inputBoxError]}>
            <MaterialIcons name="person" size={20} color={fieldErrors.name ? '#EF4444' : '#94A3B8'} />
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
          {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputBox, fieldErrors.email && styles.inputBoxError]}>
            <MaterialIcons name="email" size={20} color={fieldErrors.email ? '#EF4444' : '#94A3B8'} />
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
          {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputBox, fieldErrors.password && styles.inputBoxError]}>
            <MaterialIcons name="lock" size={20} color={fieldErrors.password ? '#EF4444' : '#94A3B8'} />
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
          {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}
        </View>

        {/* Confirm password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.inputBox, fieldErrors.confirmPassword && styles.inputBoxError]}>
            <MaterialIcons name="lock" size={20} color={fieldErrors.confirmPassword ? '#EF4444' : '#94A3B8'} />
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

        {/* Continue button — goes to UserType, does NOT register yet */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continue</Text>
          <Feather name="arrow-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google sign-in */}
        <GoogleSignInButton label="Sign up with Google" />

        {/* Sign in link */}
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

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#FFFFFF' },
  container:   { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header:      { paddingTop: 48, paddingBottom: 28 },
  logoRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  logoText:    { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  title:       { fontSize: 26, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  subtitle:    { fontSize: 14, color: '#64748B', lineHeight: 21 },

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

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, paddingVertical: 16,
    borderRadius: 14, gap: 8, marginBottom: 20, marginTop: 4,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { fontSize: 13, color: '#94A3B8' },

  signInLink: { alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: '#64748B' },
  linkText:   { color: COLORS.primary, fontWeight: '600' },
});

export default SignUp;