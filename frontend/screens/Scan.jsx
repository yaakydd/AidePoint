// screens/Scan.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Image, Alert, Modal, ActivityIndicator, Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth }       from '../context/AuthContext';
import { supabase }      from '../utils/supabase';
import { buildReport, saveReport, resolveConditionKey } from '../utils/ReportUtils';
import { scanStyles as styles }    from '../styles/ScanStyles';
import { analyzeBloodSmear }       from '../utils/api';
import { compressImage } from '../utils/Offlinequeue';
import { getRemainingScans, recordScan } from '../utils/scanStorage';
import { getPlan }       from '../constants/SubscriptionPlans';
import TransparencyTrail from '../components/TransparencyTrail';
import { COLORS, SPACING } from '../assets/theme';


const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;
const GENDERS = ['Male', 'Female'];

function generateScanId() {
  return `AP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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

const Scan = ({ navigation, route }) => {
  const { user } = useAuth();
  const plan = getPlan(user?.subscriptionTier);
  const labTechName = user?.name ?? 'Lab Technician';

  const [patientName,   setPatientName]   = useState('');
  const [patientAge,    setPatientAge]    = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [temperature,   setTemperature]   = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [image,           setImage]           = useState(null);
  const [imageSourceType, setImageSourceType] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [scanId,       setScanId]       = useState('');
  const [isAnalysing,  setIsAnalysing]  = useState(false);
  const [remaining,    setRemaining]    = useState(null);
  const [showResetTip, setShowResetTip] = useState(false);
  const [resultModal,  setResultModal]  = useState(null);
  const tipOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setScanId(generateScanId());
    loadRemaining();
  }, []);

  async function loadRemaining() {
    if (!user?.id) return;
    const r = await getRemainingScans(user.id, plan);
    setRemaining(r);
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const photo = route.params?.capturedPhoto;
      if (photo) {
        setImage(photo);
        setImageSourceType('camera');
        navigation.setParams({ capturedPhoto: undefined });
      }
    });
    return unsubscribe;
  }, [navigation, route.params]);

  const isFormValid =
    patientName.trim() !== '' &&
    patientAge.trim()  !== '' &&
    patientGender      !== '' &&
    temperature.trim() !== '' &&
    bloodPressure.trim()!== '' &&
    image !== null;

  // FIXED: every function below that mutates form state or navigates away
  // now bails out while isAnalysing is true. Disabling the buttons in the
  // JSX isn't enough on its own -- a fast double-tap can fire before React
  // re-renders the disabled state, so the guard also lives here.
  function openCamera() {
    if (isAnalysing) return;
    navigation.navigate('Camera', {
      existingData: { patientName, patientAge, patientGender, temperature, bloodPressure },
    });
  }

  function retakePhoto() {
    if (isAnalysing) return;
    setImage(null);
    setImageSourceType(null);
    navigation.navigate('Camera', {
      existingData: { patientName, patientAge, patientGender, temperature, bloodPressure },
    });
  }

  async function handlePickFile() {
    if (isAnalysing) return;
    console.log('>>> handlePickFile CALLED');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;
      const name = file.name?.toLowerCase() ?? '';
      if (!name.endsWith('.png') && !name.endsWith('.jpg') && !name.endsWith('.jpeg')) {
        Alert.alert('Invalid File', 'Only PNG or JPG images are supported.');
        return;
      }
      setImage(file.uri);
      setImageSourceType('upload');
    } catch (err) {
      console.error('Scan handlePickFile:', err.message);
      Alert.alert('Upload Failed', 'Unable to open file picker.');
    }
  }

  function handleResetPress() {
    if (isAnalysing) return;
    if (showResetTip) {
      triggerReset();
      return;
    }
    setShowResetTip(true);
    Animated.sequence([
      Animated.timing(tipOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(tipOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowResetTip(false));
  }

  function triggerReset() {
    Alert.alert('Reset Form', 'Clear all entered data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => {
          setPatientName(''); setPatientAge(''); setPatientGender('');
          setTemperature(''); setBloodPressure('');
          setImage(null); setImageSourceType(null);
          setImageViewerOpen(false); setScanId(generateScanId());
        },
      },
    ]);
  }
  async function handleStartAnalysis() {
  if (!isFormValid || isAnalysing) return;

  console.log('>>> ABOUT TO CALL getRemainingScans');
  let rem;
  try {
    rem = await getRemainingScans(user.id, plan);
    console.log('>>> getRemainingScans returned:', rem);
  } catch (err) {
    console.error('>>> getRemainingScans THREW:', err);
    Alert.alert('Error', 'Could not check scan limit: ' + err.message);
    return;
  }

  if (rem !== Infinity && rem <= 0) {
    Alert.alert('Scan Limit Reached', getUpgradeMessage(plan), [
      { text: 'Maybe Later', style: 'cancel' },
      { text: 'View Plans', onPress: () => navigation.navigate('Subscription') },
    ]);
    return;
  }

  setIsAnalysing(true);
  console.log('STEP 1: starting analysis, image =', image);
  try {
    const compressedUri = await compressImage(image);
    console.log('STEP 2: compressImage done ', compressedUri);


      const { data: patientRow, error: patientErr } = await supabase
        .from('patients')
        .insert({
          created_by: user.id,
          name:       patientName.trim(),
          age:        patientAge ? parseInt(patientAge, 10) : null,
          gender:     patientGender.toLowerCase(),
        })
        .select('id')
        .single();
      console.log('STEP 3: patient insert', { patientRow, patientErr });
      if (patientErr) throw patientErr;
      const prediction = await analyzeBloodSmear(compressedUri, patientRow.id);
console.log('STEP 4: prediction ', prediction);

const conditionKey = resolveConditionKey(
  prediction.is_anemic,
  prediction.morphology_findings,
  prediction.is_unreliable
);

const report = buildReport({
    patientName:   patientName.trim(),
    patientId:     patientRow.id,
    condition:     conditionKey,   // was: prediction.is_anemic ? 'anemic' : 'healthy'
    confidence:    prediction.explanation?.confidence ?? 'moderate',
    labTechName,
    imageUri:      compressedUri,
    temperature:   temperature.trim(),
    bloodPressure: bloodPressure.trim(),
    morphologyFindings: prediction.morphology_findings,
    cbcPatternSummary:  prediction.cbc_pattern_summary,
    isUnreliable:       prediction.is_unreliable,
    unreliableReasons:  prediction.unreliable_reasons,
    imageQuality:       prediction.image_quality,
});


      const { data: scanRow, error: scanErr } = await supabase
        .from('scans')
        .insert({
          patient_id: patientRow.id,
          created_by: user.id,
          image_url:  compressedUri,
          status:     'done',
          results: {
            is_anemic:           prediction.is_anemic,
            condition:           conditionKey,
            anemia_probability:  prediction.anemia_probability,
            confidence:          prediction.explanation?.confidence,
            morphology_findings: prediction.morphology_findings,
            cbc_pattern_summary: prediction.cbc_pattern_summary,
            is_unreliable:       prediction.is_unreliable,
            unreliable_reasons:  prediction.unreliable_reasons,
            image_quality:       prediction.image_quality,
            temperature:         temperature.trim(),
            bloodPressure:       bloodPressure.trim(),
            labTechName,
            patientAge:          patientAge.trim(),
            patientGender:       patientGender.toLowerCase(),
            scanId,
            analyzedAt:          new Date().toISOString(),
            inference_ms:        prediction.inference_ms,
          },
        })
        .select('id')
        .single();
      if (scanErr) throw scanErr;
      report.id = scanRow.id;

      await saveReport(report, user.id);

      const usage = await recordScan(user.id, plan);
      setRemaining(usage.remaining);

      setResultModal({
        prediction,
        report,
        bonusJustGranted: usage.bonusJustGranted,
        bonusRemaining:   usage.bonusRemaining,
        remaining:        usage.remaining,
      });

      setPatientName(''); setPatientAge(''); setPatientGender('');
      setTemperature(''); setBloodPressure('');
      setImage(null); setImageSourceType(null);
      setScanId(generateScanId());

    } catch (err) {
      console.error('Scan handleStartAnalysis:', err.message);
      Alert.alert('Analysis Failed', err.message ?? 'Something went wrong. Please try again.', [{ text: 'OK' }]);
    } finally {
      setIsAnalysing(false);
    }
  }

  function getValidationHint() {
    if (!patientName.trim())    return 'Enter patient name';
    if (!patientAge.trim())     return 'Enter patient age';
    if (!patientGender)         return 'Select patient gender';
    if (!temperature.trim())    return 'Enter temperature';
    if (!bloodPressure.trim())  return 'Enter blood pressure';
    if (!image)                 return 'Capture or upload a blood smear image';
    return '';
  }

  const scanLimitLabel = remaining === null
    ? ''
    : remaining === Infinity
    ? 'Unlimited scans'
    : `${remaining} scan${remaining !== 1 ? 's' : ''} remaining today`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_CLEARANCE }]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={isAnalysing}>
            <MaterialIcons name="arrow-back-ios-new" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Scan</Text>

          <View style={styles.resetWrapper}>
            <TouchableOpacity style={styles.resetIconBtn} onPress={handleResetPress} disabled={isAnalysing}>
              <MaterialIcons name="restart-alt" size={22} color={COLORS.danger} />
            </TouchableOpacity>
            {showResetTip && (
              <Animated.View style={[styles.resetTooltip, { opacity: tipOpacity }]}>
                <Text style={styles.resetTooltipText}>Tap again to reset</Text>
              </Animated.View>
            )}
          </View>
        </View>

<View style={styles.usageBanner}>
  <Text style={styles.usageBannerLabel}>SCANS TODAY</Text>
  <Text style={[
    styles.usageBannerValue,
    remaining === 0 && styles.usageBannerValueWarning,
  ]}>
    {scanLimitLabel || '—'}
  </Text>
</View>

<View style={styles.scanIdCard}>
  <View style={styles.scanIdLeft}>
    <MaterialCommunityIcons name="fingerprint" size={18} color={COLORS.textMuted} />
    <Text style={styles.scanIdLabel}>SCAN ID</Text>
  </View>
  <View style={styles.scanIdRight}>
    <Text style={styles.scanIdValue}>{scanId}</Text>
  </View>
</View>

        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="account-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Patient Information</Text>
        </View>

        <Text style={styles.inputLabel}>Patient Name</Text>
        <TextInput
          placeholder="e.g. John Doe"
          placeholderTextColor={COLORS.textMuted}
          value={patientName}
          onChangeText={setPatientName}
          style={styles.input}
          editable={!isAnalysing}
        />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              placeholder="e.g. 34"
              placeholderTextColor={COLORS.textMuted}
              value={patientAge}
              onChangeText={t => setPatientAge(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
              style={[styles.input, styles.half]}
              editable={!isAnalysing}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderPillRow}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderPill, patientGender === g && styles.genderPillActive]}
                  onPress={() => setPatientGender(g)}
                  activeOpacity={0.8}
                  disabled={isAnalysing}
                >
                  <MaterialCommunityIcons
                    name={g === 'Male' ? 'gender-male' : 'gender-female'}
                    size={15}
                    color={patientGender === g ? '#fff' : COLORS.textMuted}
                    style={{ marginRight: SPACING.xs }}
                  />
                  <Text style={[styles.genderPillText, patientGender === g && styles.genderPillTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.inputLabel}>Temperature (°C)</Text>
            <TextInput
              placeholder="e.g. 36.5"
              placeholderTextColor={COLORS.textMuted}
              value={temperature}
              onChangeText={setTemperature}
              keyboardType="decimal-pad"
              style={[styles.input, styles.half]}
              editable={!isAnalysing}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.inputLabel}>Blood Pressure</Text>
            <TextInput
              placeholder="120/80"
              placeholderTextColor={COLORS.textMuted}
              value={bloodPressure}
              onChangeText={setBloodPressure}
              style={[styles.input, styles.half]}
              editable={!isAnalysing}
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="image-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Blood Smear Sample</Text>
        </View>

        {!image && (
          <TouchableOpacity style={styles.takePictureBtn} onPress={openCamera} disabled={isAnalysing}>
            <MaterialIcons name="photo-camera" size={22} color={COLORS.primary} />
            <Text style={styles.takePictureText}>Take Picture</Text>
          </TouchableOpacity>
        )}

        {image && (
          <View style={styles.previewWrapper}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.previewBox}
              onPress={() => !isAnalysing && setImageViewerOpen(true)}
            >
              <Image source={{ uri: image }} style={styles.previewImage} />
              <View style={styles.previewZoomHint}>
                <MaterialIcons name="zoom-in" size={16} color="#fff" />
                <Text style={styles.previewZoomText}>Tap to enlarge</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={retakePhoto} style={styles.retakeBtn} disabled={isAnalysing}>
              <MaterialIcons name="refresh" size={16} color={COLORS.primary} />
              <Text style={styles.retakeText}>Retake Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {!imageSourceType && (
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconCircle}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={34} color={COLORS.primary} />
            </View>
            <Text style={styles.uploadTitle}>Upload Blood Smear File</Text>
            <Text style={styles.uploadSub}>PNG or JPG images supported</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={handlePickFile} disabled={isAnalysing}>
              <Text style={styles.browseBtnText}>Browse Files</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isFormValid && (
          <View style={styles.validationContainer}>
            <MaterialIcons name="error-outline" size={16} color={COLORS.danger} />
            <Text style={styles.validationHint}>{getValidationHint()}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, (!isFormValid || isAnalysing) && styles.disabledButton]}
          disabled={!isFormValid || isAnalysing}
          onPress={handleStartAnalysis}
        >
          {isAnalysing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.buttonText}>  Analysing…</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="analytics" size={20} color="#fff" />
              <Text style={styles.buttonText}>  Start Analysis</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hipaaText}>
          By starting analysis, you agree to processing of medical data in accordance with GHS standards.
        </Text>
      </ScrollView>

      <Modal visible={imageViewerOpen} transparent animationType="fade" onRequestClose={() => setImageViewerOpen(false)}>
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.closeViewer} onPress={() => setImageViewerOpen(false)}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {image && <Image source={{ uri: image }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

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
            navigation.navigate('Report', { scanId: resultModal.report?.id });
          }}
        />
      )}

          {isAnalysing && (
      <View
        pointerEvents="auto"
        style={styles.analysisOverlay}
      >
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.analysisText}>
          Analysing blood smear...
        </Text>
      </View>
    )}
    </SafeAreaView>
  );
};

export default Scan;