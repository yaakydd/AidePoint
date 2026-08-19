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
} from 'reactnative';
import { SafeAreaView } from 'reactnativesafeareacontext';
import * as ImagePicker from 'expoimagepicker';
import {
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vectoricons';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

import {
  buildReport,
  saveReport,
  resolveConditionKey,
} from '../utils/ReportUtils';

import { scanStyles as styles } from '../styles/ScanStyles';

import { analyzeBloodSmear } from '../utils/api';
import {
  prepareImage,
  stabilizeImage,
} from '../utils/imageUtils';

import {
  getRemainingScans,
  recordScan,
  uploadScanImage,
} from '../utils/scanStorage';

import { getPlan } from '../constants/SubscriptionPlans';

import TransparencyTrail from '../components/TransparencyTrail';
import Header from '../components/Header';

import {
  COLORS,
  SPACING,
  HEADER,
  FONTS,
  RADIUS,
  SHADOWS,
  scale,
  vScale,
} from '../assets/theme';

const TAB_BAR_CLEARANCE =
  Platform.OS === 'ios' ? 105 : 90;

const GENDERS = ['Male', 'Female'];

/* 
   HELPERS
 */

function generateScanId() {
  const year = new Date().getFullYear();

  const timePart = Date.now()
    .toString(36)
    .toUpperCase()
    .slice(4);

  const randomPart = Math.floor(
    100 + Math.random() * 900
  );

  return `AP${year}${timePart}${randomPart}`;
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
 * Validate an individual field.
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

      if (
        !/^\d{2,3}\/\d{2,3}$/.test(
          value.trim()
        )
      ) {
        return 'Format as systolic/diastolic, e.g. 120/80';
      }

      return '';
    }

    default:
      return '';
  }
}

/* 
   ANALYSIS MODAL
 */

const AnalysisModal = ({
  visible,
  stage = 'Preparing image...',
}) => {
  const pulseAnim = useRef(
    new Animated.Value(1)
  ).current;

  const rotateAnim = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();

      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    };
  }, [visible, pulseAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Intentionally empty.
        // Analysis cannot be dismissed while running.
      }}
    >
      <View style={analysisStyles.overlay}>
        <View style={analysisStyles.card}>

          {/* Animated icon */}
          <Animated.View
            style={[
              analysisStyles.iconOuter,
              {
                transform: [
                  {
                    scale: pulseAnim,
                  },
                ],
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate,
                  },
                ],
              }}
            >
              <MaterialCommunityIcons
                name="microscope"
                size={38}
                color={COLORS.primary}
              />
            </Animated.View>
          </Animated.View>

          {/* Title */}
          <Text style={analysisStyles.title}>
            Analysing Blood Smear
          </Text>

          {/* Description */}
          <Text style={analysisStyles.description}>
            Please wait while AidePoint processes
            the blood smear image.
          </Text>

          {/* Current stage */}
          <View style={analysisStyles.stageBox}>
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
            />

            <Text style={analysisStyles.stageText}>
              {stage}
            </Text>
          </View>

          {/* Security message */}
          <View style={analysisStyles.infoRow}>
            <MaterialCommunityIcons
              name="shieldcheckoutline"
              size={17}
              color={COLORS.success}
            />

            <Text style={analysisStyles.infoText}>
              Please keep this screen open
            </Text>
          </View>

        </View>
      </View>
    </Modal>
  );
};

/* 
   SCREEN
 */

const Scan = ({ navigation, route }) => {
  const { user } = useAuth();

  const plan = getPlan(
    user?.subscriptionTier
  );

  const labTechName =
    user?.name ?? 'Lab Technician';

  /* 
     FORM STATE
   */

  const [patientName, setPatientName] =
    useState('');

  const [patientAge, setPatientAge] =
    useState('');

  const [patientGender, setPatientGender] =
    useState('');

  const [temperature, setTemperature] =
    useState('');

  const [bloodPressure, setBloodPressure] =
    useState('');

  const [errors, setErrors] =
    useState({});

  /* 
     IMAGE STATE
   */

  const [image, setImage] =
    useState(null);

  const [imageSourceType, setImageSourceType] =
    useState(null);

  const [imageViewerOpen, setImageViewerOpen] =
    useState(false);

  /* 
     SCAN STATE
   */

  const [scanId, setScanId] =
    useState('');

  const [isAnalysing, setIsAnalysing] =
    useState(false);

  const [analysisStage, setAnalysisStage] =
    useState('Preparing image...');

  const [remaining, setRemaining] =
    useState(null);

  /* 
     UI STATE
   */

  const [showResetTip, setShowResetTip] =
    useState(false);

  const [resultModal, setResultModal] =
    useState(null);

  const tipOpacity =
    useRef(new Animated.Value(0)).current;

  /**
   * Reflevel lock.
   *
   * State alone is not enough protection against
   * extremely fast repeated presses because React
   * state updates are asynchronous.
   *
   * This ref provides an immediate synchronous lock.
   */
  const analysisLock =
    useRef(false);

  /* 
     INITIALIZATION
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
      const r = await getRemainingScans(
        user.id,
        plan
      );

      setRemaining(r);
    } catch (error) {
      console.error(
        'Failed to load remaining scans:',
        error
      );
    }
  }

  /* 
     CAMERA RESULT
   */

  useEffect(() => {
    const unsubscribe =
      navigation.addListener(
        'focus',
        () => {
          if (isAnalysing) {
            return;
          }

          const photo =
            route.params?.capturedPhoto;

          if (!photo) {
            return;
          }

          (async () => {
            try {
              const safeUri =
                await stabilizeImage(photo);

              setImage(safeUri);
              setImageSourceType('camera');

              setErrors((prev) => ({
                ...prev,
                image: '',
              }));
            } catch (err) {
              console.error(
                'Camera image stabilize failed:',
                err
              );

              Alert.alert(
                'Error',
                'Could not process the captured photo. Please try again.'
              );
            }
          })();

          navigation.setParams({
            capturedPhoto: undefined,
          });
        }
      );

    return unsubscribe;
  }, [
    navigation,
    route.params,
    isAnalysing,
  ]);

  /* 
     VALIDATION
   */

  function runValidation(
    field,
    value
  ) {
    const msg = validateField(
      field,
      value
    );

    setErrors((prev) => ({
      ...prev,
      [field]: msg,
    }));

    return msg;
  }

  const hasFieldErrors =
    Object.values(errors).some(Boolean);

  const isFormValid =
    patientName.trim().length > 0 &&
    patientAge.trim().length > 0 &&
    patientGender.trim().length > 0 &&
    temperature.trim().length > 0 &&
    bloodPressure.trim().length > 0 &&
    !!image &&
    !hasFieldErrors;

  /* 
     CAMERA / IMAGE ACTIONS
   */

  function openCamera() {
    if (isAnalysing || analysisLock.current) {
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

  function retakePhoto() {
    if (isAnalysing || analysisLock.current) {
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

  function reuploadPhoto() {
    if (isAnalysing || analysisLock.current) {
      return;
    }

    setImage(null);
    setImageSourceType(null);

    handlePickFile();
  }

  async function handlePickFile() {
    if (isAnalysing || analysisLock.current) {
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

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
          allowsEditing: false,
        });

      if (result.canceled) {
        return;
      }

      const pickedUri =
        result.assets?.[0]?.uri;

      if (!pickedUri) {
        return;
      }

      const safeUri =
        await stabilizeImage(pickedUri);

      setImage(safeUri);
      setImageSourceType('upload');

      setErrors((prev) => ({
        ...prev,
        image: '',
      }));
    } catch (error) {
      console.error(
        'Image picker error:',
        error
      );

      Alert.alert(
        'Upload Failed',
        'Unable to select image.'
      );
    }
  }

  /* 
     RESET
   */

  function handleResetPress() {
    if (isAnalysing || analysisLock.current) {
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
    ]).start(() =>
      setShowResetTip(false)
    );
  }

  function triggerReset() {
    if (isAnalysing) {
      return;
    }

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

  /* 
     START ANALYSIS
   */

  const handleStartAnalysis =
    async () => {
      /**
       * Immediate synchronous lock.
       *
       * This prevents double taps before React has
       * had a chance to update isAnalysing.
       */
      if (
        analysisLock.current ||
        isAnalysing
      ) {
        return;
      }

      const validationErrors = {};

      /* 
         Revalidate everything immediately before
         entering the analysis pipeline.
       */

      const fieldsToValidate = {
        patientName: [
          'patientName',
          patientName,
        ],

        age: [
          'age',
          patientAge,
        ],

        temperature: [
          'temperature',
          temperature,
        ],

        bloodPressure: [
          'bloodPressure',
          bloodPressure,
        ],
      };

      Object.values(
        fieldsToValidate
      ).forEach(
        ([field, value]) => {
          const error =
            validateField(
              field,
              value
            );

          if (error) {
            validationErrors[field] =
              error;
          }
        }
      );

      /* 
         Required fields
       */

      if (!patientName.trim()) {
        validationErrors.patientName =
          'Enter patient name';
      }

      if (!patientAge.trim()) {
        validationErrors.age =
          'Enter patient age';
      }

      if (!patientGender) {
        validationErrors.patientGender =
          'Select patient gender';
      }

      if (!temperature.trim()) {
        validationErrors.temperature =
          'Enter temperature';
      }

      if (!bloodPressure.trim()) {
        validationErrors.bloodPressure =
          'Enter blood pressure';
      }

      if (!image) {
        validationErrors.image =
          'Capture or upload a blood smear image';
      }

      /* 
         Stop if validation failed
       */

      if (
        Object.keys(validationErrors)
          .length > 0
      ) {
        setErrors(
          validationErrors
        );

        return;
      }

      /* 
         LOCK EVERYTHING
       */

      analysisLock.current = true;
      setIsAnalysing(true);

      try {
        /* 
           1. Prepare image
         */

        setAnalysisStage(
          'Preparing blood smear image...'
        );

        const compressedUri =
          await prepareImage(image);

        if (!compressedUri) {
          throw new Error(
            'Image preparation failed.'
          );
        }

        /* 
           2. Create patient
         */

        setAnalysisStage(
          'Creating patient record...'
        );

        const {
          data: patientRow,
          error: patientErr,
        } = await supabase
          .from('patients')
          .insert({
            created_by: user.id,
            name: patientName.trim(),
            age: parseInt(
              patientAge,
              10
            ),
            gender:
              patientGender.toLowerCase(),
          })
          .select('id')
          .single();

        if (patientErr) {
          throw patientErr;
        }

        if (!patientRow?.id) {
          throw new Error(
            'Patient record could not be created.'
          );
        }

        /* 
           3. AI analysis
         */

        setAnalysisStage(
          'Analysing blood smear...'
        );

        const prediction =
          await analyzeBloodSmear(
            compressedUri,
            patientRow.id,
            temperature.trim(),
            bloodPressure.trim()
          );

        if (!prediction) {
          throw new Error(
            'No analysis result was returned.'
          );
        }

        /* 
           4. Upload image
         */

        setAnalysisStage(
          'Securing scan image...'
        );

        const storedImagePath =
          await uploadScanImage(
            user.id,
            compressedUri,
            scanId
          );

        /* 
           5. Determine condition
         */

        const conditionKey =
          prediction.condition ??
          resolveConditionKey(
            prediction.is_anemic,
            prediction.morphology_findings,
            prediction.is_unreliable
          );

        /* 
           6. Build report
         */

        setAnalysisStage(
          'Preparing analysis report...'
        );

        const report =
          buildReport({
            patientName:
              patientName.trim(),

            patientId:
              patientRow.id,

            condition:
              conditionKey,

            isAnemic:
              prediction.is_anemic,

            confidence:
              prediction.anemia_probability,

            confidenceLabel:
              prediction.explanation
                ?.confidence ??
              'moderate',

            labTechName,

            image_url:
              storedImagePath,

            temperature:
              temperature.trim(),

            bloodPressure:
              bloodPressure.trim(),

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

        /* 
           7. Save scan
         */

        setAnalysisStage(
          'Saving scan record...'
        );

        const {
          data: scanRow,
          error: scanErr,
        } = await supabase
          .from('scans')
          .insert({
            patient_id:
              patientRow.id,

            created_by:
              user.id,

            image_url:
              storedImagePath,

            status: 'done',

            prediction_id:
              prediction.prediction_id,

            condition:
              conditionKey,
          })
          .select('id')
          .single();

        if (scanErr) {
          throw scanErr;
        }

        if (!scanRow?.id) {
          throw new Error(
            'Scan record could not be saved.'
          );
        }

        report.id =
          scanRow.id;

        /* 
           8. Save report
         */

        setAnalysisStage(
          'Finalising report...'
        );

        await saveReport(
          report,
          user.id
        );

        /* 
           9. Record usage
         */

        const usage =
          await recordScan(
            user.id,
            plan
          );

        setRemaining(
          usage.remaining
        );

        /* 
           10. Show result
         */

        setResultModal({
          prediction,
          report,

          bonusJustGranted:
            usage.bonusJustGranted,

          bonusRemaining:
            usage.bonusRemaining,

          remaining:
            usage.remaining,
        });

        /* 
           11. Clear form
         */

        setPatientName('');
        setPatientAge('');
        setPatientGender('');
        setTemperature('');
        setBloodPressure('');

        setErrors({});

        setImage(null);
        setImageSourceType(null);

        setScanId(
          generateScanId()
        );
      } catch (error) {
        console.error(
          'Analysis failed:',
          error
        );

        Alert.alert(
          'Analysis Failed',
          'Something went wrong while analysing the blood smear. Please try again.'
        );
      } finally {
        /**
         * Always unlock.
         */
        analysisLock.current = false;

        setIsAnalysing(false);

        setAnalysisStage(
          'Preparing image...'
        );
      }
    };

  /* 
     VALIDATION HINT
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

  /* 
     SCAN LIMIT
   */

  const scanLimitLabel =
    remaining === null
      ? ''
      : remaining === Infinity
        ? 'Unlimited scans'
        : `${remaining} scan${
            remaining !== 1
              ? 's'
              : ''
          } remaining today`;


  return (
    <SafeAreaView
      style={styles.container}
      edges={[
        'left',
        'right',
        'bottom',
      ]}
    >

      {/* HEADER */}

      <Header
        left={
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
            disabled={isAnalysing}
          >
            <MaterialIcons
              name="arrowbackiosnew"
              size={HEADER.iconSize}
              color={
                COLORS.textPrimary
              }
            />
          </TouchableOpacity>
        }

        center={
          <Text
            style={styles.headerTitle}
          >
            Scan
          </Text>
        }

        right={
          <View
            style={styles.resetWrapper}
          >
            <TouchableOpacity
              style={
                styles.resetIconBtn
              }
              onPress={
                handleResetPress
              }
              disabled={isAnalysing}
            >
              <MaterialIcons
                name="restartalt"
                size={22}
                color={COLORS.danger}
              />
            </TouchableOpacity>

            {showResetTip && (
              <Animated.View
                style={[
                  styles.resetTooltip,
                  {
                    opacity:
                      tipOpacity,
                  },
                ]}
              >
                <View
                  style={
                    styles.resetTooltipCaret
                  }
                />

                <MaterialIcons
                  name="infooutline"
                  size={12}
                  color={COLORS.white}
                  style={{
                    marginRight:
                      SPACING.xs,
                  }}
                />

                <Text
                  style={
                    styles.resetTooltipText
                  }
                >
                  Tap again to reset
                </Text>
              </Animated.View>
            )}
          </View>
        }
      />

      {/* MAIN CONTENT */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom:
              TAB_BAR_CLEARANCE,
          },
        ]}
      >

        {/* SCAN USAGE */}

        <View
          style={
            styles.usageBanner
          }
        >
          <Text
            style={
              styles.usageBannerLabel
            }
          >
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

        <View
          style={
            styles.scanIdCard
          }
        >
          <View
            style={
              styles.scanIdLeft
            }
          >
            <MaterialCommunityIcons
              name="fingerprint"
              size={18}
              color={
                COLORS.textMuted
              }
            />

            <Text
              style={
                styles.scanIdLabel
              }
            >
              SCAN ID
            </Text>
          </View>

          <View
            style={
              styles.scanIdRight
            }
          >
            <Text
              style={
                styles.scanIdValue
              }
            >
              {scanId}
            </Text>
          </View>
        </View>

        {/* PATIENT INFORMATION */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <MaterialCommunityIcons
            name="accountoutline"
            size={20}
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.sectionTitle
            }
          >
            Patient Information
          </Text>
        </View>

        {/* NAME */}

        <Text
          style={
            styles.inputLabel
          }
        >
          Patient Name
        </Text>

        <TextInput
          placeholder="e.g. John Doe"
          placeholderTextColor={
            COLORS.textMuted
          }
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
          <Text
            style={
              styles.fieldErrorText
            }
          >
            {errors.patientName}
          </Text>
        )}

        {/* AGE + GENDER */}

        <View
          style={styles.row}
        >
          <View
            style={styles.rowItem}
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              Age
            </Text>

            <TextInput
              placeholder="e.g. 34"
              placeholderTextColor={
                COLORS.textMuted
              }
              value={patientAge}
              onChangeText={(text) => {
                const value =
                  text.replace(
                    /\D/g,
                    ''
                  );

                setPatientAge(
                  value
                );

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
              keyboardType="numberpad"
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
              <Text
                style={
                  styles.fieldErrorText
                }
              >
                {errors.age}
              </Text>
            )}
          </View>

          <View
            style={styles.rowItem}
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              Gender
            </Text>

            <View
              style={
                styles.genderPillRow
              }
            >
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderPill,
                    patientGender === g &&
                      styles.genderPillActive,
                  ]}
                  onPress={() => {
                    setPatientGender(
                      g
                    );

                    setErrors(
                      (prev) => ({
                        ...prev,
                        patientGender:
                          '',
                      })
                    );
                  }}
                  activeOpacity={0.8}
                  disabled={
                    isAnalysing
                  }
                >
                  <MaterialCommunityIcons
                    name={
                      g === 'Male'
                        ? 'gendermale'
                        : 'genderfemale'
                    }
                    size={15}
                    color={
                      patientGender === g
                        ? COLORS.white
                        : COLORS.textMuted
                    }
                    style={{
                      marginRight:
                        SPACING.xs,
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
              <Text
                style={
                  styles.fieldErrorText
                }
              >
                {errors.patientGender}
              </Text>
            )}
          </View>
        </View>

        {/* TEMPERATURE + BP */}

        <View
          style={styles.row}
        >
          <View
            style={styles.rowItem}
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              Temperature (°C)
            </Text>

            <TextInput
              placeholder="e.g. 36.5"
              placeholderTextColor={
                COLORS.textMuted
              }
              value={temperature}
              onChangeText={(text) => {
                setTemperature(
                  text
                );

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
              keyboardType="decimalpad"
              style={[
                styles.input,
                styles.half,
                errors.temperature &&
                  styles.inputError,
              ]}
              editable={!isAnalysing}
            />

            {!!errors.temperature && (
              <Text
                style={
                  styles.fieldErrorText
                }
              >
                {errors.temperature}
              </Text>
            )}
          </View>

          <View
            style={styles.rowItem}
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              Blood Pressure
            </Text>

            <TextInput
              placeholder="120/80"
              placeholderTextColor={
                COLORS.textMuted
              }
              value={bloodPressure}
              onChangeText={(text) => {
                setBloodPressure(
                  text
                );

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
              keyboardType="decimalpad"
              style={[
                styles.input,
                styles.half,
                errors.bloodPressure &&
                  styles.inputError,
              ]}
              editable={!isAnalysing}
            />

            {!!errors.bloodPressure && (
              <Text
                style={
                  styles.fieldErrorText
                }
              >
                {errors.bloodPressure}
              </Text>
            )}
          </View>
        </View>

        {/* BLOOD SMEAR */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <MaterialCommunityIcons
            name="imageoutline"
            size={20}
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.sectionTitle
            }
          >
            Blood Smear Sample
          </Text>
        </View>

        {!image && (
          <TouchableOpacity
            style={
              styles.takePictureBtn
            }
            onPress={openCamera}
            disabled={
              isAnalysing
            }
          >
            <MaterialIcons
              name="photocamera"
              size={22}
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.takePictureText
              }
            >
              Take Picture
            </Text>
          </TouchableOpacity>
        )}

        {image && (
          <View
            style={
              styles.previewWrapper
            }
          >
            <TouchableOpacity
              activeOpacity={0.9}
              style={
                styles.previewBox
              }
              onPress={() =>
                !isAnalysing &&
                setImageViewerOpen(
                  true
                )
              }
            >
              <Image
                source={{
                  uri: image,
                }}
                style={
                  styles.previewImage
                }
              />

              <View
                style={
                  styles.previewZoomHint
                }
              >
                <MaterialIcons
                  name="zoomin"
                  size={16}
                  color={
                    COLORS.white
                  }
                />

                <Text
                  style={
                    styles.previewZoomText
                  }
                >
                  Tap to enlarge
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={
                imageSourceType ===
                'upload'
                  ? reuploadPhoto
                  : retakePhoto
              }
              style={
                styles.retakeBtn
              }
              disabled={
                isAnalysing
              }
            >
              <MaterialIcons
                name={
                  imageSourceType ===
                  'upload'
                    ? 'fileupload'
                    : 'refresh'
                }
                size={16}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.retakeText
                }
              >
                {imageSourceType ===
                'upload'
                  ? 'Reupload Image'
                  : 'Retake Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!imageSourceType && (
          <View
            style={
              styles.uploadCard
            }
          >
            <View
              style={
                styles.uploadIconCircle
              }
            >
              <MaterialCommunityIcons
                name="clouduploadoutline"
                size={34}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.uploadTitle
              }
            >
              Upload Blood Smear File
            </Text>

            <Text
              style={
                styles.uploadSub
              }
            >
              PNG or JPG images supported
            </Text>

            <TouchableOpacity
              style={
                styles.browseBtn
              }
              onPress={
                handlePickFile
              }
              disabled={
                isAnalysing
              }
            >
              <Text
                style={
                  styles.browseBtnText
                }
              >
                Browse Files
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* VALIDATION */}

        {!isFormValid && (
          <View
            style={
              styles.validationContainer
            }
          >
            <MaterialIcons
              name="erroroutline"
              size={16}
              color={
                COLORS.danger
              }
            />

            <Text
              style={
                styles.validationHint
              }
            >
              {getValidationHint()}
            </Text>
          </View>
        )}

        {/* START ANALYSIS */}

        <TouchableOpacity
          style={[
            styles.button,
            (!isFormValid ||
              isAnalysing) &&
              styles.disabledButton,
          ]}
          disabled={
            !isFormValid ||
            isAnalysing
          }
          onPress={
            handleStartAnalysis
          }
          activeOpacity={0.85}
        >
          {isAnalysing ? (
            <>
              <ActivityIndicator
                size="small"
                color={
                  COLORS.white
                }
              />

              <Text
                style={
                  styles.buttonText
                }
              >
                Analysing…
              </Text>
            </>
          ) : (
            <>
              <MaterialIcons
                name="analytics"
                size={20}
                color={
                  COLORS.white
                }
              />

              <Text
                style={
                  styles.buttonText
                }
              >
                Start Analysis
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text
          style={
            styles.hipaaText
          }
        >
          By starting analysis, you agree
          to processing of medical data in
          accordance with GHS standards.
        </Text>
      </ScrollView>

      {/* 
         IMAGE VIEWER
       */}

      <Modal
        visible={
          imageViewerOpen
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setImageViewerOpen(
            false
          )
        }
      >
        <View
          style={
            styles.imageModalOverlay
          }
        >
          <TouchableOpacity
            style={
              styles.closeViewer
            }
            onPress={() =>
              setImageViewerOpen(
                false
              )
            }
          >
            <MaterialIcons
              name="close"
              size={28}
              color={
                COLORS.white
              }
            />
          </TouchableOpacity>

          {image && (
            <Image
              source={{
                uri: image,
              }}
              style={
                styles.fullImage
              }
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/*  RESULT MODAL */}

      {resultModal && (
        <TransparencyTrail
          data={resultModal}
          userId={user.id}
          onClose={() => {
            setResultModal(null);
            navigation.navigate(
              'Report'
            );
          }}
          onViewReport={() => {
            setResultModal(null);

            navigation.navigate(
              'Report',
              {
                scanId:
                  resultModal
                    .report?.id,
              }
            );
          }}
        />
      )}

      <AnalysisModal
        visible={isAnalysing}
        stage={analysisStage}
      />

    </SafeAreaView>
  );
};

export default Scan;
