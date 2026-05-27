// screens/Scan.js
//
// Scan flow:
//   1. Enter patient details (name, age, gender, ref number)
//   2. Capture or upload blood smear image
//   3. AI analysis → navigate to Report
//
// Schema alignment:
//   - Creates a row in `patients` table first, then `scans`
//   - temperature + bloodPressure stored inside results JSONB
//   - No doctor selector — only lab_technician role exists
//   - image only uploaded if user.storeImages === true

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { scanStyles as styles } from '../styles/ScanStyles';
import { COLORS } from '../assets/theme';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;

// ─────────────────────────────────────────────────────────────
// MOCK AI ANALYSIS
// Replace with real API call when model is ready.
// ─────────────────────────────────────────────────────────────

async function runAIAnalysis(imageUri) {
  return new Promise(resolve => {
    const pool       = ['sickle_cell', 'malaria', 'iron_deficiency', 'normal'];
    const condition  = pool[Math.floor(Math.random() * pool.length)];
    const confidence = parseFloat((85 + Math.random() * 14).toFixed(1));
    setTimeout(() => resolve({ condition, confidence }), 2800);
  });
}

// ─────────────────────────────────────────────────────────────
// SCAN ID (display only — real DB id is the Supabase UUID)
// ─────────────────────────────────────────────────────────────

function generateScanId() {
  const year   = new Date().getFullYear();
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `AP-${year}-${serial}`;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

const Scan = ({ navigation, route }) => {

  const { user } = useAuth();
  const labTechName = user?.name ?? 'Lab Technician';

  // ── Form state ─────────────────────────────────────────────

  const [patientName,   setPatientName]   = useState('');
  const [temperature,   setTemperature]   = useState('');
  const [bloodPressure, setBloodPressure] = useState('');

  const [image,            setImage]            = useState(null);
  const [imageSourceType,  setImageSourceType]  = useState(null); // 'camera' | 'upload' | null
  const [imageViewerOpen,  setImageViewerOpen]  = useState(false);

  const [scanId,      setScanId]      = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);

  // ── Init scan ID ───────────────────────────────────────────

  useEffect(() => {
    setScanId(generateScanId());
  }, []);

  // ── Camera return handler ──────────────────────────────────
  // When CameraScreen navigates back with { capturedPhoto },
  // restore the URI without touching other form fields.

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

  // ── Validation ─────────────────────────────────────────────

  const isFormValid =
    patientName.trim()   !== '' &&
    temperature.trim()   !== '' &&
    bloodPressure.trim() !== '' &&
    image !== null;

  // ── Navigation helpers ─────────────────────────────────────

  function openCamera() {
    navigation.navigate('CameraView', {
      existingData: { patientName, temperature, bloodPressure },
    });
  }

  // FIX: pass existingData so form survives a retake
  function retakePhoto() {
    setImage(null);
    setImageSourceType(null);
    navigation.navigate('CameraView', {
      existingData: { patientName, temperature, bloodPressure },
    });
  }

  // ── File picker ────────────────────────────────────────────

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type:               ['image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
        multiple:           false,
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

  // ── Reset form ─────────────────────────────────────────────
  // FIX: all state updates are inside the onPress callback,
  // so they only fire if the user confirms — not on every tap.

  function handleReset() {
    Alert.alert(
      'Reset Form',
      'Clear all entered data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:  'Reset',
          style: 'destructive',
          onPress: () => {
            setPatientName('');
            setTemperature('');
            setBloodPressure('');
            setImage(null);
            setImageSourceType(null);   // FIX: was outside callback
            setImageViewerOpen(false);  // FIX: was outside callback
            setScanId(generateScanId());
          },
        },
      ]
    );
  }

  // ── Start analysis ─────────────────────────────────────────

  async function handleStartAnalysis() {
    if (!isFormValid || isAnalysing) return;

    setIsAnalysing(true);

    try {
      // Step 1: Create patient record so scans.patient_id FK is satisfied
      const { data: patientRow, error: patientErr } = await supabase
        .from('patients')
        .insert({
          created_by: user.id,
          name:       patientName.trim(),
          // age, gender, patient_ref can be collected later or added to form
        })
        .select('id')
        .single();

      if (patientErr) throw patientErr;

      // Step 2: Upload image if user opted in — otherwise analyse and discard
      let imageUrl = null;
      if (user?.storeImages && image) {
        const ext      = image.split('.').pop();
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
      }

      // Step 3: Run AI analysis
      const prediction = await runAIAnalysis(image);

      // Step 4: Create scan record
      // temperature + bloodPressure go inside results JSONB (not schema columns)
      const { data: scanRow, error: scanErr } = await supabase
        .from('scans')
        .insert({
          patient_id:  patientRow.id,
          created_by:  user.id,
          image_url:   imageUrl,
          status:      'done',
          results: {
            condition:    prediction.condition,
            confidence:   prediction.confidence,
            temperature:  temperature.trim(),
            bloodPressure: bloodPressure.trim(),
            labTechName,
            scanId,
            analyzedAt:  new Date().toISOString(),
          },
        })
        .select('id')
        .single();

      if (scanErr) throw scanErr;

      // FIX: tab is named 'Reports' (plural), not 'Report'
      navigation.navigate('Reports', {
        newScanId:   scanRow.id,
        patientName: patientName.trim(),
      });

      // Reset form after successful navigation
      setPatientName('');
      setTemperature('');
      setBloodPressure('');
      setImage(null);
      setImageSourceType(null);
      setScanId(generateScanId());

    } catch (err) {
      console.error('Scan handleStartAnalysis:', err.message);
      Alert.alert('Analysis Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsAnalysing(false);
    }
  }

  // ── Validation hint text ───────────────────────────────────

  function getValidationHint() {
    if (!patientName.trim())   return 'Enter patient name';
    if (!temperature.trim())   return 'Enter temperature';
    if (!bloodPressure.trim()) return 'Enter blood pressure';
    if (!image)                return 'Capture or upload blood smear image';
    return '';
  }

  // ── UI ─────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: TAB_BAR_CLEARANCE },
        ]}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons
                name="arrow-back-ios-new"
                size={20}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan</Text>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            activeOpacity={0.8}
            onPress={handleReset}
          >
            <MaterialIcons name="restart-alt" size={18} color={COLORS.danger} />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* ── Scan ID ── */}
        <View style={styles.scanIdCard}>
          <View style={styles.scanIdLeft}>
            <MaterialCommunityIcons
              name="fingerprint" size={18} color={COLORS.textMuted}
            />
            <Text style={styles.scanIdLabel}>SCAN ID</Text>
          </View>
          <Text style={styles.scanIdValue}>{scanId}</Text>
        </View>

        {/* ── Patient Information ── */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="account-outline" size={20} color={COLORS.primary}
          />
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

        {/* ── Blood Smear ── */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="image-outline" size={20} color={COLORS.primary}
          />
          <Text style={styles.sectionTitle}>Blood Smear Sample</Text>
        </View>

        {/* Camera button — only shown before any image is set */}
        {!image && (
          <TouchableOpacity style={styles.takePictureBtn} onPress={openCamera}>
            <MaterialIcons name="photo-camera" size={22} color={COLORS.primary} />
            <Text style={styles.takePictureText}>Take Picture</Text>
          </TouchableOpacity>
        )}

        {/* Image preview */}
        {image && (
          <View style={styles.previewWrapper}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.previewBox}
              onPress={() => setImageViewerOpen(true)}
            >
              <Image source={{ uri: image }} style={styles.previewImage} />
            </TouchableOpacity>
            <TouchableOpacity onPress={retakePhoto}>
              <Text style={styles.retakeText}>Retake Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload card — only shown before any image source is chosen */}
        {!imageSourceType && (
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconCircle}>
              <MaterialCommunityIcons
                name="cloud-upload-outline" size={34} color={COLORS.primary}
              />
            </View>
            <Text style={styles.uploadTitle}>Upload Blood Smear File</Text>
            <Text style={styles.uploadSub}>PNG or JPG images supported</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={handlePickFile}>
              <Text style={styles.browseBtnText}>Browse Files</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Validation hint ── */}
        {!isFormValid && (
          <View style={styles.validationContainer}>
            <MaterialIcons name="info-outline" size={18} color={COLORS.warning} />
            <Text style={styles.validationHint}>{getValidationHint()}</Text>
          </View>
        )}

        {/* ── Start Analysis ── */}
        <TouchableOpacity
          style={[
            styles.button,
            (!isFormValid || isAnalysing) && styles.disabledButton,
          ]}
          disabled={!isFormValid || isAnalysing}
          onPress={handleStartAnalysis}
        >
          {isAnalysing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.buttonText}>Analysing...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="analytics" size={20} color="#fff" />
              <Text style={styles.buttonText}>Start Analysis</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hipaaText}>
          By starting analysis, you agree to processing of medical data
          in accordance with GHS standards.
        </Text>

      </ScrollView>

      {/* ── Full-screen image viewer modal ── */}
      <Modal
        visible={imageViewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerOpen(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.closeViewer}
            onPress={() => setImageViewerOpen(false)}
          >
            <MaterialIcons name="close" size={28} color="#fff" />
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

    </SafeAreaView>
  );
};

export default Scan;
