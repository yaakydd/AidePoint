import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={30}
        keyboardOpeningTime={0}
      >
        {/* Curved header / logo */}
        <View style={styles.headerSection}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/brand/icon-teal.png')}
              style={{ width: 44, height: 44 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>AIDEPOINT</Text>
        </View>

        {/* White card */}
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
            <Text style={styles.inputLabel}>Password</Text>
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

            {/* Forgot password — link below the field, right-aligned */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
