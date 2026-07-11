// screens/Scan.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Image, Alert, Modal, ActivityIndicator, Platform,
  StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth }       from '../context/AuthContext';
import { supabase }      from '../utils/supabase';
import { buildReport, saveReport } from '../utils/ReportUtils';
import { scanStyles as styles }    from '../styles/ScanStyles';
import { analyzeBloodSmear }       from '../utils/api';
import { compressImage }           from '../utils/offlineQueue'; // TODO: this probably deserves to live in its own imageUtils.js now that the rest of offlineQueue.js isn't used
import { getRemainingScans, recordScan } from '../utils/scanStorage';
import { getPlan }       from '../constants/subscriptionPlans';
import { COLORS }        from '../assets/theme';

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

  // picks up the photo CameraScreen hands back when it navigates here
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

  // ScanStackNavigator registers this screen as 'Camera', not 'CameraScreen'
  function openCamera() {
    navigation.navigate('Camera', {
      existingData: { patientName, patientAge, patientGender, temperature, bloodPressure },
    });
  }

  function retakePhoto() {
    setImage(null);
    setImageSourceType(null);
    navigation.navigate('Camera', {
      existingData: { patientName, patientAge, patientGender, temperature, bloodPressure },
    });
  }

  async function handlePickFile() {
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

    const rem = await getRemainingScans(user.id, plan);
    if (rem !== Infinity && rem <= 0) {
      Alert.alert('Scan Limit Reached', getUpgradeMessage(plan), [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'View Plans', onPress: () => navigation.navigate('Subscription') },
      ]);
      return;
    }

    setIsAnalysing(true);

    try {
      const compressedUri = await compressImage(image);

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
      if (patientErr) throw patientErr;

      const prediction = await analyzeBloodSmear(compressedUri);

      const report = buildReport({
        patientName:   patientName.trim(),
        patientId:     patientRow.id,
        condition:     prediction.condition,
        confidence:    prediction.confidence,
        labTechName,
        imageUri:      compressedUri,
        temperature:   temperature.trim(),
        bloodPressure: bloodPressure.trim(),
      });

      const { data: scanRow, error: scanErr } = await supabase
        .from('scans')
        .insert({
          patient_id: patientRow.id,
          created_by: user.id,
          image_url:  compressedUri,
          status:     'done',
          results: {
            condition:          prediction.condition,
            confidence:         prediction.confidence,
            urgency:            prediction.urgency,
            morphology_note:    prediction.morphology_note,
            cbc:                prediction.cbc,
            cbc_flags:          prediction.cbc_flags,
            morphology_probs:   prediction.morphology_probs,
            anemia_probability: prediction.anemia_probability,
            temperature:        temperature.trim(),
            bloodPressure:      bloodPressure.trim(),
            labTechName,
            patientAge:         patientAge.trim(),
            patientGender:      patientGender.toLowerCase(),
            scanId,
            analyzedAt:         new Date().toISOString(),
            inference_ms:       prediction.inference_ms,
          },
        })
        .select('id')
        .single();
      if (scanErr) throw scanErr;
      report.id = scanRow.id;

      await saveReport(report);

      const usage = await recordScan(user.id, plan);
      setRemaining(usage.remaining);

      setResultModal({
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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios-new" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Scan</Text>

          <View style={styles.resetWrapper}>
            <TouchableOpacity style={styles.resetIconBtn} onPress={handleResetPress}>
              <MaterialIcons name="restart-alt" size={22} color={COLORS.danger} />
            </TouchableOpacity>
            {showResetTip && (
              <Animated.View style={[styles.resetTooltip, { opacity: tipOpacity }]}>
                <Text style={styles.resetTooltipText}>Tap again to reset</Text>
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.scanIdCard}>
          <View style={styles.scanIdLeft}>
            <MaterialCommunityIcons name="fingerprint" size={18} color={COLORS.textMuted} />
            <Text style={styles.scanIdLabel}>SCAN ID</Text>
          </View>
          <View style={styles.scanIdRight}>
            <Text style={styles.scanIdValue}>{scanId}</Text>
            {scanLimitLabel ? (
              <View style={[styles.remainingPill, remaining === 0 && styles.remainingPillDanger]}>
                <Text style={[styles.remainingText, remaining === 0 && styles.remainingTextDanger]}>
                  {scanLimitLabel}
                </Text>
              </View>
            ) : null}
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
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              placeholder="e.g. 34"
              placeholderTextColor={COLORS.textMuted}
              value={patientAge}
              onChangeText={t => setPatientAge(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
              style={[styles.input, styles.half]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={genderStyles.pillRow}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[genderStyles.pill, patientGender === g && genderStyles.pillActive]}
                  onPress={() => setPatientGender(g)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={g === 'Male' ? 'gender-male' : 'gender-female'}
                    size={15}
                    color={patientGender === g ? '#fff' : COLORS.textMuted}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[genderStyles.pillText, patientGender === g && genderStyles.pillTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Temperature (°C)</Text>
            <TextInput
              placeholder="e.g. 36.5"
              placeholderTextColor={COLORS.textMuted}
              value={temperature}
              onChangeText={setTemperature}
              keyboardType="decimal-pad"
              style={[styles.input, styles.half]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Blood Pressure</Text>
            <TextInput
              placeholder="120/80"
              placeholderTextColor={COLORS.textMuted}
              value={bloodPressure}
              onChangeText={setBloodPressure}
              style={[styles.input, styles.half]}
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="image-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Blood Smear Sample</Text>
        </View>

        {!image && (
          <TouchableOpacity style={styles.takePictureBtn} onPress={openCamera}>
            <MaterialIcons name="photo-camera" size={22} color={COLORS.primary} />
            <Text style={styles.takePictureText}>Take Picture</Text>
          </TouchableOpacity>
        )}

        {image && (
          <View style={styles.previewWrapper}>
            <TouchableOpacity activeOpacity={0.9} style={styles.previewBox} onPress={() => setImageViewerOpen(true)}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <View style={styles.previewZoomHint}>
                <MaterialIcons name="zoom-in" size={16} color="#fff" />
                <Text style={styles.previewZoomText}>Tap to enlarge</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={retakePhoto} style={styles.retakeBtn}>
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
            <TouchableOpacity style={styles.browseBtn} onPress={handlePickFile}>
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
            <><ActivityIndicator size="small" color="#fff" /><Text style={styles.buttonText}>  Analysing…</Text></>
          ) : (
            <><MaterialIcons name="analytics" size={20} color="#fff" /><Text style={styles.buttonText}>  Start Analysis</Text></>
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
        <ResultModal
          data={resultModal}
          onClose={() => {
            setResultModal(null);
            navigation.navigate('Reports');
          }}
          onViewReport={() => {
            setResultModal(null);
            navigation.navigate('Reports', { scanId: resultModal.report?.id });
          }}
        />
      )}
    </SafeAreaView>
  );
};

import { CONDITION_CONFIG } from '../utils/ReportUtils';

const SEVERITY_COLORS = {
  red:    { bg: '#FEE2E2', text: '#B91C1C', icon: 'alert-circle' },
  yellow: { bg: '#FEF3C7', text: '#92400E', icon: 'alert' },
  green:  { bg: '#D1FAE5', text: '#065F46', icon: 'check-circle' },
};

function ResultModal({ data, onClose, onViewReport }) {
  const { report, bonusJustGranted, bonusRemaining, remaining } = data;
  const cfg      = CONDITION_CONFIG[report.condition] ?? CONDITION_CONFIG.normal;
  const sevStyle = SEVERITY_COLORS[cfg.severity] ?? SEVERITY_COLORS.yellow;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={resultStyles.overlay}>
        <View style={resultStyles.sheet}>
          <View style={resultStyles.handle} />

          <View style={[resultStyles.iconCircle, { backgroundColor: sevStyle.bg }]}>
            <MaterialCommunityIcons name={sevStyle.icon} size={38} color={sevStyle.text} />
          </View>

          <Text style={resultStyles.title}>Analysis Complete</Text>
          <Text style={[resultStyles.conditionLabel, { color: sevStyle.text }]}>
            {cfg.label}
          </Text>
          <Text style={resultStyles.sub}>{cfg.urgency}</Text>

          {bonusJustGranted && (
            <View style={resultStyles.bonusBanner}>
              <MaterialCommunityIcons name="gift-outline" size={18} color={COLORS.primaryDark} />
              <Text style={resultStyles.bonusText}>
                🎉 You've saved 5 images today! {bonusRemaining} bonus scan{bonusRemaining !== 1 ? 's' : ''} unlocked.
              </Text>
            </View>
          )}

          <Text style={resultStyles.remainingNote}>
            {remaining === Infinity
              ? 'Unlimited scans remaining today'
              : `${remaining} scan${remaining !== 1 ? 's' : ''} remaining today`}
          </Text>

          <View style={resultStyles.btnRow}>
            <TouchableOpacity style={resultStyles.btnSecondary} onPress={onClose}>
              <Text style={resultStyles.btnSecondaryText}>New Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={resultStyles.btnPrimary} onPress={onViewReport}>
              <MaterialIcons name="article" size={18} color="#fff" />
              <Text style={resultStyles.btnPrimaryText}>View Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default Scan;

const genderStyles = StyleSheet.create({
  pillRow:         { flexDirection: 'row', gap: 8, marginTop: 2 },
  pill:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  pillActive:      { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText:        { fontSize: 14, fontWeight: '500', color: COLORS.textMuted },
  pillTextActive:  { color: '#fff' },
});

const resultStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36, alignItems: 'center' },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 20 },
  iconCircle:     { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title:          { fontSize: 20, fontWeight: '700', color: '#1A2332', marginBottom: 6 },
  conditionLabel: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  sub:            { fontSize: 14, color: '#6B7C93', textAlign: 'center', lineHeight: 21, marginBottom: 16 },
  bonusBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E0F7FA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  bonusText:      { flex: 1, fontSize: 13, color: '#0097A7', fontWeight: '600' },
  remainingNote:  { fontSize: 12, color: '#9CA3AF', marginBottom: 20 },
  btnRow:         { flexDirection: 'row', gap: 12, width: '100%' },
  btnPrimary:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 14 },
  btnSecondaryText:{ fontSize: 15, fontWeight: '600', color: '#1A2332' },
});