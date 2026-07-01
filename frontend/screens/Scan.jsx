// screens/Scan.js

import React, { useState, useEffect } from 'react';
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
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth }    from '../context/AuthContext';
import { supabase }   from '../utils/supabase';
import { buildReport, saveReport } from '../utils/ReportUtils';
import { scanStyles as styles }    from '../styles/ScanStyles';
import { analyzeBloodSmear } from '../utils/api';
import { COLORS }     from '../assets/theme';
import { getPlan } from '../constants/subscriptionPlans';
import {
  getTodayScanUsage,
  incrementScanCount,
  getEffectiveDailyLimit,
  recordImageSaved,
} from '../utils/scanStorage';
import ScanSuccessModal from '../components/ScanSuccessModal';

const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;
const GENDERS = ['Male', 'Female'];


function generateScanId() {
  return `AP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

const Scan = ({ navigation, route }) => {
  const { user } = useAuth();
  const labTechName = user?.name ?? 'Lab Technician';
  const plan = getPlan(user?.subscriptionTier);

  const [patientName,   setPatientName]   = useState('');
  const [patientAge,    setPatientAge]    = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [temperature,   setTemperature]   = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [image,           setImage]           = useState(null);
  const [imageSourceType, setImageSourceType] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [scanId,      setScanId]      = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);

  // Reset tooltip
  const [showResetTooltip, setShowResetTooltip] = useState(false);

  // Subscription-based scan usage
  const [scanUsage, setScanUsage] = useState({ count: 0, savedImagesToday: 0, bonusClaimed: false });

  // Post-analysis success modal
  const [successVisible, setSuccessVisible] = useState(false);
  const [completedReport, setCompletedReport] = useState(null);
  const [bonusInfo, setBonusInfo] = useState(null);

  useEffect(() => { setScanId(generateScanId()); }, []);

  useEffect(() => {
    (async () => {
      const usage = await getTodayScanUsage(user?.id);
      setScanUsage(usage);
    })();
  }, [user?.id]);

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
    patientName.trim()   !== '' &&
    patientAge.trim()    !== '' &&
    patientGender        !== '' &&
    temperature.trim()   !== '' &&
    bloodPressure.trim() !== '' &&
    image !== null;

  const effectiveLimit = getEffectiveDailyLimit(plan, scanUsage);
  const scansRemaining  = effectiveLimit === Infinity ? Infinity : Math.max(effectiveLimit - scanUsage.count, 0);
  const limitReached    = effectiveLimit !== Infinity && scanUsage.count >= effectiveLimit;

  function openCamera() {
    // FIX: the stack screen is registered as "Camera" in ScanStackNavigator,
    // not "CameraScreen" — navigating to a name that doesn't exist in the
    // navigator throws "cannot navigate" / "no route named" errors.
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

  function resetForm() {
    setPatientName('');
    setPatientAge('');
    setPatientGender('');
    setTemperature('');
    setBloodPressure('');
    setImage(null);
    setImageSourceType(null);
    setImageViewerOpen(false);
    setScanId(generateScanId());
  }

  function handleReset() {
    Alert.alert('Reset Form', 'Clear all entered data?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetForm },
    ]);
  }

  function handleResetIconPress() {
    setShowResetTooltip(true);
    setTimeout(() => setShowResetTooltip(false), 1200);
    handleReset();
  }

  function promptUpgrade() {
    Alert.alert(
      'Daily scan limit reached',
      `You've used all ${effectiveLimit} scans included in your ${plan.label} plan today. Upgrade to Max or Pro for a higher (or unlimited) daily scan allowance.`,
      [{ text: 'OK' }]
    );
  }

  async function handleStartAnalysis() {
    if (!isFormValid || isAnalysing) return;

    if (limitReached) {
      promptUpgrade();
      return;
    }

    setIsAnalysing(true);

    try {
      // 1. Create patient record in Supabase
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

      // 2. Upload image to Supabase Storage
      let imageUrl = null;
      let imageWasSaved = false;
      if (image) {
        const ext      = image.split('.').pop().toLowerCase();
        const filePath = `${user.id}/${patientRow.id}_${Date.now()}.${ext}`;
        const response = await fetch(image);
        const blob     = await response.blob();

        const { error: uploadErr } = await supabase.storage
          .from('scan-images')
          .upload(filePath, blob, { contentType: `image/${ext}` });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('scan-images')
          .getPublicUrl(filePath);

        imageUrl = urlData?.publicUrl ?? null;
        imageWasSaved = !!imageUrl;
      }

      // 3. Send image to Railway backend for real AI inference
      const prediction = await analyzeBloodSmear(image);

      // 4. Build the report object
      const report = buildReport({
        patientName:   patientName.trim(),
        patientId:     patientRow.id,
        condition:     prediction.condition,
        confidence:    prediction.confidence,
        labTechName,
        imageUri:      imageUrl,
        temperature:   temperature.trim(),
        bloodPressure: bloodPressure.trim(),
      });

      // 5. Save scan record to Supabase with full AI result
      const { data: scanRow, error: scanErr } = await supabase
        .from('scans')
        .insert({
          patient_id: patientRow.id,
          created_by: user.id,
          image_url:  imageUrl,
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

      const fullReport = { ...report, id: scanRow.id };

      // 6. Save to local AsyncStorage for offline access in ReportScreen
      await saveReport(fullReport);

      // 7. Count this scan against the day's subscription limit
      const updatedUsage = await incrementScanCount(user.id);
      let bonusResult = { bonusAwarded: false, discountCreditAwarded: false };

      // 8. If the image was actually saved, count it toward the bonus / discount
      if (imageWasSaved) {
        bonusResult = await recordImageSaved(user.id, plan);
        const refreshedUsage = await getTodayScanUsage(user.id);
        setScanUsage(refreshedUsage);
      } else {
        setScanUsage(updatedUsage);
      }

      // 9. Show the success modal instead of navigating immediately
      setCompletedReport(fullReport);
      setBonusInfo(bonusResult);
      setSuccessVisible(true);

    } catch (err) {
      console.error('Scan handleStartAnalysis:', err.message);
      Alert.alert(
        'Analysis Failed',
        err.message ?? 'Something went wrong. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsAnalysing(false);
    }
  }

  function handleViewReport() {
    setSuccessVisible(false);
    const report = completedReport;
    resetForm();
    navigation.navigate('ReportScreen', {
      newScanId:   report?.id,
      patientName: report?.patientName,
    });
  }

  function handleNewScanFromModal() {
    setSuccessVisible(false);
    resetForm();
  }

  function getValidationHint() {
    if (!patientName.trim())   return 'Enter patient name';
    if (!patientAge.trim())    return 'Enter patient age';
    if (!patientGender)        return 'Select patient gender';
    if (!temperature.trim())   return 'Enter temperature';
    if (!bloodPressure.trim()) return 'Enter blood pressure';
    if (!image)                return 'Capture or upload a blood smear image';
    return '';
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_CLEARANCE }]}
      >
        {/* Header — white bg, centered "Scan" title, icon-only reset */}
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back-ios-new" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.headerTitle}>Scan</Text>

          <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
            <TouchableOpacity style={styles.resetButton} activeOpacity={0.7} onPress={handleResetIconPress}>
              <MaterialIcons name="restart-alt" size={22} color={COLORS.danger} />
            </TouchableOpacity>
            {showResetTooltip && (
              <View style={styles.resetTooltip}>
                <Text style={styles.resetTooltipText}>Reset</Text>
              </View>
            )}
          </View>
        </View>

        {/* Scan ID */}
        <View style={styles.scanIdCard}>
          <View style={styles.scanIdLeft}>
            <MaterialCommunityIcons name="fingerprint" size={18} color={COLORS.textMuted} />
            <Text style={styles.scanIdLabel}>SCAN ID</Text>
          </View>
          <Text style={styles.scanIdValue}>{scanId}</Text>
        </View>

        {/* Subscription-aware scan usage banner */}
        <View style={styles.usageBanner}>
          <Text style={styles.usageBannerLabel}>{plan.label.toUpperCase()} PLAN</Text>
          <Text style={[styles.usageBannerValue, limitReached && styles.usageBannerValueWarning]}>
            {effectiveLimit === Infinity
              ? 'Unlimited scans today'
              : `${scansRemaining} of ${effectiveLimit} scans left today`}
          </Text>
        </View>

        {/* Patient Information */}
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

        {/* Age + Gender row */}
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
                  <Text style={[genderStyles.pillText, patientGender === g && genderStyles.pillTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Temperature + Blood Pressure */}
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

        {/* Blood Smear */}
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
            </TouchableOpacity>
            <TouchableOpacity onPress={retakePhoto}>
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
            <MaterialIcons name="error-outline" size={18} color={COLORS.danger} />
            <Text style={styles.validationHint}>{getValidationHint()}</Text>
          </View>
        )}

        {isFormValid && limitReached && (
          <View style={styles.validationContainer}>
            <MaterialIcons name="error-outline" size={18} color={COLORS.danger} />
            <Text style={styles.validationHint}>
              Daily scan limit reached for your {plan.label} plan — upgrade to scan again today.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, (!isFormValid || isAnalysing || limitReached) && styles.disabledButton]}
          disabled={!isFormValid || isAnalysing || limitReached}
          onPress={handleStartAnalysis}
        >
          {isAnalysing ? (
            <><ActivityIndicator size="small" color="#fff" /><Text style={styles.buttonText}>Analysing...</Text></>
          ) : (
            <><MaterialIcons name="analytics" size={20} color="#fff" /><Text style={styles.buttonText}>Start Analysis</Text></>
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

      <ScanSuccessModal
        visible={successVisible}
        report={completedReport}
        bonusInfo={bonusInfo}
        onViewReport={handleViewReport}
        onNewScan={handleNewScanFromModal}
      />
    </SafeAreaView>
  );
};

export default Scan;

const genderStyles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor:     COLORS.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  pillTextActive: {
    color: '#fff',
  },
});
