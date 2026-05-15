// screens/Scan.js
//
// The technician fills in patient details, selects a doctor,
// captures the blood smear image, then starts AI analysis.

import React, { useState, useEffect, useContext } from 'react';
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
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { buildReport, saveReport } from '../utils/ReportUtils';
import { scanStyles as styles } from '../styles/ScanStyles';

// ─── TAB BAR CLEARANCE ────────────────────────────────────────────────────────
// The tab bar is position: 'absolute' in MainAppNavigator, so it sits ON
// TOP of screen content. We push the scroll content up by this amount so
// the "Start Analysis" button is never hidden under the bar.
const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 105 : 90;

// ─── MOCK DOCTORS ────────────────────────────────────────────────────────────
// Placeholder list shown in the doctor selector.
// When the backend and admin portal are ready, replace with:
//   const doctors = await fetch(`${API}/hospitals/${hospitalId}/doctors`).then(r => r.json());
const MOCK_DOCTORS = [
  { id: 'doc-1', name: 'Dr. Kwame Asante',  specialty: 'Haematology'      },
  { id: 'doc-2', name: 'Dr. Ama Serwaa',    specialty: 'Internal Medicine' },
  { id: 'doc-3', name: 'Dr. Kofi Boateng',  specialty: 'General Practice'  },
  { id: 'doc-4', name: 'Dr. Abena Mensah',  specialty: 'Paediatrics'       },
  { id: 'doc-5', name: 'Dr. Yaw Darko',     specialty: 'Haematology'       },
];

// ─── MOCK AI MODEL ────────────────────────────────────────────────────────────
// Simulates the AI prediction for now. Returns a condition key + confidence.
// When the real model is integrated, replace this with:
//
//   async function runAIAnalysis(imageUri) {
//     const form = new FormData();
//     form.append('image', { uri: imageUri, type: 'image/jpeg', name: 'smear.jpg' });
//     const res = await fetch('https://your-api.com/v1/predict', {
//       method: 'POST',
//       body: form,
//     });
//     return res.json(); // { condition: 'sickle', confidence: 94.2 }
//   }
//
async function runAIAnalysis(imageUri) {
  return new Promise((resolve) => {
    const pool = ['sickle', 'malaria', 'anaemia', 'normal'];
    const condition  = pool[Math.floor(Math.random() * pool.length)];
    const confidence = parseFloat((85 + Math.random() * 14).toFixed(1));
    // 2.8 second fake processing delay — feels realistic
    setTimeout(() => resolve({ condition, confidence }), 2800);
  });
}

// ─── SCAN ID GENERATOR ───────────────────────────────────────────────────────
// Produces a human-readable ID like "AP-2025-4821" for each scan.
function generateScanId() {
  const year   = new Date().getFullYear();
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `AP-${year}-${serial}`;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
const Scan = ({ navigation, route }) => {

  // ── Auth: get the logged-in technician's name from context
  // (replaces the hardcoded CURRENT_LAB_TECH = 'JOSHUA')
  const { user } = useContext(AuthContext);
  const labTechName = user?.name ?? 'Lab Technician';

  // ── Form state — each field is controlled (value + onChangeText)
  const [patientName,   setPatientName]   = useState('');
  const [temperature,   setTemperature]   = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [image,         setImage]         = useState(null);
  const [scanId,        setScanId]        = useState('');

  // ── Doctor selector
  const [selectedDoctor,     setSelectedDoctor]     = useState(null);
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);

  // ── Analysis
  const [isAnalysing, setIsAnalysing] = useState(false);

  // Generate a scan ID on first mount
  useEffect(() => {
    setScanId(generateScanId());
  }, []);

  // ─── THE DATA-LOSS FIX ──────────────────────────────────────────────────────
  // Problem: when CameraView calls navigation.navigate('ScanHome', { capturedPhoto }),
  // the ScanHome component regains focus. With React Navigation v7's native stack,
  // simply watching route.params in a useEffect can be unreliable on Android —
  // the component might re-render before the params are fully settled.
  //
  // Fix: we use navigation.addListener('focus') instead.
  //
  // Why this works:
  //   - The 'focus' event fires AFTER the screen is fully visible and route.params
  //     have been set. At this point, all form state (patientName, temperature, etc.)
  //     is 100% intact because the component was never unmounted — it was just
  //     behind CameraView on the stack.
  //   - We check for capturedPhoto in params, store it in state, then clear it
  //     (so it doesn't re-trigger on the next focus event, e.g., switching tabs).
  //
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const photo = route.params?.capturedPhoto;
      if (photo) {
        setImage(photo);
        // Clear the param to prevent re-processing next time this screen
        // gains focus (e.g., when the user switches away and back via tabs)
        navigation.setParams({ capturedPhoto: undefined });
      }
    });

    // Cleanup: React Navigation calls our listener removal when the component
    // unmounts. Without this, old listeners stack up and cause memory leaks.
    return unsubscribe;
  }, [navigation]); // Only depends on navigation — not on route.params,
                    // which would cause needless re-subscriptions.

// ── Validation: all five conditions must be true to enable Start Analysis
const isFormValid =
  patientName.trim()   !== '' &&
  temperature.trim()   !== '' &&
  bloodPressure.trim() !== '' &&
  (isHospitalUser ? selectedDoctor !== null : true) &&
  image                !== null;

  // ── Navigation helpers
  function openCamera() {
    navigation.navigate('CameraView');
  }

  function retakePhoto() {
    setImage(null);
    navigation.navigate('CameraView');
  }

  function handleReset() {
    Alert.alert(
      'Reset Form',
      'This will clear all fields and the captured image.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setPatientName('');
            setTemperature('');
            setBloodPressure('');
            setImage(null);
            setSelectedDoctor(null);
            setScanId(generateScanId()); // fresh ID for the next scan
          },
        },
      ]
    );
  }

  // ── Main analysis handler
  async function handleStartAnalysis() {
    if (!isFormValid) return;

    setIsAnalysing(true);

    try {
      // Step 1: Run the AI model (mocked for now)
      const prediction = await runAIAnalysis(image);

      // Step 2: Build the structured report object
      const report = buildReport({
        patientName:   patientName.trim(),
        patientId:     scanId,
        condition:     prediction.condition,
        confidence:    prediction.confidence,
        labTechName,
        imageUri:      image,
        temperature:   temperature.trim(),
        bloodPressure: bloodPressure.trim(),
doctorId:      isHospitalUser ? selectedDoctor?.id : null,
doctorName:    isHospitalUser ? selectedDoctor?.name : 'Solo User',
      });

      // Step 3: Persist to device storage
      await saveReport(report);

      // Step 4: Navigate to the Reports TAB and pass the new report.
      // NOTE: The tab is named 'Report' (singular) in MainAppNavigator.
      // This was 'Reports' before — that was a bug causing silent navigation failure.
      //
      // React Navigation searches UP the navigator tree for 'Report',
      // finds it as a tab in MainAppNavigator, and switches to it.
      navigation.navigate('Report', { newReport: report });

      // Step 5: Reset this form for the next patient
      setPatientName('');
      setTemperature('');
      setBloodPressure('');
      setImage(null);
      setSelectedDoctor(null);
      setScanId(generateScanId());

    } catch (error) {
      Alert.alert('Analysis Failed', 'Something went wrong. Please try again.');
      console.error('[AidePoint] Analysis error:', error);
    } finally {
      setIsAnalysing(false);
    }
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: TAB_BAR_CLEARANCE },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="microscope" size={22} color="#0bc9da" />
            <Text style={styles.title}>New Scan</Text>
          </View>
          <TouchableOpacity
            onPress={handleReset}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* ── SCAN ID (auto-generated, read-only) */}
        <View style={styles.scanBox}>
          <Text style={styles.scanLabel}>Scan ID</Text>
          <Text style={styles.scanId}>{scanId}</Text>
        </View>

        {/* ── PATIENT NAME */}
        <TextInput
          placeholder="Patient Full Name"
          placeholderTextColor="#9CA3AF"
          value={patientName}
          onChangeText={setPatientName}
          style={styles.input}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* ── TEMPERATURE + BLOOD PRESSURE (side by side) */}
        <View style={styles.row}>
          <TextInput
            placeholder="Temperature (°C)"
            placeholderTextColor="#9CA3AF"
            value={temperature}
            onChangeText={setTemperature}
            style={[styles.input, styles.half]}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
          <TextInput
            placeholder="Blood Pressure"
            placeholderTextColor="#9CA3AF"
            value={bloodPressure}
            onChangeText={setBloodPressure}
            style={[styles.input, styles.half]}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />
        </View>

        {/* ── DOCTOR SELECTOR */}
        {/* Tapping this opens a bottom-sheet modal with a list of doctors. */}
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setDoctorModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.selectorIcon}>
            <MaterialIcons
              name="person"
              size={20}
              color={selectedDoctor ? '#1A2F6E' : '#9CA3AF'}
            />
          </View>
          <View style={{ flex: 1 }}>
            {selectedDoctor ? (
              <>
                <Text style={styles.selectorValue}>{selectedDoctor.name}</Text>
                <Text style={styles.selectorSub}>{selectedDoctor.specialty}</Text>
              </>
            ) : (
              <Text style={styles.selectorPlaceholder}>
                Select Doctor to Receive Report
              </Text>
            )}
          </View>
          <MaterialIcons name="keyboard-arrow-down" size={22} color="#9CA3AF" />
        </TouchableOpacity>

        {/* ── CAMERA SECTION */}
        {!image ? (
          // No image yet — show the "Take Picture" button
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={openCamera}
            activeOpacity={0.8}
          >
            <MaterialIcons name="photo-camera" size={24} color="#0bc9da" />
            <Text style={styles.cameraText}>Take Blood Sample Picture</Text>
          </TouchableOpacity>
        ) : (
          // Image captured — show the preview with a Retake option
          <View style={styles.previewBox}>
            <Image
              source={{ uri: image }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <View style={styles.previewFooter}>
              <MaterialIcons name="check-circle" size={16} color="#27AE60" />
              <Text style={styles.previewText}>Image captured</Text>
              <TouchableOpacity onPress={retakePhoto} style={styles.retakeBtn}>
                <MaterialIcons name="refresh" size={14} color="#0bc9da" />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── VALIDATION HINT */}
        {/* Shows the FIRST thing the user still needs to complete.
            Once isFormValid is true, this disappears. */}
        {!isFormValid && (
          <Text style={styles.validationHint}>
            {!patientName.trim()   ? '● Enter the patient name'          :
             !temperature.trim()   ? '● Enter the temperature'           :
             !bloodPressure.trim() ? '● Enter the blood pressure'        :
             (isHospitalUser && !selectedDoctor)
                                     ? '● Select a doctor'              :
             !image                ? '● Capture a blood sample image'    : ''}
          </Text>
        )}
        <View style={{ height: 20 }} />

        {/* ── START ANALYSIS BUTTON */}
        <TouchableOpacity
          style={[
            styles.button,
            (!isFormValid || isAnalysing) && styles.disabledButton,
          ]}
          disabled={!isFormValid || isAnalysing}
          onPress={handleStartAnalysis}
          activeOpacity={0.85}
        >
          {isAnalysing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.buttonText}>Analysing Sample...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="analytics" size={20} color="#fff" />
              <Text style={styles.buttonText}>Start Analysis</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── GHS COMPLIANCE NOTICE */}
        <Text style={styles.hipaaText}>
          By clicking Start Analysis, you agree to the processing of medical
          data in accordance with GHS standards.
        </Text>

      </ScrollView>

      {/* ── DOCTOR SELECTION MODAL ────────────────────────────────────────────
          This is a "bottom sheet" — a modal that slides up from the bottom.
          We achieve this with:
            animationType="slide" → slides up
            transparent={true}    → background stays visible (dimmed)
          The overlay TouchableOpacity behind the sheet closes it on tap. */}
          {isHospitalUser && (
      <Modal
        visible={doctorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDoctorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Tapping outside the sheet closes it */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setDoctorModalVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
            {/* Drag handle — a visual indicator that this sheet can be dragged */}
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Doctor</Text>
            <Text style={styles.modalSubtitle}>
              Choose the doctor who will receive this report
            </Text>

            <FlatList
              data={MOCK_DOCTORS}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedDoctor?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.doctorRow,
                      isSelected && styles.doctorRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedDoctor(item);
                      setDoctorModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    {/* Avatar circle */}
                    <View style={[
                      styles.doctorAvatar,
                      isSelected && styles.doctorAvatarSelected,
                    ]}>
                      <MaterialIcons
                        name="person"
                        size={22}
                        color={isSelected ? '#fff' : '#1A2F6E'}
                      />
                    </View>

                    {/* Name + specialty */}
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.doctorName,
                        isSelected && { color: '#1A2F6E', fontWeight: '700' },
                      ]}>
                        {item.name}
                      </Text>
                      <Text style={styles.doctorSpecialty}>{item.specialty}</Text>
                    </View>

                    {/* Check icon for the selected item */}
                    {isSelected && (
                      <MaterialIcons name="check-circle" size={20} color="#1A2F6E" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
          )}
      {/* ── AI ANALYSIS OVERLAY ───────────────────────────────────────────────
          Covers the entire screen while the AI is running so the user
          can't accidentally tap something mid-analysis.
          It's rendered OUTSIDE the ScrollView so it covers everything. */}
      {isAnalysing && (
        <View style={styles.analysisOverlay}>
          <View style={styles.analysisCard}>
            <ActivityIndicator
              size="large"
              color="#1A2F6E"
              style={{ marginBottom: 18 }}
            />
            <Text style={styles.analysisTitle}>Analysing Blood Sample</Text>
            <Text style={styles.analysisSub}>
              AI model is processing the image.{'\n'}
              This may take a moment.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Scan;
