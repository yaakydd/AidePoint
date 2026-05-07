// ScanScreen.js
// Lab technician fills in patient details, captures a blood sample image,
// selects a doctor, then starts the AI analysis.
// When analysis completes, a report is built and sent to the Reports screen.
//


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
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { buildReport, saveReport } from '../utils/ReportUtils';
import { scanStyles as styles } from '../styles/ScanStyles';

// MOCK DOCTORS LIST
// These are placeholder doctors shown in the selector.
// When the backend is ready, replace this array with an API call:
//   const doctors = await fetch('/api/doctors').then(r => r.json());
// The admin website will manage which doctors appear here.

const MOCK_DOCTORS = [
  { id: 'doc-1', name: 'Dr. Kwame Asante',  specialty: 'Haematology' },
  { id: 'doc-2', name: 'Dr. Ama Serwaa',    specialty: 'Internal Medicine' },
  { id: 'doc-3', name: 'Dr. Kofi Boateng',  specialty: 'General Practice' },
  { id: 'doc-4', name: 'Dr. Abena Mensah',  specialty: 'Paediatrics' },
  { id: 'doc-5', name: 'Dr. Yaw Darko',     specialty: 'Haematology' },
];


// MOCK AI MODEL
// Simulates the AI prediction while the real model is being integrated.
// Returns a condition key and a confidence score after a short delay.
//
// When the real AI is ready, replace this function with:
//   const formData = new FormData();
//   formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'sample.jpg' });
//   const result = await fetch('https://your-api.com/predict', { method: 'POST', body: formData });
//   return result.json(); // { condition: 'sickle', confidence: 94.2 }


function runAIAnalysis(imageUri) {
  return new Promise((resolve) => {
    const conditions  = ['sickle', 'malaria', 'anaemia', 'normal'];
    const condition   = conditions[Math.floor(Math.random() * conditions.length)];
    const confidence  = parseFloat((85 + Math.random() * 14).toFixed(1)); // 85–99%
    setTimeout(() => resolve({ condition, confidence }), 2800);
  });
}


// CURRENT LAB TECH
// Hardcoded for now. When auth is built, replace with the logged-in user:
//   const { user } = useAuthContext();
//   const labTechName = user.name;


const CURRENT_LAB_TECH = 'JOSHUA';


// HELPER FUNCTIONS FOR SCAN ID GENERATION


function generateScanId() {
  const year   = new Date().getFullYear();
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `AP-${year}-${serial}`;
}


const Scan = ({ navigation, route }) => {

  // Patient Form state 
  const [patientName,   setPatientName]   = useState('');
  const [temperature,   setTemperature]   = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [image,         setImage]         = useState(null);
  const [scanId,        setScanId]        = useState('');

  // Doctor selector state 
  const [selectedDoctor,      setSelectedDoctor]      = useState(null);
  const [doctorModalVisible,  setDoctorModalVisible]  = useState(false);

  //  Analysis state 
  const [isAnalysing, setIsAnalysing] = useState(false);

  // Generate a Scan ID on first mount 
  useEffect(() => {
    setScanId(generateScanId());
  }, []);

  // Receive photo back from CameraView 
  // CameraView calls navigation.navigate('ScanHome', { capturedPhoto: uri })
  // This effect picks it up and stores it in state.
  useEffect(() => {
    const incoming = route?.params?.capturedPhoto;
    if (incoming) {
      setImage(incoming);
      navigation.setParams({ capturedPhoto: undefined }); // clear so it doesn't re-trigger
    }
  }, [route?.params?.capturedPhoto]);

  // Patient Form validation 
  // All five conditions must be true before the button becomes active
  const isFormValid =
    patientName.trim()   !== '' &&
    temperature.trim()   !== '' &&
    bloodPressure.trim() !== '' &&
    selectedDoctor       !== null &&
    image                !== null;

  // Handlers 

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
            setScanId(generateScanId()); // new Scan ID for the fresh form
          },
        },
      ]
    );
  }

  async function handleStartAnalysis() {
    if (!isFormValid) return;

    setIsAnalysing(true);

    try {
      // Step 1: First run the AI model (mocked for now)
      const prediction = await runAIAnalysis(image);

      // Step 2: Build the structured report object
      const report = buildReport({
        patientName:   patientName.trim(),
        patientId:     scanId,
        condition:     prediction.condition,
        confidence:    prediction.confidence,
        labTechName:   CURRENT_LAB_TECH,
        imageUri:      image,
        temperature:   temperature.trim(),
        bloodPressure: bloodPressure.trim(),
        doctorId:      selectedDoctor.id,
        doctorName:    selectedDoctor.name,
      });

      // Step 3: Persist report to the device (AsyncStorage)
      await saveReport(report);

      // Step 4: Navigate to the Reports tab and pass the new report.
      // ReportsScreen watches for route.params.newReport and prepends it.
      navigation.navigate('Reports', { newReport: report });

      // Step 5: Reset form for the next scan
      setPatientName('');
      setTemperature('');
      setBloodPressure('');
      setImage(null);
      setSelectedDoctor(null);
      setScanId(generateScanId());

    } catch (error) {
      Alert.alert('Analysis Failed', 'Something went wrong. Please try again.');
      console.error('[Aidepoint] Analysis error:', error);
    } finally {
      setIsAnalysing(false);
    }
  }


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>New Scan</Text>
          <TouchableOpacity onPress={handleReset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* SCAN ID is read-only and auto-generated)  */}
        <View style={styles.scanBox}>
          <Text style={styles.scanLabel}>Scan ID</Text>
          <Text style={styles.scanId}>{scanId}</Text>
        </View>

        {/* PATIENT NAME */}
        <TextInput
          placeholder="Patient Name"
          placeholderTextColor="#9CA3AF"
          value={patientName}
          onChangeText={setPatientName}
          style={styles.input}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* TEMPERATURE and BLOOD PRESSURE */}
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

        {/* DOCTOR SELECTOR LIST */}
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

        {/* CAMERA SECTION */}
        {!image ? (
          // Show "Take Picture" button if no image yet
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={openCamera}
            activeOpacity={0.8}
          >
            <MaterialIcons name="photo-camera" size={24} color="#0bc9da" />
            <Text style={styles.cameraText}>Take Blood Sample Picture</Text>
          </TouchableOpacity>
        ) : (
          // Show preview and retake option when image is captured
          <View style={styles.previewBox}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <View style={styles.previewFooter}>
              <MaterialIcons name="check-circle" size={16} color="#27AE60" />
              <Text style={styles.previewText}>Image Captured</Text>
              <TouchableOpacity onPress={retakePhoto} style={styles.retakeBtn}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FORM VALIDATION HINT */}
        {!isFormValid && (
          <Text style={styles.validationHint}>
            {!patientName.trim()   ? '• Enter patient name'              :
             !temperature.trim()   ? '• Enter temperature'               :
             !bloodPressure.trim() ? '• Enter blood pressure'            :
             !selectedDoctor       ? '• Select a doctor'                 :
             !image                ? '• Capture a blood sample image'    : ''}
          </Text>
        )}

        <View style={{ height: 20 }} />

        {/* START ANALYSIS BUTTON */}
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

        {/* GHS NOTICE */}
        <Text style={styles.hipaaText}>
          By clicking Start Analysis, you agree to the processing of medical
          data in accordance with GHS standards.
        </Text>

      </ScrollView>

      {/* DOCTOR SELECTION MODAL */}
      <Modal
        visible={doctorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDoctorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setDoctorModalVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
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
                    style={[styles.doctorRow, isSelected && styles.doctorRowSelected]}
                    onPress={() => {
                      setSelectedDoctor(item);
                      setDoctorModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.doctorAvatar, isSelected && styles.doctorAvatarSelected]}>
                      <MaterialIcons
                        name="person"
                        size={22}
                        color={isSelected ? '#fff' : '#1A2F6E'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.doctorName, isSelected && { color: '#1A2F6E' }]}>
                        {item.name}
                      </Text>
                      <Text style={styles.doctorSpecialty}>{item.specialty}</Text>
                    </View>
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

      {/* AI ANALYSIS LOADING OVERLAY  */}
      {/* Covers the whole screen while AI is running so user can't interact */}
      {isAnalysing && (
        <View style={styles.analysisOverlay}>
          <View style={styles.analysisCard}>
            <ActivityIndicator size="large" color="#1A2F6E" style={{ marginBottom: 16 }} />
            <Text style={styles.analysisTitle}>Analysing Blood Sample</Text>
            <Text style={styles.analysisSub}>
              AI model is processing the image.{'\n'}This may take a moment.
            </Text>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

export default Scan
