import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import {
  buildReport,
  saveReport,
  resolveConditionKey,
} from '../utils/ReportUtils';
import { scanStyles as styles } from '../styles/ScanStyles';
import { analyzeBloodSmear } from '../utils/api';
import { prepareImage, stabilizeImage } from '../utils/imageUtils';
import {
  getRemainingScans,
  recordScan,
  uploadScanImage,
} from '../utils/scanStorage';
import { getPlan } from '../constants/SubscriptionPlans';
import TransparencyTrail from '../components/TransparencyTrail';
import Header from '../components/Header';
import { COLORS, SPACING, HEADER } from '../assets/theme';

const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;
const GENDERS = ['Male', 'Female'];

function generateScanId() {
  const year = new Date().getFullYear();
  const timePart = Date.now().toString(36).toUpperCase().slice(-4);
  const randomPart = Math.floor(100 + Math.random() * 900);

  return `AP-${year}-${timePart}${randomPart}`;
}

function getUpgradeMessage(plan) {
  if (plan.id === 'basic') {
    return `You've used all ${plan.scans.dailyLimit} Basic scans for today.\n\nUpgrade to Max for 30 scans/day, or Pro for unlimited scans.`;
  }

  if (plan.id === 'max') {
    return `You've used all ${plan.scans.dailyLimit} Max scans for today.\n\nUpgrade to Pro for unlimited scans.`;
  }

  return 'Daily scan limit reached.';
}

/**
 * Validates an individual field.
 *
 * IMPORTANT:
 * Empty values are handled separately by isFormValid and
 * handleStartAnalysis because these fields are required.
 */
function validateField(field, value) {
  switch (field) {
    case 'patientName': {
      if (value && value.trim().length < 2) {
        return 'Name looks too short';
      }

      return '';
    }

    case 'age': {
      if (!value) {
        return '';
      }

      const n = parseInt(value, 10);

      if (isNaN(n) || n <= 0 || n > 120) {
        return 'Enter a valid age (1–120)';
      }

      return '';
    }

    case 'temperature': {
      if (!value) {
        return '';
      }

      const n = parseFloat(value);

      if (isNaN(n) || n < 30 || n > 43) {
        return 'Enter a plausible temp (30–43°C)';
      }

      return '';
    }

    case 'bloodPressure': {
      if (!value) {
        return '';
      }

      if (!/^\d{2,3}\/\d{2,3}$/.test(value.trim())) {
        return 'Format as systolic/diastolic, e.g. 120/80';
      }

      return '';
    }

    default:
      return '';
  }
}

const Scan = ({ navigation, route }) => {
  const { user } = useAuth();

  const plan = getPlan(user?.subscriptionTier);
  const labTechName = user?.name ?? 'Lab Technician';

  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [temperature, setTemperature] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');

  const [errors, setErrors] = useState({});

  const [image, setImage] = useState(null);
  const [imageSourceType, setImageSourceType] = useState(null);

  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  const [scanId, setScanId] = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [remaining, setRemaining] = useState(null);

  const [showResetTip, setShowResetTip] = useState(false);
  const [resultModal, setResultModal] = useState(null);

  const tipOpacity = useRef(new Animated.Value(0)).current;

  /**
   * Generate the initial scan ID and load remaining scans.
   */
  useEffect(() => {
    setScanId(generateScanId());
    loadRemaining();
  }, []);

  async function loadRemaining() {
    if (!user?.id) {
      return;
    }

    try {
      const r = await getRemainingScans(user.id, plan);
      setRemaining(r);
    } catch (error) {
      console.error('Failed to load remaining scans:', error);
    }
  }

  /**
   * Receive a photo captured from the Camera screen.
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const photo = route.params?.capturedPhoto;

      if (!photo) {
        return;
      }

      (async () => {
        try {
          const safeUri = await stabilizeImage(photo);

          setImage(safeUri);
          setImageSourceType('camera');

          // Clear any previous image validation error.
          setErrors((prev) => ({
            ...prev,
            image: '',
          }));
        } catch (err) {
          console.error('Camera image stabilize failed:', err);

          Alert.alert(
            'Error',
            'Could not process the captured photo. Please try again.'
          );
        }
      })();

      navigation.setParams({
        capturedPhoto: undefined,
      });
    });

    return unsubscribe;
  }, [navigation, route.params]);

  /**
   * Validate a field and immediately update its error state.
   *
   * This is used while the user is typing / leaving a field.
   */
  function runValidation(field, value) {
    const msg = validateField(field, value);

    setErrors((prev) => ({
      ...prev,
      [field]: msg,
    }));

    return msg;
  }

  /**
   * True when at least one validation error currently exists.
   */
  const hasFieldErrors = Object.values(errors).some(Boolean);

  /**
   * Overall form validity.
   *
   * This is intentionally separate from isAnalysing.
   *
   * isFormValid answers:
   * "Is all required information valid?"
   *
   * isAnalysing answers:
   * "Is an analysis currently running?"
   */
  const isFormValid =
    patientName.trim().length > 0 &&
    patientAge.trim().length > 0 &&
    patientGender.trim().length > 0 &&
    temperature.trim().length > 0 &&
    bloodPressure.trim().length > 0 &&
    !!image &&
    !hasFieldErrors;

  function openCamera() {
    if (isAnalysing) {
      return;
    }

    navigation.navigate('Camera', {
      existingData: {
        patientName,
        patientAge,
        patientGender,
        temperature,
        bloodPressure,
      },
    });
  }

  /**
   * Retake only when current image came from camera.
   */
  function retakePhoto() {
    if (isAnalysing) {
      return;
    }

    setImage(null);
    setImageSourceType(null);

    navigation.navigate('Camera', {
      existingData: {
        patientName,
        patientAge,
        patientGender,
        temperature,
        bloodPressure,
      },
    });
  }

  /**
   * Re-upload only when current image came from gallery.
   */
  function reuploadPhoto() {
    if (isAnalysing) {
      return;
    }

    setImage(null);
    setImageSourceType(null);

    handlePickFile();
  }

  /**
   * Select an image from the gallery.
   */
  async function handlePickFile() {
    if (isAnalysing) {
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your gallery.'
        );

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled) {
        return;
      }

      const pickedUri = result.assets[0].uri;
      const safeUri = await stabilizeImage(pickedUri);

      setImage(safeUri);
      setImageSourceType('upload');

      // Clear previous image validation error.
      setErrors((prev) => ({
        ...prev,
        image: '',
      }));
    } catch (error) {
      console.error('Image picker error:', error);

      Alert.alert(
        'Upload Failed',
        'Unable to select image.'
      );
    }
  }

  /**
   * Reset button behavior.
   */
  function handleResetPress() {
    if (isAnalysing) {
      return;
    }

    if (showResetTip) {
      triggerReset();
      return;
    }

    setShowResetTip(true);

    Animated.sequence([
      Animated.timing(tipOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(tipOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowResetTip(false));
  }

  /**
   * Actually reset the form.
   */
  function triggerReset() {
    Alert.alert(
      'Reset Form',
      'Clear all entered data?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setPatientName('');
            setPatientAge('');
            setPatientGender('');
            setTemperature('');
            setBloodPressure('');

            setErrors({});

            setImage(null);
            setImageSourceType(null);
            setImageViewerOpen(false);

            setScanId(generateScanId());
          },
        },
      ]
    );
  }

  /**
   * Final validation + analysis.
   *
   * IMPORTANT:
   * The button being disabled is the first protection.
   * This validation is the second protection.
   *
   * Even if something somehow bypasses the UI state,
   * invalid data will not enter the analysis pipeline.
   */
  const handleStartAnalysis = async () => {
    const validationErrors = {};

    /**
     * Validate every field again immediately before analysis.
     */
    const fieldsToValidate = {
      patientName: ['patientName', patientName],
      age: ['age', patientAge],
      temperature: ['temperature', temperature],
      bloodPressure: ['bloodPressure', bloodPressure],
    };

    Object.values(fieldsToValidate).forEach(([field, value]) => {
      const error = validateField(field, value);

      if (error) {
        validationErrors[field] = error;
      }
    });

    /**
     * Required field checks.
     */
    if (!patientName.trim()) {
      validationErrors.patientName = 'Enter patient name';
    }

    if (!patientAge.trim()) {
      validationErrors.age = 'Enter patient age';
    }

    if (!patientGender) {
      validationErrors.patientGender = 'Select patient gender';
    }

    if (!temperature.trim()) {
      validationErrors.temperature = 'Enter temperature';
    }

    if (!bloodPressure.trim()) {
      validationErrors.bloodPressure = 'Enter blood pressure';
    }

    if (!image) {
      validationErrors.image =
        'Capture or upload a blood smear image';
    }

    /**
     * If ANY field is invalid, do not start analysis.
     */
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    /**
     * Everything is valid.
     * Lock the screen and begin analysis.
     */
    setIsAnalysing(true);

    try {
      /**
       * Prepare/compress the image.
       */
      const compressedUri = await prepareImage(image);

      /**
       * Create the patient record.
       */
      const { data: patientRow, error: patientErr } =
        await supabase
          .from('patients')
          .insert({
            created_by: user.id,
            name: patientName.trim(),
            age: parseInt(patientAge, 10),
            gender: patientGender.toLowerCase(),
          })
          .select('id')
          .single();

      if (patientErr) {
        throw patientErr;
      }

      /**
       * Send the image and patient information to the backend.
       */
      const prediction = await analyzeBloodSmear(
        compressedUri,
        patientRow.id,
        temperature.trim(),
        bloodPressure.trim()
      );

      /**
       * Upload the processed image.
       */
      const storedImagePath = await uploadScanImage(
        user.id,
        compressedUri,
        scanId
      );

      /**
       * Backend condition is the source of truth.
       *
       * resolveConditionKey remains only as a fallback if
       * prediction.condition is missing.
       */
      const conditionKey =
        prediction.condition ??
        resolveConditionKey(
          prediction.is_anemic,
          prediction.morphology_findings,
          prediction.is_unreliable
        );

      /**
       * Build the report.
       */
      const report = buildReport({
        patientName: patientName.trim(),
        patientId: patientRow.id,

        condition: conditionKey,

        isAnemic: prediction.is_anemic,

        confidence: prediction.anemia_probability,

        confidenceLabel:
          prediction.explanation?.confidence ?? 'moderate',

        labTechName,

        image_url: storedImagePath,

        temperature: temperature.trim(),
        bloodPressure: bloodPressure.trim(),

        morphologyFindings:
          prediction.morphology_findings,

        cbcPatternSummary:
          prediction.cbc_pattern_summary,

        isUnreliable:
          prediction.is_unreliable,

        unreliableReasons:
          prediction.unreliable_reasons,

        imageQuality:
          prediction.image_quality,

        cellOverlay:
          prediction.cell_overlay,

        scanId,
      });

      /**
       * Save the scan record.
       */
      const { data: scanRow, error: scanErr } =
        await supabase
          .from('scans')
          .insert({
            patient_id: patientRow.id,
            created_by: user.id,
            image_url: storedImagePath,
            status: 'done',
            prediction_id: prediction.prediction_id,
            condition: conditionKey,
          })
          .select('id')
          .single();

      if (scanErr) {
        throw scanErr;
      }

      report.id = scanRow.id;

      /**
       * Save the final report.
       */
      await saveReport(report, user.id);

      /**
       * Record scan usage.
       */
      const usage = await recordScan(user.id, plan);

      setRemaining(usage.remaining);

      /**
       * Show result.
       */
      setResultModal({
        prediction,
        report,
        bonusJustGranted: usage.bonusJustGranted,
        bonusRemaining: usage.bonusRemaining,
        remaining: usage.remaining,
      });

      /**
       * Reset form after successful analysis.
       */
      setPatientName('');
      setPatientAge('');
      setPatientGender('');
      setTemperature('');
      setBloodPressure('');

      setErrors({});

      setImage(null);
      setImageSourceType(null);

      setScanId(generateScanId());
    } catch (error) {
      console.error('Analysis failed:', error);

      Alert.alert(
        'Analysis Failed',
        'Something went wrong while analysing the blood smear. Please try again.'
      );
    } finally {
      /**
       * Always unlock the screen, whether analysis succeeds
       * or fails.
       */
      setIsAnalysing(false);
    }
  };

  /**
   * Validation message shown below the form.
   */
  function getValidationHint() {
    if (!patientName.trim()) {
      return 'Enter patient name';
    }

    if (!patientAge.trim()) {
      return 'Enter patient age';
    }

    if (!patientGender) {
      return 'Select patient gender';
    }

    if (!temperature.trim()) {
      return 'Enter temperature';
    }

    if (!bloodPressure.trim()) {
      return 'Enter blood pressure';
    }

    if (!image) {
      return 'Capture or upload a blood smear image';
    }

    if (hasFieldErrors) {
      return 'Fix the highlighted fields above';
    }

    return '';
  }

  const scanLimitLabel =
    remaining === null
      ? ''
      : remaining === Infinity
        ? 'Unlimited scans'
        : `${remaining} scan${
            remaining !== 1 ? 's' : ''
          } remaining today`;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['left', 'right', 'bottom']}
    >
      <Header
        left={
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isAnalysing}
          >
            <MaterialIcons
              name="arrow-back-ios-new"
              size={HEADER.iconSize}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        }
        center={
          <Text style={styles.headerTitle}>
            Scan
          </Text>
        }
        right={
          <View style={styles.resetWrapper}>
            <TouchableOpacity
              style={styles.resetIconBtn}
              onPress={handleResetPress}
              disabled={isAnalysing}
            >
              <MaterialIcons
                name="restart-alt"
                size={22}
                color={COLORS.danger}
              />
            </TouchableOpacity>

            {showResetTip && (
              <Animated.View
                style={[
                  styles.resetTooltip,
                  { opacity: tipOpacity },
                ]}
              >
                <View style={styles.resetTooltipCaret} />

                <MaterialIcons
                  name="info-outline"
                  size={12}
                  color={COLORS.white}
                  style={{ marginRight: 4 }}
                />

                <Text style={styles.resetTooltipText}>
                  Tap again to reset
                </Text>
              </Animated.View>
            )}
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: TAB_BAR_CLEARANCE },
        ]}
      >
        {/* SCAN USAGE */}
        <View style={styles.usageBanner}>
          <Text style={styles.usageBannerLabel}>
            SCANS TODAY
          </Text>

          <Text
            style={[
              styles.usageBannerValue,
              remaining === 0 &&
                styles.usageBannerValueWarning,
            ]}
          >
            {scanLimitLabel || '—'}
          </Text>
        </View>

        {/* SCAN ID */}
        <View style={styles.scanIdCard}>
          <View style={styles.scanIdLeft}>
            <MaterialCommunityIcons
              name="fingerprint"
              size={18}
              color={COLORS.textMuted}
            />

            <Text style={styles.scanIdLabel}>
              SCAN ID
            </Text>
          </View>

          <View style={styles.scanIdRight}>
            <Text style={styles.scanIdValue}>
              {scanId}
            </Text>
          </View>
        </View>

        {/* PATIENT INFORMATION */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="account-outline"
            size={20}
            color={COLORS.primary}
          />

          <Text style={styles.sectionTitle}>
            Patient Information
          </Text>
        </View>

        {/* PATIENT NAME */}
        <Text style={styles.inputLabel}>
          Patient Name
        </Text>

        <TextInput
          placeholder="e.g. John Doe"
          placeholderTextColor={COLORS.textMuted}
          value={patientName}
          onChangeText={(text) => {
            setPatientName(text);

            runValidation(
              'patientName',
              text
            );
          }}
          onBlur={() =>
            runValidation(
              'patientName',
              patientName
            )
          }
          style={[
            styles.input,
            errors.patientName &&
              styles.inputError,
          ]}
          editable={!isAnalysing}
        />

        {!!errors.patientName && (
          <Text style={styles.fieldErrorText}>
            {errors.patientName}
          </Text>
        )}

        {/* AGE + GENDER */}
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.inputLabel}>
              Age
            </Text>

            <TextInput
              placeholder="e.g. 34"
              placeholderTextColor={COLORS.textMuted}
              value={patientAge}
              onChangeText={(text) => {
                const value =
                  text.replace(/\D/g, '');

                setPatientAge(value);

                runValidation(
                  'age',
                  value
                );
              }}
              onBlur={() =>
                runValidation(
                  'age',
                  patientAge
                )
              }
              keyboardType="number-pad"
              maxLength={3}
              style={[
                styles.input,
                styles.half,
                errors.age &&
                  styles.inputError,
              ]}
              editable={!isAnalysing}
            />

            {!!errors.age && (
              <Text style={styles.fieldErrorText}>
                {errors.age}
              </Text>
            )}
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.inputLabel}>
              Gender
            </Text>

            <View style={styles.genderPillRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderPill,
                    patientGender === g &&
                      styles.genderPillActive,
                  ]}
                  onPress={() => {
                    setPatientGender(g);

                    setErrors((prev) => ({
                      ...prev,
                      patientGender: '',
                    }));
                  }}
                  activeOpacity={0.8}
                  disabled={isAnalysing}
                >
                  <MaterialCommunityIcons
                    name={
                      g === 'Male'
                        ? 'gender-male'
                        : 'gender-female'
                    }
                    size={15}
                    color={
                      patientGender === g
                        ? '#fff'
                        : COLORS.textMuted
                    }
                    style={{
                      marginRight: SPACING.xs,
                    }}
                  />

                  <Text
                    style={[
                      styles.genderPillText,
                      patientGender === g &&
                        styles.genderPillTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {!!errors.patientGender && (
              <Text style={styles.fieldErrorText}>
                {errors.patientGender}
              </Text>
            )}
          </View>
        </View>

        {/* TEMPERATURE + BLOOD PRESSURE */}
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.inputLabel}>
              Temperature (°C)
            </Text>

            <TextInput
              placeholder="e.g. 36.5"
              placeholderTextColor={COLORS.textMuted}
              value={temperature}
              onChangeText={(text) => {
                setTemperature(text);

                runValidation(
                  'temperature',
                  text
                );
              }}
              onBlur={() =>
                runValidation(
                  'temperature',
                  temperature
                )
              }
              keyboardType="decimal-pad"
              style={[
                styles.input,
                styles.half,
                errors.temperature &&
                  styles.inputError,
              ]}
              editable={!isAnalysing}
            />

            {!!errors.temperature && (
              <Text style={styles.fieldErrorText}>
                {errors.temperature}
              </Text>
            )}
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.inputLabel}>
              Blood Pressure
            </Text>

            <TextInput
              placeholder="120/80"
              placeholderTextColor={COLORS.textMuted}
              value={bloodPressure}
              onChangeText={(text) => {
                setBloodPressure(text);

                runValidation(
                  'bloodPressure',
                  text
                );
              }}
              onBlur={() =>
                runValidation(
                  'bloodPressure',
                  bloodPressure
                )
              }
              keyboardType="decimal-pad"
              style={[
                styles.input,
                styles.half,
                errors.bloodPressure &&
                  styles.inputError,
              ]}
              editable={!isAnalysing}
            />

            {!!errors.bloodPressure && (
              <Text style={styles.fieldErrorText}>
                {errors.bloodPressure}
              </Text>
            )}
          </View>
        </View>

        {/* BLOOD SMEAR */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="image-outline"
            size={20}
            color={COLORS.primary}
          />

          <Text style={styles.sectionTitle}>
            Blood Smear Sample
          </Text>
        </View>

        {!image && (
          <TouchableOpacity
            style={styles.takePictureBtn}
            onPress={openCamera}
            disabled={isAnalysing}
          >
            <MaterialIcons
              name="photo-camera"
              size={22}
              color={COLORS.primary}
            />

            <Text style={styles.takePictureText}>
              Take Picture
            </Text>
          </TouchableOpacity>
        )}

        {image && (
          <View style={styles.previewWrapper}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.previewBox}
              onPress={() =>
                !isAnalysing &&
                setImageViewerOpen(true)
              }
            >
              <Image
                source={{ uri: image }}
                style={styles.previewImage}
              />

              <View style={styles.previewZoomHint}>
                <MaterialIcons
                  name="zoom-in"
                  size={16}
                  color="#fff"
                />

                <Text style={styles.previewZoomText}>
                  Tap to enlarge
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={
                imageSourceType === 'upload'
                  ? reuploadPhoto
                  : retakePhoto
              }
              style={styles.retakeBtn}
              disabled={isAnalysing}
            >
              <MaterialIcons
                name={
                  imageSourceType === 'upload'
                    ? 'file-upload'
                    : 'refresh'
                }
                size={16}
                color={COLORS.primary}
              />

              <Text style={styles.retakeText}>
                {imageSourceType === 'upload'
                  ? 'Re-upload Image'
                  : 'Retake Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!imageSourceType && (
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconCircle}>
              <MaterialCommunityIcons
                name="cloud-upload-outline"
                size={34}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.uploadTitle}>
              Upload Blood Smear File
            </Text>

            <Text style={styles.uploadSub}>
              PNG or JPG images supported
            </Text>

            <TouchableOpacity
              style={styles.browseBtn}
              onPress={handlePickFile}
              disabled={isAnalysing}
            >
              <Text style={styles.browseBtnText}>
                Browse Files
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* VALIDATION SUMMARY */}
        {!isFormValid && (
          <View style={styles.validationContainer}>
            <MaterialIcons
              name="error-outline"
              size={16}
              color={COLORS.danger}
            />

            <Text style={styles.validationHint}>
              {getValidationHint()}
            </Text>
          </View>
        )}

        {/* START ANALYSIS */}
        <TouchableOpacity
          style={[
            styles.button,
            (!isFormValid || isAnalysing) &&
              styles.disabledButton,
          ]}
          disabled={!isFormValid || isAnalysing}
          onPress={handleStartAnalysis}
        >
          {isAnalysing ? (
            <>
              <ActivityIndicator
                size="small"
                color="#fff"
              />

              <Text style={styles.buttonText}>
                {' '}
                Analysing…
              </Text>
            </>
          ) : (
            <>
              <MaterialIcons
                name="analytics"
                size={20}
                color="#fff"
              />

              <Text style={styles.buttonText}>
                {' '}
                Start Analysis
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hipaaText}>
          By starting analysis, you agree to
          processing of medical data in accordance
          with GHS standards.
        </Text>
      </ScrollView>

      {/* IMAGE VIEWER */}
      <Modal
        visible={imageViewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setImageViewerOpen(false)
        }
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.closeViewer}
            onPress={() =>
              setImageViewerOpen(false)
            }
          >
            <MaterialIcons
              name="close"
              size={28}
              color="#fff"
            />
          </TouchableOpacity>

          {image && (
            <Image
              source={{ uri: image }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* RESULT MODAL */}
      {resultModal && (
        <TransparencyTrail
          data={resultModal}
          userId={user.id}
          onClose={() => {
            setResultModal(null);
            navigation.navigate('Report');
          }}
          onViewReport={() => {
            setResultModal(null);
            navigation.navigate('Report', {
              scanId: resultModal.report?.id,
            });
          }}
        />
      )}

      {/* ANALYSIS OVERLAY */}
      {isAnalysing && (
        <View
          pointerEvents="auto"
          style={styles.analysisOverlay}
        >
          <ActivityIndicator
            size="large"
            color="#fff"
          />

          <Text style={styles.analysisText}>
            Analysing blood smear...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Scan;
