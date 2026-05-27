import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../assets/theme';

/* ---------------- PASSWORD RULES ---------------- */

const PASSWORD_CHECKS = [
  { key: 'length', label: 'At least 8 characters', test: p => p.length >= 8 },
  { key: 'upper', label: 'At least one uppercase letter', test: p => /[A-Z]/.test(p) },
  { key: 'number', label: 'At least one number', test: p => /[0-9]/.test(p) },
  { key: 'special', label: 'At least one special character', test: p => /[@#!$%^&*()\-_=+]/.test(p) },
];

function getStrength(pwd) {
  const passed = PASSWORD_CHECKS.filter(c => c.test(pwd)).length;

  if (passed <= 1) return { label: 'Weak', color: '#EF4444', score: 1 };
  if (passed === 2) return { label: 'Fair', color: '#F97316', score: 2 };
  if (passed === 3) return { label: 'Strong', color: '#84CC16', score: 3 };
  return { label: 'Very Strong', color: '#10B981', score: 4 };
}

/* ---------------- COMPONENT ---------------- */

const SignUp = () => {
  const { register, authError, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const strength = getStrength(password);
  const canSubmit = strength.score >= 3 && !loading;

  /* ---------------- VALIDATION ---------------- */

  function validate() {
    const e = {};

    if (!name.trim()) e.name = 'Name required';

    if (!email.trim()) e.email = 'Email required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Invalid email';

    if (!password) e.password = 'Password required';
    else if (strength.score < 3)
      e.password = 'Password too weak';

    if (password !== confirmPassword)
      e.confirmPassword = 'Passwords do not match';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function clearField(key) {
    setErrors(prev => ({ ...prev, [key]: null }));
    clearError?.();
  }

  /* ---------------- SUBMIT ---------------- */

  async function handleSignup() {
    if (!validate() || loading) return;

    setLoading(true);
    setSuccessMsg('');
    clearError?.();

    try {
      const result = await register({
        name,
        email,
        password,
      });

      if (!result.success) {
        setErrors(prev => ({
          ...prev,
          email: result.error,
        }));
        return;
      }

      // EMAIL VERIFICATION STATE
      if (result.needsVerification) {
        setSuccessMsg(
          'Check your email to verify your account before logging in.'
        );
      }

    } finally {
      setLoading(false);
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="microscope" size={28} color={COLORS.primary} />
          <Text style={styles.title}>Create Account</Text>
        </View>

        {/* SUCCESS MESSAGE */}
        {!!successMsg && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* AUTH ERROR */}
        {!!authError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        )}

        {/* NAME */}
        <TextInput
          placeholder="Full name"
          value={name}
          onChangeText={t => {
            setName(t);
            clearField('name');
          }}
          style={styles.input}
        />
        {errors.name && <Text style={styles.err}>{errors.name}</Text>}

        {/* EMAIL */}
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={t => {
            setEmail(t);
            clearField('email');
          }}
          autoCapitalize="none"
          style={styles.input}
        />
        {errors.email && <Text style={styles.err}>{errors.email}</Text>}

        {/* PASSWORD */}
        <View style={styles.passBox}>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            style={styles.passInput}
          />

          <TouchableOpacity onPress={() => setShowPass(p => !p)}>
            <Feather name={showPass ? "eye-off" : "eye"} size={20} />
          </TouchableOpacity>
        </View>

        {/* STRENGTH */}
        <View style={styles.barRow}>
          {[1,2,3,4].map(i => (
            <View
              key={i}
              style={[
                styles.bar,
                { backgroundColor: i <= strength.score ? strength.color : '#ddd' }
              ]}
            />
          ))}
        </View>

        {PASSWORD_CHECKS.map(c => (
          <Text key={c.key} style={styles.check}>
            {c.test(password) ? "✓" : "✗"} {c.label}
          </Text>
        ))}

        {errors.password && <Text style={styles.err}>{errors.password}</Text>}

        {/* CONFIRM */}
        <View style={styles.passBox}>
          <TextInput
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            style={styles.passInput}
          />

          <TouchableOpacity onPress={() => setShowConfirm(p => !p)}>
            <Feather name={showConfirm ? "eye-off" : "eye"} size={20} />
          </TouchableOpacity>
        </View>

        {errors.confirmPassword && (
          <Text style={styles.err}>{errors.confirmPassword}</Text>
        )}

        {/* BUTTON */}
        <TouchableOpacity
          disabled={!canSubmit}
          onPress={handleSignup}
          style={[styles.btn, !canSubmit && { opacity: 0.5 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Create Account</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20 },

  header: { marginTop: 40, marginBottom: 20 },

  title: { fontSize: 24, fontWeight: '700' },

  input: {
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
    borderRadius: 10,
  },

  passBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
    borderRadius: 10,
  },

  passInput: { flex: 1 },

  barRow: { flexDirection: 'row', marginVertical: 10 },
  bar: { flex: 1, height: 5, marginHorizontal: 2 },

  check: { fontSize: 12, marginLeft: 4 },

  btn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },

  btnText: { color: '#fff', fontWeight: '600' },

  err: { color: 'red', fontSize: 12 },

  errorBox: { backgroundColor: '#fee', padding: 10, marginBottom: 10 },
  errorText: { color: 'red' },

  successBox: { backgroundColor: '#eaffea', padding: 10, marginBottom: 10 },
  successText: { color: 'green' },
});

export default SignUp;