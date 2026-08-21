import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { COLORS, scale, vScale, SPACING } from '../assets/theme';
import { signInStyles as styles } from '../styles/SignInStyles';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lightweight client-side brute-force throttle. This is defense in depth,
// not the real protection (Supabase Auth already rate-limits
// signInWithPassword server-side regardless of what this screen does) --
// it just stops this screen itself from being able to hammer the auth
// endpoint with rapid repeated submissions, and gives a clear "slow down"
// message instead of an opaque server rate-limit error surfacing later.
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const LOCKOUT_BASE_SECONDS = 30;

const SignIn = () => {
  const navigation = useNavigation();
  const { login, authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPass, setShowPass] = useState(false);

  const [errors, setErrors] = useState({
    email: null,
    password: null,
  });

  const [loading, setLoading] = useState(false);

  // Consecutive failed attempts and an epoch-ms timestamp the user is
  // locked out until (0 = not locked). Escalates: 5th failure locks for
  // 30s, 6th for 60s, 7th for 90s, etc. -- annoying enough to blunt rapid
  // guessing without permanently locking out someone who just mistyped
  // their password a few times.
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [nowTick, setNowTick] = useState(Date.now());

  const lockRemainingSeconds = Math.max(0, Math.ceil((lockedUntil - nowTick) / 1000));
  const isLockedOut = lockRemainingSeconds > 0;

  // Ticks once a second only while actually locked out, so the countdown
  // in the button/error text updates and the button re-enables itself
  // the moment the lockout expires, without a stray interval running for
  // the rest of the time someone sits on this screen.
  useEffect(() => {
    if (!isLockedOut) return undefined;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isLockedOut]);

  /*
   * Clear stale authentication errors every time this screen receives focus.
   *
   * This matters because React Navigation may keep the screen mounted.
   * Without this, an old error from a previous authentication attempt can
   * still be displayed when the user returns to Sign In.
   */
  useFocusEffect(
    useCallback(() => {
      clearError?.();

      return () => {
        Keyboard.dismiss();
      };
    }, [clearError])
  );

  /*
   * Keep the form validity explicit.
   *
   * This does NOT replace validation.
   * validate() is still responsible for producing useful error messages.
   */
  const isFormValid = useMemo(() => {
    const normalizedEmail = email.trim();

    return (
      normalizedEmail.length > 0 &&
      EMAIL_REGEX.test(normalizedEmail) &&
      password.length > 0
    );
  }, [email, password]);

  /*
   * Clear only the requested field error.
   */
  const clearFieldError = useCallback(
    (field) => {
      setErrors((previous) => ({
        ...previous,
        [field]: null,
      }));

      clearError?.();
    },
    [clearError]
  );

  /*
   * Validate the complete form.
   */
  const validate = useCallback(() => {
    const nextErrors = {};

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    }

    setErrors({
      email: nextErrors.email ?? null,
      password: nextErrors.password ?? null,
    });

    return Object.keys(nextErrors).length === 0;
  }, [email, password]);

  /*
   * Handle sign in safely.
   */
  const handleSignIn = async () => {
    /*
     * Prevent accidental double submissions.
     */
    if (loading) return;

    if (isLockedOut) {
      setErrors({
        email: `Too many attempts. Try again in ${lockRemainingSeconds}s.`,
        password: null,
      });
      return;
    }

    /*
     * Validate before making any network request.
     */
    if (!validate()) return;

    Keyboard.dismiss();

    setLoading(true);
    clearError?.();

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const result = await login(normalizedEmail, password);

      /*
       * AuthContext should normally return an object.
       * Still protect against an unexpected/undefined result.
       */
      if (!result?.success) {
        const message =
          result?.error || 'Unable to sign in. Please check your details and try again.';

        /*
         * Keep authentication errors generic.
         *
         * We don't want to reveal whether an email exists in the system.
         */
        setErrors({
          email: message,
          password: null,
        });

        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
          const extraFailures = nextAttempts - MAX_ATTEMPTS_BEFORE_LOCKOUT;
          const lockSeconds = LOCKOUT_BASE_SECONDS * (extraFailures + 1);
          const until = Date.now() + lockSeconds * 1000;
          setLockedUntil(until);
          setNowTick(Date.now());
        }

        return;
      }

      setFailedAttempts(0);
      setLockedUntil(0);

      /*
       * Successful authentication is normally handled by AuthContext/
       * navigation state. We intentionally do not manually navigate here
       * unless your AuthContext requires it.
       */
    } catch (error) {
      /*
       * Never allow an unexpected exception to leave the button permanently
       * disabled/loading.
       */
      if (__DEV__) {
        console.error('[SignIn] login error:', error);
      }

      setErrors({
        email: 'Unable to sign in right now. Please try again.',
        password: null,
      });
    } finally {
      setLoading(false);
    }
  };

  /*
   * Pressing "Next" on the email field moves naturally to password.
   */
  const handleEmailSubmit = () => {
    if (!email.trim()) {
      setErrors((previous) => ({
        ...previous,
        email: 'Email is required',
      }));
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setErrors((previous) => ({
        ...previous,
        email: 'Enter a valid email address',
      }));
      return;
    }

    Keyboard.dismiss();

    /*
     * We intentionally don't manually focus the password field here because
     * there is no ref required for the normal keyboard behavior.
     */
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={30}
        keyboardOpeningTime={0}
        enableAutomaticScroll
      >
        {/* Header / logo */}
        <View style={styles.headerSection}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/brand/icon-teal.png')}
              style={{
                width: scale(64),
                height: scale(64),
              }}
              resizeMode="contain"
            />
          </View>

          <Image
            source={require('../assets/brand/wordmark-white.png')}
            style={{
              height: vScale(28),
              width: scale(150),
              marginTop: SPACING.md,
            }}
            resizeMode="contain"
          />
        </View>

        {/* Main card */}
        <View style={styles.card}>
          <Text style={styles.greetingTitle}>Welcome back</Text>

          <Text style={styles.greetingSubtitle}>
            Sign in to continue to AidePoint
          </Text>

          {!!authError && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color={COLORS.danger}
              />

              <Text style={styles.errorText}>
                {authError}
              </Text>
            </View>
          )}

          <View style={styles.form}>
            {/* ==================== EMAIL ==================== */}

            <Text style={styles.inputLabel}>
              Email Address
            </Text>

            <View
              style={[
                styles.inputBox,
                errors.email && styles.inputBoxError,
              ]}
            >
              <MaterialCommunityIcons
                name="email-outline"
                size={18}
                color={COLORS.textMuted}
                style={styles.inputIcon}
              />

              <TextInput
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);

                  if (errors.email) {
                    clearFieldError('email');
                  } else {
                    clearError?.();
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                keyboardAppearance="light"
                returnKeyType="next"
                style={styles.textInput}
                maxLength={254}
                editable={!loading}
                onSubmitEditing={handleEmailSubmit}
              />
            </View>

            {errors.email && (
              <Text style={styles.fieldError}>
                {errors.email}
              </Text>
            )}

            {/* ==================== PASSWORD ==================== */}

            <Text style={styles.inputLabel}>
              Password
            </Text>

            <View
              style={[
                styles.inputBox,
                errors.password && styles.inputBoxError,
              ]}
            >
              <MaterialCommunityIcons
                name="lock-outline"
                size={18}
                color={COLORS.textMuted}
                style={styles.inputIcon}
              />

              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);

                  if (errors.password) {
                    clearFieldError('password');
                  } else {
                    clearError?.();
                  }
                }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                style={styles.textInput}
                maxLength={128}
                editable={!loading}
                onSubmitEditing={handleSignIn}
              />

              <TouchableOpacity
                onPress={() => setShowPass((previous) => !previous)}
                style={styles.eyeBtn}
                disabled={loading}
                hitSlop={{
                  top: 10,
                  bottom: 10,
                  left: 10,
                  right: 10,
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  showPass ? 'Hide password' : 'Show password'
                }
              >
                <Feather
                  name={showPass ? 'eye-off' : 'eye'}
                  size={19}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            {errors.password && (
              <Text style={styles.fieldError}>
                {errors.password}
              </Text>
            )}

            {/* ==================== FORGOT PASSWORD ==================== */}

            <TouchableOpacity
              onPress={() => {
                if (loading) return;

                Keyboard.dismiss();
                clearError?.();
                navigation.navigate('ForgotPassword');
              }}
              style={styles.forgotBtn}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* ==================== SIGN IN ==================== */}

            <TouchableOpacity
              style={[
                styles.signInBtn,

                /*
                 * Disabled visually when:
                 * - the form isn't valid, OR
                 * - a request is currently running, OR
                 * - the client-side lockout is active.
                 */
                (!isFormValid || loading || isLockedOut) &&
                  styles.signInBtnDisabled,
              ]}
              disabled={!isFormValid || loading || isLockedOut}
              onPress={handleSignIn}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{
                disabled: !isFormValid || loading || isLockedOut,
                busy: loading,
              }}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : isLockedOut ? (
                <Text style={[styles.signInBtnText, styles.signInBtnTextDisabled]}>
                  Try again in {lockRemainingSeconds}s
                </Text>
              ) : (
                <>
                  <Text
                    style={[
                      styles.signInBtnText,
                      !isFormValid && styles.signInBtnTextDisabled,
                    ]}
                  >
                    Sign In
                  </Text>

                  {isFormValid && (
                    <Feather
                      name="arrow-right"
                      size={20}
                      color={COLORS.white}
                    />
                  )}
                </>
              )}
            </TouchableOpacity>

            {/* ==================== SIGN UP ==================== */}

            <TouchableOpacity
              style={styles.signUpRow}
              onPress={() => {
                if (loading) return;

                Keyboard.dismiss();
                clearError?.();
                navigation.navigate('SignUp');
              }}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.signUpText}>
                Don't have an account?{' '}
                <Text style={styles.signUpLink}>
                  Create one
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
