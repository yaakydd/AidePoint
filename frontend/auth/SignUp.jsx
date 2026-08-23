import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Keyboard,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { COLORS } from '../assets/theme';
import { signupStyle as styles } from '../styles/SignUpStyles';

const STEPS = ['start', 'hospital', 'password'];

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

const OTHER_HOSPITAL = {
  name: 'Other',
  city: '',
  type: null,
  isOther: true,
};

const PASSWORD_CHECKS = [
  {
    key: 'length',
    label: 'At least 8 characters',
    hint: 'at least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    key: 'upper',
    label: 'At least one uppercase letter',
    hint: 'an uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    key: 'number',
    label: 'At least one number',
    hint: 'a number',
    test: (password) => /[0-9]/.test(password),
  },
  {
    key: 'special',
    label: 'At least one special character',
    hint: 'a special character',
    test: (password) => /[@#!$%^&*()\-_=+]/.test(password),
  },
];

const getStrength = (password) => {
  const passed = PASSWORD_CHECKS.filter((check) => check.test(password)).length;

  if (passed <= 1) {
    return {
      label: 'Too weak',
      color: COLORS.danger,
      score: 1,
    };
  }

  if (passed === 2) {
    return {
      label: 'Fair',
      color: COLORS.warning,
      score: 2,
    };
  }

  if (passed === 3) {
    return {
      label: 'Strong',
      color: '#84CC16',
      score: 3,
    };
  }

  return {
    label: 'Very strong — nice work',
    color: COLORS.success,
    score: 4,
  };
};

const buildMissingRequirementsMessage = (password) => {
  const missing = PASSWORD_CHECKS.filter((check) => !check.test(password));

  if (missing.length === 0) return '';

  if (missing.length === 1) {
    return `Add ${missing[0].hint}.`;
  }

  const last = missing[missing.length - 1].hint;
  const rest = missing.slice(0, -1).map((check) => check.hint).join(', ');

  return `Add ${rest} and ${last}.`;
};

const isGenericPasswordCharsetError = (message) =>
  !!message && /at least one character of each/i.test(message);

function isDuplicateAccountError(message) {
  if (!message) return false;

  const text = String(message).toLowerCase();

  return (
    text.includes('user already registered') ||
    text.includes('email already registered') ||
    text.includes('user already exists') ||
    text.includes('email already exists')
  );
}

const getTypePillStyle = (type) => {
  const map = {
    teaching: {
      backgroundColor: COLORS.infoBg,
      color: COLORS.info,
    },
    regional: {
      backgroundColor: COLORS.successBg,
      color: COLORS.success,
    },
    district: {
      backgroundColor: COLORS.warningBg,
      color: COLORS.warning,
    },
    polyclinic: {
      backgroundColor: '#F5F3FF',
      color: '#6D28D9',
    },
    private: {
      backgroundColor: COLORS.dangerBg,
      color: COLORS.danger,
    },
    lab: {
      backgroundColor: COLORS.primaryLight,
      color: COLORS.primaryDark,
    },
  };

  return (
    map[type] ?? {
      backgroundColor: COLORS.surfaceAlt,
      color: COLORS.textSecondary,
    }
  );
};

function escapeSearchValue(value) {
  return value
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/,/g, '\\,')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

const SignUp = () => {
  const navigation = useNavigation();
  const { register, authError, clearError } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);

  const step = STEPS[stepIndex];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [hospitalQuery, setHospitalQuery] = useState('');
  const [hospitalSelected, setHospitalSelected] = useState('');

  const [filteredList, setFilteredList] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customHospital, setCustomHospital] = useState('');

  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [hospitalSearchError, setHospitalSearchError] = useState('');

  const searchRequestId = useRef(0);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);

  useFocusEffect(
    useCallback(() => {
      clearError?.();

      return () => {};
    }, [clearError])
  );

  useEffect(() => {
    if (!modalVisible) return;

    const requestId = ++searchRequestId.current;

    const timeout = setTimeout(async () => {
      const query = hospitalQuery.trim();

      setHospitalsLoading(true);
      setHospitalSearchError('');

      try {
        let request = supabase
          .from('ghana_hospitals')
          .select('name, city, type')
          .order('name')
          .limit(query ? 30 : 20);

        if (query) {
          const safeQuery = escapeSearchValue(query);

          request = request.or(
            `name.ilike.%${safeQuery}%,city.ilike.%${safeQuery}%,type.ilike.%${safeQuery}%`
          );
        }

        const { data, error } = await request;

        if (requestId !== searchRequestId.current) {
          return;
        }

        if (error) {
          if (__DEV__) {
            console.error('Hospital search error:', error);
          }

          setFilteredList([]);
          setHospitalSearchError(
            'Unable to load hospitals right now. You can choose Other.'
          );

          return;
        }

        const hospitals = Array.isArray(data) ? data : [];

        const hasOther = hospitals.some(
          (hospital) => hospital?.name?.toLowerCase() === 'other'
        );

        if (query && hospitals.length === 0) {
          setFilteredList([OTHER_HOSPITAL]);
        } else if (!hasOther) {
          setFilteredList([...hospitals, OTHER_HOSPITAL]);
        } else {
          setFilteredList(hospitals);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Unexpected hospital search error:', error);
        }

        if (requestId !== searchRequestId.current) {
          return;
        }

        setFilteredList([OTHER_HOSPITAL]);
        setHospitalSearchError(
          'Unable to search hospitals. You can choose Other.'
        );
      } finally {
        if (requestId === searchRequestId.current) {
          setHospitalsLoading(false);
        }
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [hospitalQuery, modalVisible]);

  const openModal = () => {
    Keyboard.dismiss();

    setHospitalSearchError('');
    setShowCustomInput(false);
    setCustomHospital('');

    setHospitalQuery('');

    setModalVisible(true);
  };

  const closeModal = () => {
    Keyboard.dismiss();

    setModalVisible(false);
    setShowCustomInput(false);
    setCustomHospital('');

    setHospitalQuery('');
  };

  const handleSelectHospital = (hospital) => {
    if (!hospital) return;

    if (hospital.isOther || hospital.name === 'Other') {
      setShowCustomInput(true);
      setCustomHospital('');
      setHospitalSearchError('');

      return;
    }

    const selectedName = String(hospital.name || '').trim();

    if (!selectedName) return;

    setHospitalSelected(selectedName);

    setHospitalQuery('');

    setModalVisible(false);
    setShowCustomInput(false);
    setCustomHospital('');

    clearField('hospital');
  };

  const handleConfirmCustom = () => {
    const value = customHospital.trim();

    if (!value) {
      setHospitalSearchError('Please enter your hospital or lab name.');
      return;
    }

    if (value.length < 2) {
      setHospitalSearchError(
        'Hospital or lab name must contain at least 2 characters.'
      );
      return;
    }

    setHospitalSelected(value);

    setHospitalQuery('');

    setModalVisible(false);
    setShowCustomInput(false);
    setCustomHospital('');
    setHospitalSearchError('');

    clearField('hospital');
  };

  const clearField = (key) => {
    setErrors((previous) => {
      if (!previous[key]) return previous;

      const next = { ...previous };
      delete next[key];

      return next;
    });

    clearError?.();
  };

  const validateStart = () => {
    const nextErrors = {};

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      nextErrors.name = 'Name is required';
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Invalid email address';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const validateHospital = () => {
    const nextErrors = {};

    if (!hospitalSelected.trim()) {
      nextErrors.hospital = 'Hospital / Lab is required';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const validatePassword = () => {
    const nextErrors = {};

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (strength.score < 3) {
      nextErrors.password =
        buildMissingRequirementsMessage(password) || 'Password is too weak';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreedToPrivacy) {
      nextErrors.privacy =
        'You must agree to the Privacy Policy to continue';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const isFormValid = () => {
    if (step === 'start') {
      return (
        name.trim().length > 0 &&
        email.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      );
    }

    if (step === 'hospital') {
      return hospitalSelected.trim().length > 0;
    }

    if (step === 'password') {
      return (
        password.length > 0 &&
        strength.score >= 3 &&
        confirmPassword.length > 0 &&
        password === confirmPassword &&
        agreedToPrivacy
      );
    }

    return false;
  };

  const nextEnabled = isFormValid();

  const handleBack = () => {
    if (loading) return;

    Keyboard.dismiss();

    if (modalVisible) {
      closeModal();
      return;
    }

    if (stepIndex === 0) {
      navigation.goBack();
      return;
    }

    setErrors({});
    setStepIndex((current) => current - 1);
  };

  const handleNext = async () => {
    if (loading) return;

    Keyboard.dismiss();

    if (step === 'start') {
      if (!validateStart()) {
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      setEmail(normalizedEmail);
      setErrors({});
      setStepIndex(1);

      return;
    }

    if (step === 'hospital') {
      if (!validateHospital()) {
        return;
      }

      setErrors({});
      setStepIndex(2);

      return;
    }

    if (step === 'password') {
      if (!validatePassword()) {
        return;
      }

      if (loading) return;

      setLoading(true);
      clearError?.();

      try {
        const result = await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          hospitalLab: hospitalSelected.trim(),
        });

        if (!result?.success) {
          if (isDuplicateAccountError(result?.error)) {
            setErrors({
              email:
                'An account with this email already exists. Try signing in instead.',
            });

            setStepIndex(0);
          } else if (isGenericPasswordCharsetError(result?.error)) {
            setErrors({
              password:
                buildMissingRequirementsMessage(password) ||
                'That password doesn\u2019t meet the requirements above.',
            });
          } else {
            setErrors({
              password:
                result?.error ||
                'Unable to create your account. Please try again.',
            });
          }

          return;
        }

        if (result?.needsVerification) {
          navigation.navigate('VerifyEmail', {
            email: result.email || email.trim().toLowerCase(),
          });

          return;
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Sign up error:', error);
        }

        if (isDuplicateAccountError(error?.message)) {
          setErrors({
            email:
              'An account with this email already exists. Try signing in instead.',
          });

          setStepIndex(0);
        } else if (isGenericPasswordCharsetError(error?.message)) {
          setErrors({
            password:
              buildMissingRequirementsMessage(password) ||
              'That password doesn\u2019t meet the requirements above.',
          });
        } else {
          setErrors({
            password:
              error?.message ||
              'Something went wrong while creating your account.',
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const renderHospitalItem = ({ item }) => {
    const isOther = item?.isOther || item?.name === 'Other';

    const isSelected =
      !isOther &&
      hospitalSelected.trim().toLowerCase() ===
        String(item?.name || '').trim().toLowerCase();

    if (isOther) {
      return (
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => handleSelectHospital(item)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={20}
                color={COLORS.primary}
                style={{ marginRight: 10 }}
              />

              <Text
                style={[
                  styles.listItemName,
                  {
                    color: COLORS.primary,
                  },
                ]}
              >
                Other
              </Text>
            </View>

            <Text style={styles.listItemCity}>
              Can't find your hospital or lab? Enter it manually.
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    const pillStyle = getTypePillStyle(item?.type);

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handleSelectHospital(item)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.listItemName,
              isSelected && {
                color: COLORS.primary,
              },
            ]}
          >
            {item?.name}
          </Text>

          {item?.city ? (
            <Text style={styles.listItemCity}>{item.city}</Text>
          ) : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {item?.type ? (
            <View
              style={[
                styles.typePill,
                {
                  backgroundColor: pillStyle.backgroundColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.typePillText,
                  {
                    color: pillStyle.color,
                  },
                ]}
              >
                {item.type}
              </Text>
            </View>
          ) : null}

          {isSelected ? (
            <MaterialCommunityIcons
              name="check"
              size={16}
              color={COLORS.primary}
            />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const ScrollWrapper = modalVisible ? View : KeyboardAwareScrollView;

  const scrollWrapperProps = modalVisible
    ? {
        style: styles.scrollContent,
      }
    : {
        contentContainerStyle: styles.scrollContent,
        keyboardShouldPersistTaps: 'handled',
        showsVerticalScrollIndicator: false,
        enableOnAndroid: true,
        enableAutomaticScroll: true,
        extraScrollHeight: 20,
        keyboardOpeningTime: 0,
      };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.surface}
      />

      <ScrollWrapper {...scrollWrapperProps}>
        <View style={styles.topBar}>
          {stepIndex > 0 ? (
            <TouchableOpacity
              onPress={handleBack}
              disabled={loading}
              hitSlop={{
                top: 10,
                bottom: 10,
                left: 10,
                right: 10,
              }}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
          ) : (
            <View
              style={{
                width: 24,
                height: 24,
              }}
            />
          )}
        </View>

        <View style={styles.brandRow}>
          <Image
            source={require('../assets/brand/logo-primary-teal.png')}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.progressRow}>
          {STEPS.map((currentStep, index) => (
            <React.Fragment key={currentStep}>
              <View style={styles.progressItem}>
                <View
                  style={[
                    styles.stepIconCircle,
                    index === stepIndex &&
                      styles.stepIconCircleActive,
                    index < stepIndex &&
                      styles.stepIconCircleDone,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      index < stepIndex
                        ? 'check'
                        : STEP_ICONS[currentStep]
                    }
                    size={16}
                    color={
                      index <= stepIndex
                        ? COLORS.white
                        : COLORS.textMuted
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.stepIconLabel,
                    index === stepIndex &&
                      styles.stepIconLabelActive,
                  ]}
                >
                  {STEP_LABELS[currentStep]}
                </Text>
              </View>

              {index < STEPS.length - 1 ? (
                <View
                  style={[
                    styles.progressLine,
                    index < stepIndex &&
                      styles.progressLineDone,
                  ]}
                />
              ) : null}
            </React.Fragment>
          ))}
        </View>

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

        <View style={styles.stepBody}>
          {step === 'start' && (
            <>
              <Text style={styles.stepTitle}>
                Let's get started
              </Text>

              <Text style={styles.stepSubtitle}>
                Tell us a bit about yourself to set up your
                AidePoint account.
              </Text>

              <Text style={styles.label}>
                Full Name
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  errors.name &&
                    styles.inputWrapperError,
                ]}
              >
                <MaterialCommunityIcons
                  name="account-outline"
                  size={18}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />

                <TextInput
                  placeholder="e.g. Kwame Mensah"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    clearField('name');
                  }}
                  style={styles.input}
                  maxLength={100}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              {errors.name ? (
                <Text style={styles.fieldError}>
                  {errors.name}
                </Text>
              ) : null}

              <Text style={styles.label}>
                Email Address
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  errors.email &&
                    styles.inputWrapperError,
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
                    clearField('email');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  style={styles.input}
                  maxLength={254}
                  returnKeyType="next"
                />
              </View>

              {errors.email ? (
                <Text style={styles.fieldError}>
                  {errors.email}

                  {errors.email.includes('already exists') ? (
                    <Text
                      style={styles.privacyLink}
                      onPress={() =>
                        navigation.navigate('SignIn')
                      }
                    >
                      {'  '}Sign In
                    </Text>
                  ) : null}
                </Text>
              ) : null}
            </>
          )}

          {step === 'hospital' && (
            <>
              <Text style={styles.stepTitle}>
                Where do you work?
              </Text>

              <Text style={styles.stepSubtitle}>
                Search for your hospital or lab, or add
                your own.
              </Text>

              <Text style={styles.label}>
                Hospital / Lab
              </Text>

              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  errors.hospital &&
                    styles.inputWrapperError,
                ]}
                onPress={openModal}
                activeOpacity={0.7}
                disabled={loading}
              >
                <MaterialCommunityIcons
                  name="hospital-building"
                  size={18}
                  color={
                    hospitalSelected
                      ? COLORS.primary
                      : COLORS.textMuted
                  }
                  style={styles.inputIcon}
                />

                <Text
                  style={[
                    styles.hospitalInputText,
                    !hospitalSelected &&
                      styles.hospitalInputPlaceholder,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {hospitalSelected ||
                    'Search hospital or lab'}
                </Text>

                {hospitalSelected ? (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={18}
                    color={COLORS.success}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={18}
                    color={COLORS.textMuted}
                  />
                )}
              </TouchableOpacity>

              {errors.hospital ? (
                <Text style={styles.fieldError}>
                  {errors.hospital}
                </Text>
              ) : null}

              <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={closeModal}
              >
                <View style={{ flex: 1 }}>
                  <TouchableWithoutFeedback
                    onPress={closeModal}
                  >
                    <View
                      style={styles.modalOverlay}
                    />
                  </TouchableWithoutFeedback>

                  <View style={styles.modalSheet}>
                    <View
                      style={styles.modalHeader}
                    >
                      <Text
                        style={styles.modalTitle}
                      >
                        Select Hospital / Lab
                      </Text>

                      <TouchableOpacity
                        onPress={closeModal}
                        hitSlop={{
                          top: 10,
                          bottom: 10,
                          left: 10,
                          right: 10,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={22}
                          color={
                            COLORS.textSecondary
                          }
                        />
                      </TouchableOpacity>
                    </View>

                    <View
                      style={
                        styles.modalSearchRow
                      }
                    >
                      <MaterialCommunityIcons
                        name="magnify"
                        size={18}
                        color={
                          COLORS.textMuted
                        }
                        style={
                          styles.inputIcon
                        }
                      />

                      <TextInput
                        placeholder="Search hospital or city…"
                        placeholderTextColor={
                          COLORS.textMuted
                        }
                        value={hospitalQuery}
                        onChangeText={(text) => {
                          setHospitalQuery(text);
                          setShowCustomInput(false);
                          setHospitalSearchError(
                            ''
                          );
                        }}
                        style={
                          styles.modalSearchInput
                        }
                        autoFocus
                        autoCorrect={false}
                        autoCapitalize="words"
                        clearButtonMode="while-editing"
                        maxLength={100}
                        returnKeyType="search"
                      />
                    </View>

                    {hospitalSearchError ? (
                      <Text
                        style={[
                          styles.fieldError,
                          {
                            marginHorizontal: 16,
                            marginTop: 6,
                          },
                        ]}
                      >
                        {hospitalSearchError}
                      </Text>
                    ) : null}

                    {showCustomInput ? (
                      <View
                        style={
                          styles.customBox
                        }
                      >
                        <Text
                          style={
                            styles.customLabel
                          }
                        >
                          Enter your hospital or
                          lab name:
                        </Text>

                        <View
                          style={
                            styles.customRow
                          }
                        >
                          <TextInput
                            placeholder="e.g. My City Lab"
                            placeholderTextColor={
                              COLORS.textMuted
                            }
                            value={
                              customHospital
                            }
                            onChangeText={(text) => {
                              setCustomHospital(
                                text
                              );
                              setHospitalSearchError(
                                ''
                              );
                            }}
                            style={
                              styles.customInput
                            }
                            autoFocus
                            autoCapitalize="words"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={
                              handleConfirmCustom
                            }
                            maxLength={150}
                          />

                          <TouchableOpacity
                            style={[
                              styles.customConfirmBtn,
                              !customHospital.trim() &&
                                styles.customConfirmBtnDisabled,
                            ]}
                            onPress={
                              handleConfirmCustom
                            }
                            disabled={
                              !customHospital.trim()
                            }
                          >
                            <Text
                              style={
                                styles.customConfirmText
                              }
                            >
                              Confirm
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}

                    <FlatList
                      data={filteredList}
                      keyExtractor={(item, index) =>
                        `${item?.name || 'hospital'}-${item?.city || ''}-${index}`
                      }
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{
                        paddingBottom: 24,
                      }}
                      initialNumToRender={15}
                      maxToRenderPerBatch={10}
                      windowSize={10}
                      removeClippedSubviews
                      ItemSeparatorComponent={() => (
                        <View
                          style={
                            styles.separator
                          }
                        />
                      )}
                      renderItem={
                        renderHospitalItem
                      }
                      ListHeaderComponent={
                        hospitalsLoading ? (
                          <View
                            style={{
                              paddingVertical: 18,
                              alignItems:
                                'center',
                            }}
                          >
                            <ActivityIndicator
                              size="small"
                              color={
                                COLORS.primary
                              }
                            />

                            <Text
                              style={[
                                styles.emptyText,
                                {
                                  marginTop: 8,
                                },
                              ]}
                            >
                              Searching hospitals…
                            </Text>
                          </View>
                        ) : null
                      }
                      ListEmptyComponent={
                        !hospitalsLoading ? (
                          <View
                            style={{
                              padding: 24,
                              alignItems:
                                'center',
                            }}
                          >
                            <MaterialCommunityIcons
                              name="hospital-building"
                              size={30}
                              color={
                                COLORS.textMuted
                              }
                            />

                            <Text
                              style={[
                                styles.emptyText,
                                {
                                  marginTop: 8,
                                },
                              ]}
                            >
                              No hospitals found.
                            </Text>

                            <Text
                              style={[
                                styles.listItemCity,
                                {
                                  textAlign:
                                    'center',
                                  marginTop: 4,
                                },
                              ]}
                            >
                              Choose Other below to
                              enter your hospital
                              manually.
                            </Text>

                            <TouchableOpacity
                              onPress={() =>
                                handleSelectHospital(
                                  OTHER_HOSPITAL
                                )
                              }
                              style={{
                                marginTop: 14,
                                paddingHorizontal: 18,
                                paddingVertical: 10,
                                borderRadius: 8,
                                backgroundColor:
                                  COLORS.primary,
                              }}
                            >
                              <Text
                                style={{
                                  color:
                                    COLORS.white,
                                  fontWeight:
                                    '600',
                                }}
                              >
                                Choose Other
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null
                      }
                    />
                  </View>
                </View>
              </Modal>
            </>
          )}

          {step === 'password' && (
            <>
              <Text style={styles.stepTitle}>
                Create a password
              </Text>

              <Text style={styles.stepSubtitle}>
                Strong passwords keep your account safer.
              </Text>

              <Text style={styles.label}>
                Password
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  errors.password &&
                    styles.inputWrapperError,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={18}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />

                <TextInput
                  placeholder="Create a strong password"
                  placeholderTextColor={
                    COLORS.textMuted
                  }
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearField('password');
                  }}
                  secureTextEntry={!showPass}
                  style={styles.input}
                  maxLength={128}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  returnKeyType="next"
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowPass(
                      (previous) => !previous
                    )
                  }
                  hitSlop={{
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                  }}
                >
                  <Feather
                    name={
                      showPass
                        ? 'eye-off'
                        : 'eye'
                    }
                    size={19}
                    color={
                      COLORS.textMuted
                    }
                  />
                </TouchableOpacity>
              </View>

              {password.length > 0 ? (
                <>
                  <View
                    style={
                      styles.strengthBarTrack
                    }
                  >
                    <View
                      style={[
                        styles.strengthBarFill,
                        {
                          width: `${
                            (strength.score / 4) *
                            100
                          }%`,
                          backgroundColor:
                            strength.color,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.strengthHint,
                      {
                        color:
                          strength.color,
                      },
                    ]}
                  >
                    {strength.label}
                  </Text>

                  <View
                    style={styles.checkList}
                  >
                    {PASSWORD_CHECKS.map(
                      (check) => {
                        const passed =
                          check.test(
                            password
                          );

                        return (
                          <View
                            key={check.key}
                            style={
                              styles.checkRow
                            }
                          >
                            <MaterialCommunityIcons
                              name={
                                passed
                                  ? 'check-circle'
                                  : 'circle-outline'
                              }
                              size={14}
                              color={
                                passed
                                  ? COLORS.success
                                  : COLORS.textMuted
                              }
                            />

                            <Text
                              style={[
                                styles.checkText,
                                passed
                                  ? styles.checkPass
                                  : styles.checkFail,
                              ]}
                            >
                              {
                                check.label
                              }
                            </Text>
                          </View>
                        );
                      }
                    )}
                  </View>
                </>
              ) : null}

              {errors.password ? (
                <Text style={styles.fieldError}>
                  {errors.password}
                </Text>
              ) : null}

              <Text style={styles.label}>
                Confirm Password
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  errors.confirmPassword &&
                    styles.inputWrapperError,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={18}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />

                <TextInput
                  placeholder="Re-enter your password"
                  placeholderTextColor={
                    COLORS.textMuted
                  }
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    clearField(
                      'confirmPassword'
                    );
                  }}
                  secureTextEntry={
                    !showConfirm
                  }
                  style={styles.input}
                  maxLength={128}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  returnKeyType="done"
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowConfirm(
                      (previous) =>
                        !previous
                    )
                  }
                  hitSlop={{
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                  }}
                >
                  <Feather
                    name={
                      showConfirm
                        ? 'eye-off'
                        : 'eye'
                    }
                    size={19}
                    color={
                      COLORS.textMuted
                    }
                  />
                </TouchableOpacity>
              </View>

              {errors.confirmPassword ? (
                <Text style={styles.fieldError}>
                  {errors.confirmPassword}
                </Text>
              ) : null}

              <TouchableOpacity
                style={styles.privacyRow}
                onPress={() => {
                  setAgreedToPrivacy(
                    (previous) =>
                      !previous
                  );

                  clearField('privacy');
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    agreedToPrivacy &&
                      styles.checkboxChecked,
                  ]}
                >
                  {agreedToPrivacy ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={COLORS.white}
                    />
                  ) : null}
                </View>

                <Text
                  style={styles.privacyText}
                >
                  I have read and fully
                  understand the{' '}

                  <Text
                    style={
                      styles.privacyLink
                    }
                    onPress={() =>
                      navigation.navigate(
                        'PrivacyPolicy'
                      )
                    }
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>

              {errors.privacy ? (
                <Text style={styles.fieldError}>
                  {errors.privacy}
                </Text>
              ) : null}
            </>
          )}

          <TouchableOpacity
            style={[
              styles.nextBtn,
              !nextEnabled &&
                styles.nextBtnDisabled,
            ]}
            disabled={!nextEnabled || loading}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator
                color={COLORS.white}
              />
            ) : (
              <>
                <Text
                  style={[
                    styles.nextBtnText,
                    !nextEnabled &&
                      styles.nextBtnTextDisabled,
                  ]}
                >
                  {step === 'password'
                    ? 'Create Account'
                    : 'Next'}
                </Text>

                {nextEnabled ? (
                  <Feather
                    name="arrow-right"
                    size={20}
                    color={COLORS.white}
                  />
                ) : null}
              </>
            )}
          </TouchableOpacity>

          {step === 'start' ? (
            <TouchableOpacity
              style={styles.signinRow}
              onPress={() =>
                navigation.navigate(
                  'SignIn'
                )
              }
              disabled={loading}
            >
              <Text
                style={styles.signinText}
              >
                Already have an account?{' '}
                <Text
                  style={
                    styles.signinLink
                  }
                >
                  Sign In
                </Text>
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollWrapper>
    </SafeAreaView>
  );
};

export default SignUp;
