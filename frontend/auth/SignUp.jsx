// 3-step flow, matching the reference screenshots' pattern (X/back at
// top, progress dots, one focused question per screen, disabled Next
// until the step is valid):
//   Step 1 "Let's get started"  -> name + email
//   Step 2 "Hospital / Lab"     -> existing search modal, unchanged logic
//   Step 3 "Create a password"  -> single strength bar + hint text,
//                                   styled after the Chime reference
//                                   image rather than the old 4-bar/
//                                   checklist-only layout.
//
// All hospital-picker and password-strength logic is carried over
// unchanged from the previous single-screen version -- only the JSX
// structure and styling changed to split it into steps, match the
// Chime reference layout (logo + wordmark, connected step icons with
// labels, generous spacing), and fix keyboard-covering-input on
// Android/iOS via KeyboardAwareScrollView.
//
// Email-enumeration note: step 1 does NOT pre-check whether an email is
// already registered. That was tried via signInWithOtp({shouldCreateUser:
// false}) but rejected — it's a textbook enumeration oracle and
// contradicts ForgotPassword.js's deliberate "never reveal if an email
// exists" design. Duplicate accounts are now caught at the final
// register() call (step 3) and the user is routed back to step 1 with a
// clear message + Sign In link instead.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StatusBar, Keyboard, Modal, FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { COLORS } from '../assets/theme';
import { signupStyle as styles } from '../styles/SignUpStyles';

const PASSWORD_CHECKS = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'number', label: 'At least one number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'At least one special character', test: (p) => /[@#!$%^&*()\-_=+]/.test(p) },
];

const STEP_ICONS = {
  start: 'account-outline',
  hospital: 'hospital-building',
  password: 'shield-check-outline',
};

const STEP_LABELS = {
  start: 'Basic Info',
  hospital: 'Workplace',
  password: 'Security',
};

const getStrength = (pwd) => {
  const passed = PASSWORD_CHECKS.filter((c) => c.test(pwd)).length;
  if (passed <= 1) return { label: 'Too weak: try adding more numbers', color: COLORS.danger, score: 1 };
  if (passed === 2) return { label: 'Fair: add a symbol or capital letter', color: COLORS.warning, score: 2 };
  if (passed === 3) return { label: 'Strong', color: '#84CC16', score: 3 };
  return { label: 'Very strong — nice work', color: COLORS.success, score: 4 };
};

const getTypePillStyle = (type) => {
  const map = {
    teaching: { backgroundColor: COLORS.infoBg, color: COLORS.info },
    regional: { backgroundColor: COLORS.successBg, color: COLORS.success },
    district: { backgroundColor: COLORS.warningBg, color: COLORS.warning },
    polyclinic: { backgroundColor: '#F5F3FF', color: '#6D28D9' },
    private: { backgroundColor: COLORS.dangerBg, color: COLORS.danger },
    lab: { backgroundColor: COLORS.primaryLight, color: COLORS.primaryDark },
  };
  return map[type] ?? { backgroundColor: COLORS.surfaceAlt, color: COLORS.textSecondary };
};

// Loose match on Supabase/GoTrue's duplicate-account error phrasing.
// Different supabase-js/GoTrue versions phrase this slightly differently
// ("User already registered", "already exists", etc.) — matching on the
// substring rather than an exact string keeps this from silently breaking
// on a version bump.
function isDuplicateAccountError(message) {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('already registered') || m.includes('already exists');
}

const STEPS = ['start', 'hospital', 'password'];

const SignUp = () => {
  const navigation = useNavigation();
  const { register, authError, clearError } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  // Step 1 fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Step 2: hospital picker state (unchanged logic)
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [hospitalSelected, setHospitalSelected] = useState('');
  const [filteredList, setFilteredList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customHospital, setCustomHospital] = useState('');
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  // Step 3 fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);

  // Server-side hospital search — queries Postgres directly instead of
  // pulling the whole ghana_hospitals table into memory. Debounced 150ms
  // so we're not firing a query per keystroke.
  useEffect(() => {
    let alive = true;
    setHospitalsLoading(true);

    const timeout = setTimeout(async () => {
      const q = hospitalQuery.trim();

      const query = q
        ? supabase
            .from('ghana_hospitals')
            .select('name, city, type')
            .or(`name.ilike.%${q}%,city.ilike.%${q}%,type.ilike.%${q}%`)
            .order('name')
            .limit(30)
        : supabase
            .from('ghana_hospitals')
            .select('name, city, type')
            .order('name')
            .limit(20);

      const { data, error } = await query;

      if (!alive) return;
      setFilteredList(error ? [] : (data ?? []));
      setHospitalsLoading(false);
    }, 150);

    return () => {
      alive = false;
      clearTimeout(timeout);
    };
  }, [hospitalQuery]);

  const openModal = () => {
    Keyboard.dismiss();
    setShowCustomInput(false);
    setCustomHospital('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setShowCustomInput(false);
    setHospitalQuery(hospitalSelected);
  };

  const handleSelectHospital = (hospital) => {
    if (hospital.name === 'Other') {
      setShowCustomInput(true);
      return;
    }
    setHospitalSelected(hospital.name);
    setHospitalQuery(hospital.name);
    setModalVisible(false);
    setShowCustomInput(false);
    clearField('hospital');
  };

  const handleConfirmCustom = () => {
    const val = customHospital.trim();
    if (!val) return;
    setHospitalSelected(val);
    setHospitalQuery(val);
    setModalVisible(false);
    setShowCustomInput(false);
    clearField('hospital');
  };

  const clearField = (key) => {
    setErrors((prev) => ({ ...prev, [key]: null }));
    clearError?.();
  };

  // ── Per-step validation, gates the Next button ──
  const validateStart = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateHospital = () => {
    const e = {};
    if (!hospitalSelected) e.hospital = 'Hospital / Lab is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const validatePassword = () => {
    const e = {};
    if (!password) e.password = 'Password is required';
    else if (strength.score < 3) e.password = 'Password is too weak';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!agreedToPrivacy) e.privacy = 'You must agree to the Privacy Policy to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canProceedStart = name.trim().length > 0 && email.trim().length > 0;
  const canProceedHospital = !!hospitalSelected;
  const canProceedPassword =
    strength.score >= 3 &&
    password === confirmPassword &&
    confirmPassword.length > 0 &&
    agreedToPrivacy;

  const handleBack = () => {
    if (stepIndex === 0) {
      navigation.goBack();
      return;
    }
    setErrors({});
    setStepIndex((i) => i - 1);
  };

  const handleNext = async () => {
    if (step === 'start') {
      if (!validateStart()) return;
      setStepIndex(1);
      return;
    }
    if (step === 'hospital') {
      if (!validateHospital()) return;
      setStepIndex(2);
      return;
    }
    if (step === 'password') {
      if (!validatePassword() || loading) return;
      setLoading(true);
      clearError?.();
      try {
        const result = await register({
          name,
          email,
          password,
          hospitalLab: hospitalSelected,
        });

        if (!result.success) {
          if (isDuplicateAccountError(result.error)) {
            // Send them back to step 1 — the email field is where this
            // actually needs fixing, not the password step.
            setErrors({ email: 'An account with this email already exists. Try signing in instead.' });
            setStepIndex(0);
          } else {
            setErrors((prev) => ({ ...prev, password: result.error }));
          }
          return;
        }
        if (result.needsVerification) {
          navigation.navigate('VerifyEmail', { email: result.email });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const nextEnabled =
    step === 'start' ? canProceedStart :
    step === 'hospital' ? canProceedHospital :
    canProceedPassword;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardOpeningTime={0}
      >
        {/* ── Top bar: close/back + "Log in" (mirrors reference's X + Log in) ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons
              name={stepIndex === 0 ? 'close' : 'arrow-left'}
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          {stepIndex === 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.topBarLogin}>Log in</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Logo + wordmark ── */}
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="microscope" size={22} color={COLORS.primary} />
          </View>
          <Text style={styles.brandText}>AidePoint</Text>
        </View>

        {/* ── Step icons with connecting line + labels ── */}
        <View style={styles.progressRow}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <View style={styles.progressItem}>
                <View
                  style={[
                    styles.stepIconCircle,
                    i === stepIndex && styles.stepIconCircleActive,
                    i < stepIndex && styles.stepIconCircleDone,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={i < stepIndex ? 'check' : STEP_ICONS[s]}
                    size={16}
                    color={i <= stepIndex ? COLORS.white : COLORS.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.stepIconLabel,
                    i === stepIndex && styles.stepIconLabelActive,
                  ]}
                >
                  {STEP_LABELS[s]}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.progressLine, i < stepIndex && styles.progressLineDone]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {!!authError && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.danger} />
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        )}

        {/* ── Step content ── */}
        <View style={styles.stepBody}>

          {/* ── Step 1: Let's get started ── */}
          {step === 'start' && (
            <>
              <Text style={styles.stepTitle}>Let's get started</Text>
              <Text style={styles.stepSubtitle}>Tell us a bit about yourself to set up your AidePoint account.</Text>

              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.inputWrapper, errors.name && styles.inputWrapperError]}>
                <MaterialCommunityIcons name="account-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="e.g. Kwame Mensah"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={(t) => { setName(t); clearField('name'); }}
                  style={styles.input}
                  maxLength={100}
                />
              </View>
              {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}

              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
                <MaterialCommunityIcons name="email-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearField('email'); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  maxLength={254}
                />
              </View>
              {errors.email && (
                <Text style={styles.fieldError}>
                  {errors.email}
                  {errors.email.includes('already exists') && (
                    <Text style={styles.privacyLink} onPress={() => navigation.navigate('SignIn')}>
                      {'  '}Sign In
                    </Text>
                  )}
                </Text>
              )}
            </>
          )}

          {/* ── Step 2: Hospital / Lab ── */}
          {step === 'hospital' && (
            <>
              <Text style={styles.stepTitle}>Where do you work?</Text>
              <Text style={styles.stepSubtitle}>Search for your hospital or lab, or add your own.</Text>

              <Text style={styles.label}>Hospital / Lab</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, errors.hospital && styles.inputWrapperError]}
                onPress={openModal}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="hospital-building"
                  size={18}
                  color={hospitalSelected ? COLORS.primary : COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <Text
                  style={[styles.hospitalInputText, !hospitalSelected && styles.hospitalInputPlaceholder]}
                  numberOfLines={1}
                >
                  {hospitalSelected || 'Search hospital or lab'}
                </Text>
                {hospitalSelected ? (
                  <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} />
                ) : (
                  <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>
              {errors.hospital && <Text style={styles.fieldError}>{errors.hospital}</Text>}

              <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
                <TouchableWithoutFeedback onPress={closeModal}>
                  <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>

                <View style={styles.modalSheet}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Hospital / Lab</Text>
                    <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalSearchRow}>
                    <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                    <TextInput
                      placeholder="Search hospital or city…"
                      placeholderTextColor={COLORS.textMuted}
                      value={hospitalQuery}
                      onChangeText={(t) => { setHospitalQuery(t); setShowCustomInput(false); }}
                      style={styles.modalSearchInput}
                      autoFocus
                      clearButtonMode="while-editing"
                      maxLength={100}
                    />
                  </View>

                  {showCustomInput && (
                    <View style={styles.customBox}>
                      <Text style={styles.customLabel}>Enter your hospital or lab name:</Text>
                      <View style={styles.customRow}>
                        <TextInput
                          placeholder="e.g. My City Lab"
                          placeholderTextColor={COLORS.textMuted}
                          value={customHospital}
                          onChangeText={setCustomHospital}
                          style={styles.customInput}
                          returnKeyType="done"
                          onSubmitEditing={handleConfirmCustom}
                          maxLength={150}
                        />
                        <TouchableOpacity
                          style={[styles.customConfirmBtn, !customHospital.trim() && styles.customConfirmBtnDisabled]}
                          onPress={handleConfirmCustom}
                          disabled={!customHospital.trim()}
                        >
                          <Text style={styles.customConfirmText}>Confirm</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <FlatList
                    data={filteredList}
                    keyExtractor={(item) => item.name}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    removeClippedSubviews
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.listItem} onPress={() => handleSelectHospital(item)} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.listItemName, hospitalSelected === item.name && { color: COLORS.primary }]}>
                            {item.name}
                          </Text>
                          {item.city ? <Text style={styles.listItemCity}>{item.city}</Text> : null}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {item.type && item.name !== 'Other' && (
                            <View style={[styles.typePill, { backgroundColor: getTypePillStyle(item.type).backgroundColor }]}>
                              <Text style={[styles.typePillText, { color: getTypePillStyle(item.type).color }]}>
                                {item.type}
                              </Text>
                            </View>
                          )}
                          {hospitalSelected === item.name && (
                            <MaterialCommunityIcons name="check" size={16} color={COLORS.primary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>{hospitalsLoading ? 'Loading…' : 'No results found'}</Text>
                    }
                  />
                </View>
              </Modal>
            </>
          )}

          {/* ── Step 3: Create password ── */}
          {step === 'password' && (
            <>
              <Text style={styles.stepTitle}>Create a password</Text>
              <Text style={styles.stepSubtitle}>Strong passwords keep your account safer.</Text>

              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                <MaterialCommunityIcons name="lock-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Create a strong password"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  style={styles.input}
                  maxLength={128}
                />
                <TouchableOpacity onPress={() => setShowPass((p) => !p)}>
                  <Feather name={showPass ? 'eye-off' : 'eye'} size={19} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {password.length > 0 && (
                <>
                  <View style={styles.strengthBarTrack}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        { width: `${(strength.score / 4) * 100}%`, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthHint, { color: strength.color }]}>{strength.label}</Text>

                  <View style={styles.checkList}>
                    {PASSWORD_CHECKS.map((c) => {
                      const pass = c.test(password);
                      return (
                        <View key={c.key} style={styles.checkRow}>
                          <MaterialCommunityIcons
                            name={pass ? 'check-circle' : 'circle-outline'}
                            size={14}
                            color={pass ? COLORS.success : COLORS.textMuted}
                          />
                          <Text style={[styles.checkText, pass ? styles.checkPass : styles.checkFail]}>
                            {c.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
              {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}

              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
                <MaterialCommunityIcons name="lock-check-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Re-enter your password"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  style={styles.input}
                  maxLength={128}
                />
                <TouchableOpacity onPress={() => setShowConfirm((p) => !p)}>
                  <Feather name={showConfirm ? 'eye-off' : 'eye'} size={19} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword}</Text>}

              <TouchableOpacity
                style={styles.privacyRow}
                onPress={() => { setAgreedToPrivacy((p) => !p); clearField('privacy'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}>
                  {agreedToPrivacy && <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />}
                </View>
                <Text style={styles.privacyText}>
                  I have read and fully understand the{' '}
                  <Text
                    style={styles.privacyLink}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
              {errors.privacy && <Text style={styles.fieldError}>{errors.privacy}</Text>}
            </>
          )}

          {/* ── Next / Create Account button ── */}
          <TouchableOpacity
            style={[styles.nextBtn, !nextEnabled && styles.nextBtnDisabled]}
            disabled={!nextEnabled || loading}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={[styles.nextBtnText, !nextEnabled && styles.nextBtnTextDisabled]}>
                  {step === 'password' ? 'Create Account' : 'Next'}
                </Text>
                {nextEnabled && <Feather name="arrow-right" size={20} color={COLORS.white} />}
              </>
            )}
          </TouchableOpacity>

          {step === 'start' && (
            <TouchableOpacity style={styles.signinRow} onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.signinText}>
                Already have an account? <Text style={styles.signinLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
