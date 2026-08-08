// screens/ChangePassword.js
//
// In-app password change for an already-logged-in user. Unlike
// ForgotPassword.js (which proves identity via an emailed OTP because
// the user, by definition, doesn't have their current password), this
// screen proves identity with the current password itself -- faster,
// and appropriate since the user is already authenticated in-session.
//
// Flow: current password → re-authenticate via signInWithPassword →
// new password + confirm → supabase.auth.updateUser() →
// insert notification → navigate back to Profile.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../assets/theme';

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

const ChangePassword = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  const strength = getStrength(newPassword);

  async function handleUpdatePassword() {
    if (!currentPassword) {
      setError('Enter your current password.');
      return;
    }
    if (strength.score < 3) {
      setError('New password is too weak.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setLoading(true);
    setError('');

    // Re-authenticate with the current password -- this is the proof of
    // identity for this flow (see file header). signInWithPassword fails
    // with an error if currentPassword is wrong, which is exactly the
    // check we need before allowing the update.
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInErr) {
      setLoading(false);
      setError('Current password is incorrect.');
      return;
    }

    const { data, error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateErr) {
      setLoading(false);
      setError(updateErr.message ?? 'Could not update password. Please try again.');
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="lock-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>
            Enter your current password, then choose a new one.
          </Text>

          {!!error && <Text style={styles.err}>{error}</Text>}

          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Enter current password"
              placeholderTextColor="#9CA3AF"
              value={currentPassword}
              onChangeText={t => { setCurrentPassword(t); setError(''); }}
              secureTextEntry={!showCurrent}
              style={styles.input}
            />
            <TouchableOpacity onPress={() => setShowCurrent(p => !p)}>
              <Feather name={showCurrent ? 'eye-off' : 'eye'} size={19} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

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
            />
            <TouchableOpacity onPress={() => setShowConfirm(p => !p)}>
              <Feather name={showConfirm ? 'eye-off' : 'eye'} size={19} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={handleUpdatePassword}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Update Password</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
export default ChangePassword;

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#fff' },
  container:  { padding: 24, paddingBottom: 48 },
  backBtn:    { marginBottom: 8 },

  iconWrap:  {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
  title:     { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subtitle:  { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginTop: 6, marginBottom: 24 },

  label:     { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 11, backgroundColor: '#FAFAFA',
  },
  input:      { flex: 1, fontSize: 15, color: '#111827' },

  barRow:        { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  bar:           { flex: 1, height: 5, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '600', marginLeft: 6, minWidth: 68 },
  check:         { fontSize: 12, marginLeft: 2 },
  checkPass:     { color: '#10B981' },
  checkFail:     { color: '#9CA3AF' },

  btn: {
    backgroundColor: COLORS.primary,
    padding: 15, borderRadius: 12,
    marginTop: 24, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  forgotLink:     { marginTop: 16, alignItems: 'center', padding: 8 },
  forgotLinkText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  err:       { color: '#EF4444', fontSize: 13, textAlign: 'center', marginTop: 4 },
});