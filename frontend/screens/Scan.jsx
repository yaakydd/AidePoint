import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import {
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

import {
  buildReport,
  resolveConditionKey,
  saveReport,
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
  HEADER,
  SPACING,
} from '../assets/theme';

const TAB_BAR_CLEARANCE =
  Platform.OS === 'ios' ? 105 : 90;

const GENDERS = ['Male', 'Female'];

/* ============================================================
   HELPERS
============================================================ */

function generateScanId() {
  const year = new Date().getFullYear();
  const timePart = Date.now()
    .toString(36)
    .toUpperCase()
    .slice(4);

  const randomPart = Math.floor(
    100 + Math.random() * 900,
  );

  return `AP-${year}-${timePart}-${randomPart}`;
}

function validateField(field, value) {
  switch (field) {
    case 'patientName': {
      const trimmed = value?.trim() ?? '';

      if (trimmed && trimmed.length < 2) {
        return 'Name looks too short';
      }

      return '';
    }

    case 'age': {
      if (!value) {
        return '';
      }

      const n = Number(value);

      if (
        !Number.isInteger(n) ||
        n <= 0 ||
        n > 120
      ) {
        return 'Enter a valid age (1–120)';
      }

      return '';
    }

    case 'temperature': {
      if (!value) {
        return '';
      }

      const n = Number(value);

      if (
        !Number.isFinite(n) ||
        n < 30 ||
        n > 43
      ) {
        return 'Enter a plausible temp (30–43°C)';
      }

      return '';
    }

    case 'bloodPressure': {
      if (!value) {
        return '';
      }

      const trimmed = value.trim();

      const match = trimmed.match(
        /^(\d{2,3})\/(\d{2,3})$/,
      );

      if (!match) {
        return 'Format as systolic/diastolic, e.g. 120/80';
      }

      const systolic = Number(match[1]);
      const diastolic = Number(match[2]);

      if (
        systolic < 50 ||
        systolic > 250 ||
        diastolic < 30 ||
        diastolic > 150 ||
        diastolic >= systolic
      ) {
        return 'Enter a plausible blood pressure';
      }

      return '';
    }

    default:
      return '';
  }
}

function getUpgradeMessage(plan) {
  if (!plan) {
    return 'Daily scan limit reached.';
  }

  if (plan.id === 'basic') {
    return `You've used all ${plan.scans.dailyLimit} Basic scans for today.\n\nUpgrade to Max for 30 scans/day, or Pro for unlimited scans.`;
  }

  if (plan.id === 'max') {
    return `You've used all ${plan.scans.dailyLimit} Max scans for today.\n\nUpgrade to Pro for unlimited scans.`;
  }

  return 'Daily scan limit reached.';
}

function getSafeErrorMessage(error) {
  if (!error) {
    return 'Something went wrong.';
  }

  if (
    typeof error === 'object' &&
    error.message
  ) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Something went wrong.';
}

/* ============================================================
   PREDICTION HELPERS
============================================================ */

/*
 * The /predict endpoint does NOT need to return prediction_id
 * for the prediction to be considered valid.
 *
 * The minimum usable prediction is:
 *
 *   anemia_probability
 *   OR
 *   is_anemic
 *
 * Other fields are optional.
 */
function hasUsablePrediction(prediction) {
  if (
    !prediction ||
    typeof prediction !== 'object'
  ) {
    return false;
  }

  const hasAnemiaProbability =
    typeof prediction.anemia_probability ===
    'number';

  const hasIsAnemic =
    typeof prediction.is_anemic === 'boolean';

  return (
    hasAnemiaProbability ||
    hasIsAnemic
  );
}

/*
 * Normalize the prediction without removing any fields
 * returned by the backend.
 */
function normalizePrediction(prediction) {
  if (
    !prediction ||
    typeof prediction !== 'object'
  ) {
    return prediction;
  }

  return {
    ...prediction,

    anemia_probability:
      typeof prediction.anemia_probability ===
      'number'
        ? prediction.anemia_probability
        : null,

    is_anemic:
      typeof prediction.is_anemic === 'boolean'
        ? prediction.is_anemic
        : null,

    decision_threshold:
      typeof prediction.decision_threshold ===
      'number'
        ? prediction.decision_threshold
        : null,

    cbc:
      prediction.cbc &&
      typeof prediction.cbc === 'object'
        ? prediction.cbc
        : null,

    morphology_findings:
      prediction.morphology_findings ?? [],

    unreliable_reasons:
      prediction.unreliable_reasons ?? [],
  };
}

/* ============================================================
   ANALYSIS MODAL
============================================================ */

const AnalysisModal = ({
  visible,
  stage = 'Preparing image...',
}) => {
  const pulseAnim = useRef(
    new Animated.Value(1),
  ).current;

  const rotateAnim = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    if (!visible) {
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();

      pulseAnim.setValue(1);
      rotateAnim.setValue(0);

      return undefined;
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
      ]),
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();

      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();

      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    };
  }, [
    visible,
    pulseAnim,
    rotateAnim,
  ]);

  const rotate =
    rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        '0deg',
        '360deg',
      ],
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={() => {
        // Analysis cannot be cancelled while running.
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Animated.View
            style={[
              styles.iconOuter,
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
                color={
                  COLORS.primary
                }
              />
            </Animated.View>
          </Animated.View>

          <Text style={styles.title}>
            Analysing Blood Smear
          </Text>

          <Text
            style={
              styles.description
            }
          >
            Please wait while AidePoint
            processes the blood smear
            image.
          </Text>

          <View
            style={styles.stageBox}
          >
            <ActivityIndicator
              size="small"
              color={
                COLORS.primary
              }
            />

            <Text
              style={styles.stageText}
              numberOfLines={2}
            >
              {stage}
            </Text>
          </View>

          <View
            style={styles.infoRow}
          >
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={17}
              color={
                COLORS.success
              }
            />

            <Text
              style={styles.infoText}
            >
              Please keep this screen open
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ============================================================
   SCREEN
============================================================ */

const Scan = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();

  /* ============================================================
     USER / PLAN
  ============================================================ */

  const plan = useMemo(
    () =>
      getPlan(
        user?.subscriptionTier,
      ),
    [user?.subscriptionTier],
  );

  const labTechName =
    user?.name ?? 'Lab Technician';

  /* ============================================================
     FORM
  ============================================================ */

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

  /* ============================================================
     IMAGE
  ============================================================ */

  const [image, setImage] =
    useState(null);

  const [imageSourceType, setImageSourceType] =
    useState(null);

  const [imageViewerOpen, setImageViewerOpen] =
    useState(false);

  /* ============================================================
     ANALYSIS
  ============================================================ */

  const [scanId, setScanId] =
    useState(generateScanId);

  const [isAnalysing, setIsAnalysing] =
    useState(false);

  const [analysisStage, setAnalysisStage] =
    useState('Preparing image...');

  const [remaining, setRemaining] =
    useState(null);

  /* ============================================================
     RESULT
  ============================================================ */

  const [resultModal, setResultModal] =
    useState(null);

  /* ============================================================
     RESET TOOLTIP
  ============================================================ */

  const [showResetTip, setShowResetTip] =
    useState(false);

  const tipOpacity = useRef(
    new Animated.Value(0),
  ).current;

  /* ============================================================
     ANALYSIS LOCKS
  ============================================================ */

  const analysisLock = useRef(false);

  const mountedRef = useRef(true);

  const analysisSessionRef =
    useRef(null);

  /* ============================================================
     LIFECYCLE
  ============================================================ */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      analysisLock.current = false;

      analysisSessionRef.current =
        null;
    };
  }, []);

  /* ============================================================
     LOAD SCAN LIMIT
  ============================================================ */

  const loadRemaining =
    useCallback(async () => {
      if (!user?.id || !plan) {
        return;
      }

      try {
        const value =
          await getRemainingScans(
            user.id,
            plan,
          );

        if (mountedRef.current) {
          setRemaining(value);
        }
      } catch (error) {
        console.error(
          'Failed to load remaining scans:',
          error,
        );
      }
    }, [
      user?.id,
      plan,
    ]);

  useEffect(() => {
    loadRemaining();
  }, [loadRemaining]);

  /* ============================================================
     PREVENT NAVIGATION WHILE ANALYSING
  ============================================================ */

  useEffect(() => {
    const unsubscribe =
      navigation.addListener(
        'beforeRemove',
        (event) => {
          if (
            !analysisLock.current
          ) {
            return;
          }

          event.preventDefault();
        },
      );

    return unsubscribe;
  }, [navigation]);

  /* ============================================================
     CAMERA RESULT
  ============================================================ */

  useEffect(() => {
    const unsubscribe =
      navigation.addListener(
        'focus',
        () => {
          if (
            analysisLock.current ||
            isAnalysing
          ) {
            return;
          }

          const params =
            route.params;

          const capturedPhoto =
            params?.capturedPhoto;

          /*
           * Restore form information after
           * returning from Camera.
           */
          const existingData =
            params?.existingData;

          if (existingData) {
            if (
              typeof existingData.patientName ===
              'string'
            ) {
              setPatientName(
                existingData.patientName,
              );
            }

            if (
              typeof existingData.patientAge ===
              'string'
            ) {
              setPatientAge(
                existingData.patientAge,
              );
            }

            if (
              typeof existingData.patientGender ===
              'string'
            ) {
              setPatientGender(
                existingData.patientGender,
              );
            }

            if (
              typeof existingData.temperature ===
              'string'
            ) {
              setTemperature(
                existingData.temperature,
              );
            }

            if (
              typeof existingData.bloodPressure ===
              'string'
            ) {
              setBloodPressure(
                existingData.bloodPressure,
              );
            }
          }

          if (!capturedPhoto) {
            return;
          }

          /*
           * Immediately clear navigation params
           * so the same image is not processed again.
           */
          navigation.setParams({
            capturedPhoto:
              undefined,
            existingData:
              undefined,
          });

          const processCameraImage =
            async () => {
              try {
                const safeUri =
                  await stabilizeImage(
                    capturedPhoto,
                  );

                if (
                  !mountedRef.current ||
                  analysisLock.current
                ) {
                  return;
                }

                setImage(
                  safeUri,
                );

                setImageSourceType(
                  'camera',
                );

                setErrors(
                  (prev) => ({
                    ...prev,
                    image: '',
                  }),
                );
              } catch (error) {
                console.error(
                  'Camera image stabilize failed:',
                  error,
                );

                if (
                  mountedRef.current
                ) {
                  Alert.alert(
                    'Image Error',
                    'Could not process the captured photo. Please try again.',
                  );
                }
              }
            };

          processCameraImage();
        },
      );

    return unsubscribe;
  }, [
    navigation,
    route.params?.capturedPhoto,
    route.params?.existingData,
    isAnalysing,
  ]);

  /* ============================================================
     VALIDATION
  ============================================================ */

  const runValidation =
    useCallback(
      (field, value) => {
        const message =
          validateField(
            field,
            value,
          );

        setErrors(
          (prev) => ({
            ...prev,
            [field]: message,
          }),
        );

        return message;
      },
      [],
    );

  const hasFieldErrors =
    Object.values(errors).some(
      Boolean,
    );

  const isFormValid =
    patientName.trim().length >
      0 &&
    patientAge.trim().length >
      0 &&
    patientGender.length > 0 &&
    temperature.trim().length >
      0 &&
    bloodPressure.trim().length >
      0 &&
    !!image &&
    !hasFieldErrors;

  /* ============================================================
     CAMERA
  ============================================================ */

  const openCamera = () => {
    if (
      analysisLock.current ||
      isAnalysing
    ) {
      return;
    }

    navigation.navigate(
      'Camera',
      {
        existingData: {
          patientName,
          patientAge,
          patientGender,
          temperature,
          bloodPressure,
        },
      },
    );
  };

  const retakePhoto = () => {
    if (
      analysisLock.current ||
      isAnalysing
    ) {
      return;
    }

    setImage(null);
    setImageSourceType(null);

    navigation.navigate(
      'Camera',
      {
        existingData: {
          patientName,
          patientAge,
          patientGender,
          temperature,
          bloodPressure,
        },
      },
    );
  };

  /* ============================================================
     IMAGE PICKER
  ============================================================ */

  const handlePickFile =
    async () => {
      if (
        analysisLock.current ||
        isAnalysing
      ) {
        return;
      }

      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            'Permission Required',
            'Please allow access to your gallery.',
          );

          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: ['images'],
              quality: 1,
              allowsEditing: false,
              selectionLimit: 1,
            },
          );

        if (
          result.canceled ||
          !result.assets?.length
        ) {
          return;
        }

        const pickedUri =
          result.assets[0].uri;

        if (!pickedUri) {
          Alert.alert(
            'Invalid Image',
            'The selected file could not be read.',
          );

          return;
        }

        const safeUri =
          await stabilizeImage(
            pickedUri,
          );

        if (
          !mountedRef.current ||
          analysisLock.current
        ) {
          return;
        }

        setImage(safeUri);

        setImageSourceType(
          'upload',
        );

        setErrors(
          (prev) => ({
            ...prev,
            image: '',
          }),
        );
      } catch (error) {
        console.error(
          'Image picker error:',
          error,
        );

        if (
          mountedRef.current
        ) {
          Alert.alert(
            'Upload Failed',
            'Unable to select or process the image.',
          );
        }
      }
    };

  const reuploadPhoto = () => {
    if (
      analysisLock.current ||
      isAnalysing
    ) {
      return;
    }

    setImage(null);
    setImageSourceType(null);

    handlePickFile();
  };

  /* ============================================================
     RESET
  ============================================================ */

  const triggerReset = () => {
    if (
      analysisLock.current ||
      isAnalysing
    ) {
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
            if (
              analysisLock.current
            ) {
              return;
            }

            setPatientName('');
            setPatientAge('');
            setPatientGender('');
            setTemperature('');
            setBloodPressure('');

            setErrors({});

            setImage(null);
            setImageSourceType(
              null,
            );

            setImageViewerOpen(
              false,
            );

            setScanId(
              generateScanId(),
            );

            setAnalysisStage(
              'Preparing image...',
            );
          },
        },
      ],
    );
  };

  const handleResetPress =
    () => {
      if (
        analysisLock.current ||
        isAnalysing
      ) {
        return;
      }

      if (showResetTip) {
        triggerReset();
        return;
      }

      setShowResetTip(true);

      Animated.sequence([
        Animated.timing(
          tipOpacity,
          {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          },
        ),

        Animated.delay(2000),

        Animated.timing(
          tipOpacity,
          {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          },
        ),
      ]).start(() => {
        if (
          mountedRef.current
        ) {
          setShowResetTip(
            false,
          );
        }
      });
    };

  /* ============================================================
     START ANALYSIS
  ============================================================ */

  const handleStartAnalysis =
    async () => {
      /*
       * 0. IMMEDIATE LOCK
       *
       * This must happen before any async operation.
       */
      if (
        analysisLock.current ||
        isAnalysing
      ) {
        return;
      }

      /*
       * 1. AUTHENTICATION
       */

      if (!user?.id) {
        Alert.alert(
          'Session Required',
          'Your session is unavailable. Please sign in again.',
        );

        return;
      }

      /*
       * 2. PLAN
       */

      if (!plan) {
        Alert.alert(
          'Plan Error',
          'Your subscription plan could not be determined. Please try again.',
        );

        return;
      }

      /*
       * 3. VALIDATE FORM AGAIN
       *
       * Never rely only on button disabled state.
       */

      const validationErrors =
        {};

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
        fieldsToValidate,
      ).forEach(
        ([field, value]) => {
          const error =
            validateField(
              field,
              value,
            );

          if (error) {
            validationErrors[
              field
            ] = error;
          }
        },
      );

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

      if (
        Object.keys(
          validationErrors,
        ).length > 0
      ) {
        setErrors(
          validationErrors,
        );

        return;
      }

      /*
       * 4. LOCK
       */

      analysisLock.current = true;

      const analysisSession =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

      analysisSessionRef.current =
        analysisSession;

      setIsAnalysing(true);

      let createdPatientId =
        null;

      let createdScanId =
        null;

      try {
        /*
         * 5. CHECK SCAN LIMIT
         */

        setAnalysisStage(
          'Checking scan availability...',
        );

        const currentRemaining =
          await getRemainingScans(
            user.id,
            plan,
          );

        if (
          !Number.isFinite(
            currentRemaining,
          ) &&
          currentRemaining !==
            Infinity
        ) {
          throw new Error(
            'Could not verify scan availability.',
          );
        }

        if (
          currentRemaining !==
            Infinity &&
          currentRemaining <= 0
        ) {
          if (
            mountedRef.current
          ) {
            Alert.alert(
              'Daily Limit Reached',
              getUpgradeMessage(
                plan,
              ),
              [
                {
                  text: 'Maybe Later',
                  style: 'cancel',
                },

                {
                  text: 'View Plans',

                  onPress: () =>
                    navigation.navigate(
                      'Subscription',
                    ),
                },
              ],
            );
          }

          return;
        }

        /*
         * 6. PREPARE IMAGE
         */

        setAnalysisStage(
          'Preparing blood smear image...',
        );

        const compressedUri =
          await prepareImage(
            image,
          );

        if (!compressedUri) {
          throw new Error(
            'Image preparation failed.',
          );
        }

        /*
         * 7. CREATE PATIENT
         */

        setAnalysisStage(
          'Creating patient record...',
        );

        const {
          data: patientRow,
          error: patientError,
        } = await supabase
          .from('patients')
          .insert({
            created_by:
              user.id,

            name:
              patientName.trim(),

            age:
              Number(
                patientAge,
              ),

            gender:
              patientGender.toLowerCase(),
          })
          .select('id')
          .single();

        if (patientError) {
          throw patientError;
        }

        if (!patientRow?.id) {
          throw new Error(
            'Patient record could not be created.',
          );
        }

        createdPatientId =
          patientRow.id;

        /*
         * 8. AI ANALYSIS
         */

        setAnalysisStage(
          'Analysing blood smear...',
        );

        const rawPrediction =
          await analyzeBloodSmear(
            compressedUri,
            patientRow.id,
            temperature.trim(),
            bloodPressure.trim(),
          );

        /*
         * The current /predict endpoint can return:
         *
         * anemia_probability
         * is_anemic
         * decision_threshold
         * cbc
         *
         * prediction_id is optional.
         */

        if (
          !hasUsablePrediction(
            rawPrediction,
          )
        ) {
          console.error(
            'Invalid /predict response:',
            rawPrediction,
          );

          throw new Error(
            'No usable analysis result was returned.',
          );
        }

        /*
         * Preserve and normalize
         * the complete API response.
         */

        const prediction =
          normalizePrediction(
            rawPrediction,
          );

        /*
         * 9. UPLOAD IMAGE
         */

        setAnalysisStage(
          'Securing scan image...',
        );

        const storedImagePath =
          await uploadScanImage(
            user.id,
            compressedUri,
            scanId,
          );

        /*
         * Image storage may legitimately
         * return null when consent is disabled.
         */

        const imageUrl =
          storedImagePath ?? null;

        /*
         * 10. DETERMINE CONDITION
         */

        const conditionKey =
          prediction.condition ??
          resolveConditionKey(
            prediction.is_anemic,
            prediction.morphology_findings,
            prediction.is_unreliable,
          );

        /*
         * Don't discard a valid prediction
         * just because an optional condition
         * field is unavailable.
         */

        const safeConditionKey =
          conditionKey ??
          (prediction.is_anemic ===
          true
            ? 'anemia'
            : 'normal');

        /*
         * 11. BUILD REPORT
         */

        setAnalysisStage(
          'Preparing analysis report...',
        );

        const report =
          buildReport({
            patientName:
              patientName.trim(),

            patientId:
              patientRow.id,

            condition:
              safeConditionKey,

            isAnemic:
              prediction.is_anemic,

            confidence:
              prediction.anemia_probability,

            confidenceLabel:
              prediction
                .explanation
                ?.confidence ??
              'moderate',

            labTechName,

            image_url:
              imageUrl,

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

        if (!report) {
          throw new Error(
            'Report could not be generated.',
          );
        }

        /*
         * 12. SAVE SCAN
         */

        setAnalysisStage(
          'Saving scan record...',
        );

        const scanInsert = {
          patient_id:
            patientRow.id,

          created_by:
            user.id,

          image_url:
            imageUrl,

          status: 'done',

          condition:
            safeConditionKey,
        };

        /*
         * prediction_id is optional.
         */

        if (
          prediction.prediction_id !==
            undefined &&
          prediction.prediction_id !==
            null
        ) {
          scanInsert.prediction_id =
            prediction.prediction_id;
        }

        const {
          data: scanRow,
          error: scanError,
        } = await supabase
          .from('scans')
          .insert(scanInsert)
          .select('id')
          .single();

        if (scanError) {
          throw scanError;
        }

        if (!scanRow?.id) {
          throw new Error(
            'Scan record could not be saved.',
          );
        }

        createdScanId =
          scanRow.id;

        /*
         * Attach the actual database
         * scan ID to the report.
         */

        report.id =
          scanRow.id;

        /*
         * 13. SAVE REPORT
         */

        setAnalysisStage(
          'Finalising report...',
        );

        await saveReport(
          report,
          user.id,
        );

        /*
         * 14. RECORD USAGE
         */

        setAnalysisStage(
          'Updating scan usage...',
        );

        const usage =
          await recordScan(
            user.id,
            plan,
          );

        if (!usage) {
          throw new Error(
            'Scan usage could not be recorded.',
          );
        }

        if (
          mountedRef.current
        ) {
          setRemaining(
            usage.remaining,
          );
        }

        /*
         * 15. BUILD RESULT OBJECT
         */

        if (
          mountedRef.current
        ) {
          const result = {
            /*
             * Preserve complete prediction.
             */
            prediction,

            /*
             * Completed report.
             */
            report,

            /*
             * Usage information.
             */
            bonusJustGranted:
              usage.bonusJustGranted,

            bonusRemaining:
              usage.bonusRemaining,

            remaining:
              usage.remaining,

            /*
             * Explicit prediction fields.
             */
            is_anemic:
              prediction.is_anemic,

            anemia_probability:
              prediction.anemia_probability,

            decision_threshold:
              prediction.decision_threshold,

            cbc:
              prediction.cbc,

            morphology_findings:
              prediction.morphology_findings,

            cbc_pattern_summary:
              prediction.cbc_pattern_summary,

            image_quality:
              prediction.image_quality,

            is_unreliable:
              prediction.is_unreliable,

            unreliable_reasons:
              prediction.unreliable_reasons,

            scanId,
          };

          console.log(
            '>>> RESULT MODAL DATA:',
            result,
          );

          /*
           * IMPORTANT:
           *
           * Reset the Scan form BEFORE
           * showing the result modal.
           *
           * Closing the result modal therefore
           * leaves the user on a completely
           * fresh Scan screen.
           */

          setPatientName('');
          setPatientAge('');
          setPatientGender('');
          setTemperature('');
          setBloodPressure('');

          setErrors({});

          setImage(null);
          setImageSourceType(
            null,
          );

          setScanId(
            generateScanId(),
          );

          /*
           * Finally show the result.
           */
          setResultModal(
            result,
          );
        }
      } catch (error) {
        console.error(
          'Analysis failed:',
          error,
        );

        /*
         * ======================================================
         * BEST-EFFORT ROLLBACK
         * ======================================================
         */

        if (createdScanId) {
          try {
            await supabase
              .from('scans')
              .delete()
              .eq(
                'id',
                createdScanId,
              );
          } catch (
            cleanupError
          ) {
            console.error(
              'Failed to roll back orphaned scan row:',
              cleanupError,
            );
          }
        }

        if (createdPatientId) {
          try {
            await supabase
              .from('patients')
              .delete()
              .eq(
                'id',
                createdPatientId,
              );
          } catch (
            cleanupError
          ) {
            console.error(
              'Failed to roll back orphaned patient row:',
              cleanupError,
            );
          }
        }

        if (
          !mountedRef.current
        ) {
          return;
        }

        /*
         * ======================================================
         * ERROR HANDLING
         * ======================================================
         */

        if (
          error?.isScanLimitError
        ) {
          Alert.alert(
            'Scan Limit Reached',
            error.message ||
              getUpgradeMessage(
                plan,
              ),
            [
              {
                text: 'Maybe Later',
                style: 'cancel',
              },

              {
                text: 'View Plans',

                onPress: () =>
                  navigation.navigate(
                    'Subscription',
                  ),
              },
            ],
          );
        } else if (
          error?.isImageQualityError
        ) {
          const reasons =
            error.imageQuality
              ?.failure_reasons;

          const body =
            Array.isArray(
              reasons,
            ) &&
            reasons.length > 0
              ? `${error.message}\n\n${reasons.join(
                  '\n',
                )}`
              : `${error.message}`;

          Alert.alert(
            'Image Could Not Be Analysed',
            body,
          );
        } else if (
          error?.message ===
          'IMAGE_EXPIRED'
        ) {
          Alert.alert(
            'Image Expired',
            'This photo is no longer available. Please retake or re-select the photo before starting analysis again.',
          );
        } else {
          Alert.alert(
            'Analysis Failed',
            getSafeErrorMessage(
              error,
            ) ||
              'Something went wrong while analysing the blood smear. Please try again.',
          );
        }
      } finally {
        /*
         * Only the session that owns the lock
         * is allowed to release it.
         */
        if (
          analysisSessionRef.current ===
          analysisSession
        ) {
          analysisSessionRef.current =
            null;

          analysisLock.current =
            false;

          if (
            mountedRef.current
          ) {
            setIsAnalysing(
              false,
            );

            setAnalysisStage(
              'Preparing image...',
            );
          }
        }
      }
    };

  /* ============================================================
     VALIDATION HINT
  ============================================================ */

  const getValidationHint =
    () => {
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
    };

  /* ============================================================
     SCAN LIMIT LABEL
  ============================================================ */

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

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <SafeAreaView
      style={styles.container}
      edges={[
        'left',
        'right',
        'bottom',
      ]}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <Header
        left={
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              navigation.goBack()
            }
            disabled={
              isAnalysing
            }
          >
            <MaterialIcons
              name="arrow-back-ios-new"
              size={
                HEADER.iconSize
              }
              color={
                COLORS.textPrimary
              }
            />
          </TouchableOpacity>
        }

        center={
          <Text
            style={
              styles.headerTitle
            }
          >
            Scan
          </Text>
        }

        right={
          <View
            style={
              styles.resetWrapper
            }
          >
            <TouchableOpacity
              style={
                styles.resetIconBtn
              }
              onPress={
                handleResetPress
              }
              disabled={
                isAnalysing
              }
            >
              <MaterialIcons
                name="restart-alt"
                size={22}
                color={
                  COLORS.danger
                }
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
                  name="info-outline"
                  size={12}
                  color={
                    COLORS.white
                  }
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

      {/* ======================================================
          CONTENT
      ====================================================== */}

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
        {/* ====================================================
            SCAN USAGE
        ==================================================== */}

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
              remaining ===
                0 &&
                styles.usageBannerValueWarning,
            ]}
          >
            {scanLimitLabel ||
              '—'}
          </Text>
        </View>

        {/* ====================================================
            SCAN ID
        ==================================================== */}

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

        {/* ====================================================
            PATIENT INFORMATION
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <MaterialCommunityIcons
            name="account-outline"
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
          placeholder="e.g. Joshua Antwi"
          placeholderTextColor={
            COLORS.textMuted
          }
          value={patientName}
          onChangeText={(text) => {
            setPatientName(
              text,
            );

            runValidation(
              'patientName',
              text,
            );
          }}
          onBlur={() =>
            runValidation(
              'patientName',
              patientName,
            )
          }
          style={[
            styles.input,
            errors.patientName &&
              styles.inputError,
          ]}
          editable={
            !isAnalysing
          }
          autoCapitalize="words"
          autoCorrect={false}
        />

        {!!errors.patientName && (
          <Text
            style={
              styles.fieldErrorText
            }
          >
            {
              errors.patientName
            }
          </Text>
        )}

        {/* AGE + GENDER */}

        <View
          style={styles.row}
        >
          <View
            style={
              styles.rowItem
            }
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
                    '',
                  );

                setPatientAge(
                  value,
                );

                runValidation(
                  'age',
                  value,
                );
              }}
              onBlur={() =>
                runValidation(
                  'age',
                  patientAge,
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
              editable={
                !isAnalysing
              }
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
            style={
              styles.rowItem
            }
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
              {GENDERS.map(
                (gender) => (
                  <TouchableOpacity
                    key={
                      gender
                    }
                    style={[
                      styles.genderPill,
                      patientGender ===
                        gender &&
                        styles.genderPillActive,
                    ]}
                    onPress={() => {
                      if (
                        isAnalysing
                      ) {
                        return;
                      }

                      setPatientGender(
                        gender,
                      );

                      setErrors(
                        (
                          prev,
                        ) => ({
                          ...prev,
                          patientGender:
                            '',
                        }),
                      );
                    }}
                    activeOpacity={
                      0.8
                    }
                    disabled={
                      isAnalysing
                    }
                  >
                    <MaterialCommunityIcons
                      name={
                        gender ===
                        'Male'
                          ? 'gender-male'
                          : 'gender-female'
                      }
                      size={15}
                      color={
                        patientGender ===
                        gender
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
                        patientGender ===
                          gender &&
                          styles.genderPillTextActive,
                      ]}
                    >
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            {!!errors.patientGender && (
              <Text
                style={
                  styles.fieldErrorText
                }
              >
                {
                  errors.patientGender
                }
              </Text>
            )}
          </View>
        </View>

        {/* ====================================================
            TEMPERATURE + BP
        ==================================================== */}

        <View
          style={styles.row}
        >
          <View
            style={
              styles.rowItem
            }
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
                  text,
                );

                runValidation(
                  'temperature',
                  text,
                );
              }}
              onBlur={() =>
                runValidation(
                  'temperature',
                  temperature,
                )
              }
              keyboardType="decimal-pad"
              style={[
                styles.input,
                styles.half,
                errors.temperature &&
                  styles.inputError,
              ]}
              editable={
                !isAnalysing
              }
            />

            {!!errors.temperature && (
              <Text
                style={
                  styles.fieldErrorText
                }
              >
                {
                  errors.temperature
                }
              </Text>
            )}
          </View>

          <View
            style={
              styles.rowItem
            }
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
              value={
                bloodPressure
              }
              onChangeText={(text) => {
                setBloodPressure(
                  text,
                );

                runValidation(
                  'bloodPressure',
                  text,
                );
              }}
              onBlur={() =>
                runValidation(
                  'bloodPressure',
                  bloodPressure,
                )
              }
              keyboardType="numbers-and-punctuation"
              style={[
                styles.input,
                styles.half,
                errors.bloodPressure &&
                  styles.inputError,
              ]}
              editable={
                !isAnalysing
              }
            />

            {!!errors.bloodPressure && (
              <Text
                style={
                  styles.fieldErrorText
                }
              >
                {
                  errors.bloodPressure
                }
              </Text>
            )}
          </View>
        </View>

        {/* ====================================================
            BLOOD SMEAR
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <MaterialCommunityIcons
            name="image-outline"
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
            onPress={
              openCamera
            }
            disabled={
              isAnalysing
            }
          >
            <MaterialIcons
              name="photo-camera"
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
              onPress={() => {
                if (
                  !isAnalysing
                ) {
                  setImageViewerOpen(
                    true,
                  );
                }
              }}
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
                  name="zoom-in"
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
                    ? 'file-upload'
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
                name="cloud-upload-outline"
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
              PNG or JPG images
              supported
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

        {/* ====================================================
            VALIDATION
        ==================================================== */}

        {!isFormValid && (
          <View
            style={
              styles.validationContainer
            }
          >
            <MaterialIcons
              name="error-outline"
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

        {/* ====================================================
            START ANALYSIS
        ==================================================== */}

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
          By starting analysis,
          you agree to processing
          of medical data in
          accordance with GHS
          standards.
        </Text>
      </ScrollView>

      {/* ======================================================
          IMAGE VIEWER
      ====================================================== */}

      <Modal
        visible={
          imageViewerOpen
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() =>
          setImageViewerOpen(
            false,
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
                false,
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

      {/* ======================================================
          RESULT MODAL
      ====================================================== */}

      {resultModal && (
        <TransparencyTrail
          data={resultModal}
          userId={user?.id}
          onClose={() => {
            /*
             * IMPORTANT:
             *
             * Do NOT navigate to Report here.
             *
             * The Scan form was already reset after
             * successful analysis, so closing the result
             * simply returns the user to the fresh Scan
             * screen underneath this modal.
             */
            setResultModal(null);
          }}
          onViewReport={() => {
            /*
             * Get the actual database report/scan ID.
             */
            const reportId =
              resultModal?.report?.id;

            /*
             * Close the result modal first.
             */
            setResultModal(null);

            /*
             * Never navigate with an undefined ID.
             */
            if (!reportId) {
              Alert.alert(
                'Report Unavailable',
                'The report ID could not be found.',
              );

              return;
            }

            /*
             * IMPORTANT:
             *
             * ReportScreen expects `newScanId`,
             * not `scanId`.
             */
            navigation.navigate(
              'Report',
              {
                newScanId:
                  reportId,
              },
            );
          }}
        />
      )}

      {/* ======================================================
          ANALYSIS MODAL
      ====================================================== */}

      <AnalysisModal
        visible={
          isAnalysing
        }
        stage={
          analysisStage
        }
      />
    </SafeAreaView>
  );
};

export default Scan;