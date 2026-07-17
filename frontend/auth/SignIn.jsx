import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth }  from '../context/AuthContext';
import { COLORS }   from '../assets/theme';

export default function SignIn() {
  const navigation = useNavigation();
  const { login, authError, clearError } = useAuth();
  const [email, setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading]  = useState(false);

  function validate() {
    const e = {};
    if (!email.trim())
      e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Invalid email address';
    if (!password)
      e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignIn() {
    if (!validate() || loading) return;
    setLoading(true);
    clearError?.();

    try {
      const result = await login(email, password);
      if (!result?.success) {
        // Show error under email field for clean UX
        setErrors({ email: result?.error ?? 'Invalid email or password.' });
      }
      // On success: AuthContext moves authState to APP or CONSENT automatically
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="microscope" size={34} color="#fff" />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to AidePoint</Text>
          </View>

          {/* Server error */}
          {!!authError && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}
          
          <View style={styles.form}>
          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputRow, errors.email && styles.inputError]}>
            <MaterialCommunityIcons name="email-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: null })); clearError?.(); }}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>
          {errors.email && <Text style={styles.err}>{errors.email}</Text>}

          {/* Password */}
          <View style={[styles.inputRow, errors.password && styles.inputError]}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: null })); }}
              secureTextEntry={!showPass}
              style={styles.input}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
              <Feather name={showPass ? 'eye-off' : 'eye'} size={19} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <View style={styles.passwordHeader}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.err}>{errors.password}</Text>}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={handleSignIn}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Sign up link */}
          <TouchableOpacity
            style={styles.signupRow}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.signupText}>
              Don't have an account?{' '}
              <Text style={styles.signupLink}>Create one</Text>
            </Text>
          </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({


  header:     { alignItems: 'center', marginTop: 40, marginBottom: 36 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  title:     { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle:  { fontSize: 14, color: '#6B7280', marginTop: 4 },

  label:     { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#EF4444' },
  inputIcon:  { marginRight: 8 },
  input:      { flex: 1, fontSize: 15, color: '#111827' },
  eyeBtn:     { padding: 4 },

  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 16 },

  btn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    marginTop: 28,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  signupRow:  { marginTop: 20, alignItems: 'center' },
  signupText: { fontSize: 14, color: '#6B7280' },
  signupLink: { color: COLORS.primary, fontWeight: '600' },

  err:       { color: '#EF4444', fontSize: 12, marginTop: 3 },
  errorBox:  {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', padding: 12,
    borderRadius: 10, marginBottom: 8,
  },
  errorText: { color: '#B91C1C', fontSize: 13, flex: 1 },
});
