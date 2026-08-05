// screens/SignIn.js
//
// Layout follows the reference design: colored curved header holding
// the logo, white card overlapping it with rounded top corners, "Hello"
// greeting, icon-prefixed input fields, and a pill-shaped submit button
// with a trailing arrow. Colors pulled from theme.js (COLORS.primary)
// rather than the reference image's pink, so it matches AidePoint's
// actual brand.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../assets/theme';
import { signInStyles as styles } from '../styles/SignInStyles';

const SignIn = () => {
  const navigation = useNavigation();
  const { login, authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!email.trim())
      e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Invalid email address';
    if (!password)
      e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate() || loading) return;
    setLoading(true);
    clearError?.();

    try {
      const result = await login(email, password);
      if (!result?.success) {
        setErrors({ email: result?.error ?? 'Invalid email or password.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Curved header / logo ── */}
          <View style={styles.headerSection}>
            {/* PLACEHOLDER: replace this whole View with your logo Image
                once you have the asset in /assets. Example:
                  <Image
                    source={require('../assets/logo.png')}
                    style={styles.logoImage}
                  />
                Delete the MaterialCommunityIcons child below when you do. */}
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="microscope" size={34} color={COLORS.primary} />
            </View>
            <Text style={styles.brandTitle}>AIDEPOINT</Text>
          </View>

          {/* ── White card ── */}
          <View style={styles.card}>
            <Text style={styles.greetingTitle}>Welcome back </Text>
            <Text style={styles.greetingSubtitle}>Sign in to continue to AidePoint</Text>

            {!!authError && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            <View style={styles.form}>
              {/* Email */}
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputBox, errors.email && styles.inputBoxError]}>
                <MaterialCommunityIcons
                  name="email-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon}
                />
                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setErrors((e) => ({ ...e, email: null }));
                    clearError?.();
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.textInput}
                />
              </View>
              {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}

{/* Password */}
<View style={styles.passwordHeaderRow}>
  <Text style={styles.inputLabel}>Password</Text>
  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
    <Text style={styles.forgotText}>Forgot password?</Text>
  </TouchableOpacity>
</View>
<View style={[styles.inputBox, errors.password && styles.inputBoxError]}>
  <MaterialCommunityIcons
    name="lock-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon}
  />
  <TextInput
    placeholder="Enter your password"
    placeholderTextColor={COLORS.textMuted}
    value={password}
    onChangeText={(t) => {
      setPassword(t);
      setErrors((e) => ({ ...e, password: null }));
    }}
    secureTextEntry={!showPass}
    style={styles.textInput}
  />
  <TouchableOpacity onPress={() => setShowPass((p) => !p)} style={styles.eyeBtn}>
    <Feather name={showPass ? 'eye-off' : 'eye'} size={19} color={COLORS.textMuted} />
  </TouchableOpacity>
</View>
{errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
              

              {/* Submit */}
              <TouchableOpacity
                style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
                disabled={loading}
                onPress={handleSignIn}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Text style={styles.signInBtnText}>Sign In</Text>
                    <Feather name="arrow-right" size={20} color={COLORS.white} />
                  </>
                )}
              </TouchableOpacity>

              {/* Sign up link */}
              <TouchableOpacity style={styles.signUpRow} onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signUpText}>
                  Don't have an account? <Text style={styles.signUpLink}>Create one</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;