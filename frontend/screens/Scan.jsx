// screens/Scan.js
//
// AidePoint Scan Screen
//
// The technician:
// 1. Enters patient details
// 2. Selects the doctor to receive the report
// 3. Captures/uploads a blood smear image
// 4. Starts AI analysis

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
  FlatList,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import * as DocumentPicker from 'expo-document-picker';

import {
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';

import {
  buildReport,
  saveReport,
} from '../utils/ReportUtils';

import { scanStyles as styles } from '../styles/ScanStyles';

import { COLORS } from '../assets/theme';

// ─────────────────────────────────────────────────────────────
// TAB BAR CLEARANCE
// ─────────────────────────────────────────────────────────────
//
// Your bottom tab navigator is absolute-positioned.
// Without bottom padding, the last button becomes hidden
// underneath the tab bar.
//
const TAB_BAR_CLEARANCE =
  Platform.OS === 'ios' ? 105 : 90;

// ─────────────────────────────────────────────────────────────
// MOCK DOCTORS
// ─────────────────────────────────────────────────────────────
//
// Temporary placeholder doctor list.
// Replace with backend API later.
//
const MOCK_DOCTORS = [
  {
    id: 'doc-1',
    name: 'Dr. Kwame Asante',
    specialty: 'Haematology',
  },
  {
    id: 'doc-2',
    name: 'Dr. Ama Serwaa',
    specialty: 'Internal Medicine',
  },
  {
    id: 'doc-3',
    name: 'Dr. Kofi Boateng',
    specialty: 'General Practice',
  },
];

// ─────────────────────────────────────────────────────────────
// MOCK AI ANALYSIS
// ─────────────────────────────────────────────────────────────
//
// Simulates the AI prediction temporarily.
//
async function runAIAnalysis() {
  return new Promise((resolve) => {

    const pool = [
      'sickle',
      'malaria',
      'anaemia',
      'normal',
    ];

    const condition =
      pool[Math.floor(Math.random() * pool.length)];

    const confidence =
      parseFloat((85 + Math.random() * 14).toFixed(1));

    setTimeout(() => {
      resolve({
        condition,
        confidence,
      });
    }, 2800);
  });
}

// ─────────────────────────────────────────────────────────────
// GENERATE SCAN ID
// ─────────────────────────────────────────────────────────────
//
// Example:
// AP-2025-4821
//
function generateScanId() {

  const year =
    new Date().getFullYear();

  const serial =
    Math.floor(1000 + Math.random() * 9000);

  return `AP-${year}-${serial}`;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

const Scan = ({ navigation, route }) => {

  // ───────────────────────────────────────────────────────────
  // AUTH
  // ───────────────────────────────────────────────────────────

  const { user } = useAuth();

  const isHospitalUser =
    user?.role === 'hospital_staff';

  const labTechName =
    user?.name ?? 'Lab Technician';

  // ───────────────────────────────────────────────────────────
  // FORM STATE
  // ───────────────────────────────────────────────────────────

  const [patientName, setPatientName] =
    useState('');

  const [temperature, setTemperature] =
    useState('');

  const [bloodPressure, setBloodPressure] =
    useState('');

  const [image, setImage] =
    useState(null);

    const [imageViewerVisible, setImageViewerVisible] =
    useState(false);

  // Determines whether image came from:
  // camera OR upload
  const [imageSourceType, setImageSourceType] =
    useState(null);

  const [scanId, setScanId] =
    useState('');

  // ───────────────────────────────────────────────────────────
  // DOCTOR SELECTOR
  // ───────────────────────────────────────────────────────────

  const [selectedDoctor, setSelectedDoctor] =
    useState(null);

  const [doctorModalVisible, setDoctorModalVisible] =
    useState(false);

  // ───────────────────────────────────────────────────────────
  // ANALYSIS STATE
  // ───────────────────────────────────────────────────────────

  const [isAnalysing, setIsAnalysing] =
    useState(false);

  // ───────────────────────────────────────────────────────────
  // INITIALISE SCAN ID
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    setScanId(generateScanId());
  }, []);

  // ───────────────────────────────────────────────────────────
  // CAMERA RETURN HANDLER
  // ───────────────────────────────────────────────────────────
  //
  // When CameraView navigates back with:
  // navigation.navigate('Scan', { capturedPhoto })
  //
  // this listener restores the image safely.
  //
  useEffect(() => {

    const unsubscribe =
      navigation.addListener('focus', () => {

        const photo =
          route.params?.capturedPhoto;

        // IMPORTANT:
        // Only update image.
        // Never reset other form fields.
        if (photo) {

          setImage(photo);

          setImageSourceType('camera');

          navigation.setParams({
            capturedPhoto: undefined,
          });
        }
      });

    return unsubscribe;

  }, [navigation, route.params]);

  // ───────────────────────────────────────────────────────────
  // VALIDATION
  // ───────────────────────────────────────────────────────────
  //
  // The Start Analysis button only becomes enabled
  // when ALL required fields are completed.
  //

  const isFormValid =
    patientName.trim() !== '' &&
    temperature.trim() !== '' &&
    bloodPressure.trim() !== '' &&
    (isHospitalUser
      ? selectedDoctor !== null
      : true) &&
    image !== null;

  // ───────────────────────────────────────────────────────────
  // NAVIGATION HELPERS
  // ───────────────────────────────────────────────────────────

  function openCamera() {

    navigation.navigate('CameraView', {

      existingData: {
        patientName,
        temperature,
        bloodPressure,
        selectedDoctor,
      },

    });
  }

  function retakePhoto() {

    navigation.navigate('CameraView');
  }

    // ───────────────────────────────────────────────────────────
  // PICK PNG FILE
  // ───────────────────────────────────────────────────────────
  //
  // Opens phone file explorer and only allows PNG images.
  //

  async function handlePickFile() {

    try {

      const result =
        await DocumentPicker.getDocumentAsync({

          type: 'image/png',

          copyToCacheDirectory: true,

          multiple: false,
        });

      // User cancelled picker
      if (result.canceled) {
        return;
      }

      const file =
        result.assets?.[0];

      // Safety check
      if (!file) {
        return;
      }

      // Ensure PNG only
      if (
        !file.name?.toLowerCase().endsWith('.png')
      ) {

        Alert.alert(
          'Invalid File',
          'Only PNG files are supported.'
        );

        return;
      }

      // Store image URI
      setImage(file.uri);

      // Mark source as upload
      setImageSourceType('upload');

    } catch (error) {

      console.log(error);

      Alert.alert(
        'Upload Failed',
        'Unable to open file picker.'
      );
    }
  }
  // ───────────────────────────────────────────────────────────
  // RESET FORM
  // ───────────────────────────────────────────────────────────

  function handleReset() {

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
            setTemperature('');
            setBloodPressure('');
            setImage(null);
            setSelectedDoctor(null);

            setScanId(generateScanId());
          },
        },
      ]
    );
                setImageSourceType(null);

            setImageViewerVisible(false);
  }

  // ───────────────────────────────────────────────────────────
  // START ANALYSIS
  // ───────────────────────────────────────────────────────────

  async function handleStartAnalysis() {

    if (!isFormValid) return;

    setIsAnalysing(true);

    try {

      const prediction =
        await runAIAnalysis(image);

      const report = buildReport({

        patientName:
          patientName.trim(),

        patientId:
          scanId,

        condition:
          prediction.condition,

        confidence:
          prediction.confidence,

        labTechName,

        imageUri:
          image,

        temperature:
          temperature.trim(),

        bloodPressure:
          bloodPressure.trim(),

        doctorId:
          isHospitalUser
            ? selectedDoctor?.id
            : null,

        doctorName:
          isHospitalUser
            ? selectedDoctor?.name
            : 'Solo User',
      });

      await saveReport(report);

      navigation.navigate(
        'Report',
        { newReport: report }
      );

      // Reset form after success
      setPatientName('');
      setTemperature('');
      setBloodPressure('');
      setImage(null);
      setSelectedDoctor(null);

      setScanId(generateScanId());

    } catch (error) {

      Alert.alert(
        'Analysis Failed',
        'Something went wrong.'
      );

      console.error(error);

    } finally {

      setIsAnalysing(false);
    }
  }

  // ───────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────

  return (

    <SafeAreaView
      style={styles.container}
    >

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom:
              TAB_BAR_CLEARANCE,
          },
        ]}
      >

        {/* ───────────────────────────────────────────── */}
        {/* HEADER */}
        {/* ───────────────────────────────────────────── */}

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

    <Text style={styles.headerTitle}>
      Scan
    </Text>

  </View>

  <TouchableOpacity
    style={styles.resetButton}
    activeOpacity={0.8}
    onPress={handleReset}
  >

    <MaterialIcons
      name="restart-alt"
      size={18}
      color={COLORS.danger}
    />

    <Text style={styles.resetText}>
      Reset
    </Text>

  </TouchableOpacity>

</View>
        {/* ───────────────────────────────────────────── */}
        {/* SCAN ID */}
        {/* ───────────────────────────────────────────── */}

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

          <Text style={styles.scanIdValue}>
            {scanId}
          </Text>

        </View>

        {/* ───────────────────────────────────────────── */}
        {/* PATIENT INFORMATION */}
        {/* ───────────────────────────────────────────── */}

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
          onChangeText={setPatientName}
          style={styles.input}
        />

        {/* TEMPERATURE + BLOOD PRESSURE */}

        <View style={styles.row}>

          <View style={{ flex: 1 }}>

            <Text style={styles.inputLabel}>
              Temperature (°C)
            </Text>

            <TextInput
              placeholder="e.g. 36.5"
              placeholderTextColor={COLORS.textMuted}
              value={temperature}
              onChangeText={setTemperature}
              style={[styles.input, styles.half]}
            />

          </View>

          <View style={{ flex: 1 }}>

            <Text style={styles.inputLabel}>
              Blood Pressure
            </Text>

            <TextInput
              placeholder="120/80"
              placeholderTextColor={COLORS.textMuted}
              value={bloodPressure}
              onChangeText={setBloodPressure}
              style={[styles.input, styles.half]}
            />

          </View>

        </View>

        {/* ───────────────────────────────────────────── */}
        {/* DOCTOR SELECTOR */}
        {/* ───────────────────────────────────────────── */}

        {isHospitalUser && (
          <>

            <Text style={styles.inputLabel}>
              Select Doctor to Receive Report
            </Text>

            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() =>
                setDoctorModalVisible(true)
              }
            >

              <MaterialIcons
                name="person-outline"
                size={20}
                color={COLORS.primary}
              />

              <Text style={styles.selectorText}>
                {selectedDoctor
                  ? selectedDoctor.name
                  : 'Select Doctor'}
              </Text>

              <MaterialIcons
                name="keyboard-arrow-down"
                size={24}
                color={COLORS.textSecondary}
              />

            </TouchableOpacity>
          </>
        )}

        {/* ───────────────────────────────────────────── */}
        {/* BLOOD SMEAR */}
        {/* ───────────────────────────────────────────── */}

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

        {/* TAKE PICTURE BUTTON */}

        {/* TAKE PICTURE BUTTON */}

{!image && !imageSourceType && (

  <TouchableOpacity
    style={styles.takePictureBtn}
    onPress={openCamera}
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

{/* IMAGE PREVIEW */}

{image && (

  <View style={styles.previewWrapper}>

    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.previewBox}
      onPress={() =>
        setImageViewerVisible(true)
      }
    >

      <Image
        source={{ uri: image }}
        style={styles.previewImage}
      />

    </TouchableOpacity>

    <TouchableOpacity
      onPress={retakePhoto}
    >
      <Text style={styles.retakeText}>
        Retake Photo
      </Text>
    </TouchableOpacity>

  </View>
)}
        {/* UPLOAD CARD */}
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
            Tap to browse or drag and drop your image here
          </Text>

          <TouchableOpacity 
          style={styles.browseBtn} onPress={handlePickFile}>
            <Text style={styles.browseBtnText}>
              Browse Files
            </Text>
          </TouchableOpacity>

        </View>
)}
        {/* ───────────────────────────────────────────── */}
        {/* VALIDATION HINT */}
        {/* ───────────────────────────────────────────── */}

        {!isFormValid && (

<View style={styles.validationContainer}>

  <MaterialIcons
    name="info-outline"
    size={18}
    color={COLORS.warning}
  />

  <Text style={styles.validationHint}>

    {!patientName.trim()
      ? 'Enter patient name'
      : !temperature.trim()
      ? 'Enter temperature'
      : !bloodPressure.trim()
      ? 'Enter blood pressure'
      : isHospitalUser && !selectedDoctor
      ? 'Select a doctor'
      : !image
      ? 'Capture blood smear image'
      : ''}

  </Text>

</View>
        )}

        {/* START ANALYSIS BUTTON */}

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
                Analysing...
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
                Start Analysis
              </Text>
            </>
          )}

        </TouchableOpacity>

        {/* GHS NOTICE */}

        <Text style={styles.hipaaText}>
          By clicking analysis, you agree to our
          processing of medical data according
          to GHS standards.
        </Text>

      </ScrollView>

            {/* ───────────────────────────────────────────── */}
      {/* IMAGE VIEWER */}
      {/* ───────────────────────────────────────────── */}

      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
      >

        <View style={styles.imageModalOverlay}>

          <TouchableOpacity
            style={styles.closeViewer}
            onPress={() =>
              setImageViewerVisible(false)
            }
          >

            <MaterialIcons
              name="close"
              size={28}
              color="#fff"
            />

          </TouchableOpacity>

          <Image
            source={{ uri: image }}
            style={styles.fullImage}
            resizeMode="contain"
          />

        </View>

      </Modal>

    </SafeAreaView>
  );
};

export default Scan;