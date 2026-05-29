// screens/Scan.js
//
// Changes from previous version:
//   + age field (numeric input)
//   + gender selector (Male / Female pill toggle)
//   + buildReport + saveReport from ReportUtils wired in after DB insert
//   Layout and structure kept exactly as before.

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
import { COLORS }     from '../assets/theme';

const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;
const GENDERS = ['Male', 'Female'];

async function runAIAnalysis(_imageUri) {
  return new Promise(resolve => {
    const pool       = ['sickle_cell', 'malaria', 'iron_deficiency', 'normal'];
    const condition  = pool[Math.floor(Math.random() * pool.length)];
    const confidence = parseFloat((85 + Math.random() * 14).toFixed(1));
    setTimeout(() => resolve({ condition, confidence }), 2800);
  });
}

function generateScanId() {
  return `AP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

const Scan = ({ navigation, route }) => {
  const { user } = useAuth();
  const labTechName = user?.name ?? 'Lab Technician';

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

  useEffect(() => { setScanId(generateScanId()); }, []);

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

  function openCamera() {
    navigation.navigate('CameraView', {
      existingData: { patientName, patientAge, patientGender, temperature, bloodPressure },
    });
  }

  function retakePhoto() {
    setImage(null);
    setImageSourceType(null);
    navigation.navigate('CameraView', {
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

  function handleReset() {
    Alert.alert('Reset Form', 'Clear all entered data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => {
          setPatientName('');
          setPatientAge('');
          setPatientGender('');
          setTemperature('');
          setBloodPressure('');
          setImage(null);
          setImageSourceType(null);
          setImageViewerOpen(false);
          setScanId(generateScanId());
        },
      },
    ]);
  }

  async function handleStartAnalysis() {
    if (!isFormValid || isAnalysing) return;
    setIsAnalysing(true);

    try {
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

      const prediction = await runAIAnalysis(image);

      const report = buildReport({
        patientName:   patientName.trim(),
        patientId:     patientRow.id,
        condition:     prediction.condition,
        confidence:    prediction.confidence,
        labTechName,
        imageUri:      user?.storeImages ? imageUrl : null,
        temperature:   temperature.trim(),
        bloodPressure: bloodPressure.trim(),
      });

      const { data: scanRow, error: scanErr } = await supabase
        .from('scans')
        .insert({
          patient_id: patientRow.id,
          created_by: user.id,
          image_url:  imageUrl,
          status:     'done',
          results: {
            condition:     report.condition,
            confidence:    report.confidence,
            temperature:   report.temperature,
            bloodPressure: report.bloodPressure,
            labTechName:   report.labTechName,
            patientAge:    patientAge.trim(),
            patientGender: patientGender.toLowerCase(),
            scanId,
            analyzedAt:    report.createdAt,
          },
        })
        .select('id')
        .single();

      if (scanErr) throw scanErr;

      await saveReport({ ...report, id: scanRow.id });

      navigation.navigate('Reports', {
        newScanId:   scanRow.id,
        patientName: patientName.trim(),
      });

      setPatientName('');
      setPatientAge('');
      setPatientGender('');
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back-ios-new" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan</Text>
          </View>
          <TouchableOpacity style={styles.resetButton} activeOpacity={0.8} onPress={handleReset}>
            <MaterialIcons name="restart-alt" size={18} color={COLORS.danger} />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Scan ID */}
        <View style={styles.scanIdCard}>
          <View style={styles.scanIdLeft}>
            <MaterialCommunityIcons name="fingerprint" size={18} color={COLORS.textMuted} />
            <Text style={styles.scanIdLabel}>SCAN ID</Text>
          </View>
          <Text style={styles.scanIdValue}>{scanId}</Text>
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
            <MaterialIcons name="info-outline" size={18} color={COLORS.warning} />
            <Text style={styles.validationHint}>{getValidationHint()}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, (!isFormValid || isAnalysing) && styles.disabledButton]}
          disabled={!isFormValid || isAnalysing}
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