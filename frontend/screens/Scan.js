import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { scanStyles as styles } from "../styles/ScanStyles"; // path correct

const Scan = () => {

  // FORM STATES
  const [patientName, setPatientName] = useState('');
  const [temperature, setTemperature] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [image, setImage] = useState(null);
  const [scanId, setScanId] = useState('');

  //  Scan ID is auto-generated and cannot be edited by the user
  useEffect(() => {
    const generateScanId = () => {
      const random = Math.floor(1000 + Math.random() * 9000);
      const year = new Date().getFullYear();
      return `AP-${year}-${random}`;
    };
    setScanId(generateScanId());
  }, []);

  // Camera Function(User must allow permission before the image can be taken)
  const takePicture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera access is needed.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // VALIDATION: Enable Start Analysis if image + inputs
  const isFormValid =
    patientName.trim() !== '' &&
    temperature.trim() !== '' &&
    bloodPressure.trim() !== '' &&
    image !== null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign: 'center', flex: 1 }]}>Scan</Text>
        </View>

        {/* SCAN ID */}
        <View style={styles.scanBox}>
          <Text style={styles.scanLabel}>Scan ID</Text>
          <Text style={styles.scanId}>{scanId}</Text>
        </View>

        {/* INPUTS */}
        <TextInput
          placeholder="Patient Name"
          value={patientName}
          onChangeText={setPatientName}
          style={styles.input}
        />

        <View style={styles.row}>
          <TextInput
            placeholder="Temperature (°C)"
            value={temperature}
            onChangeText={setTemperature}
            style={[styles.input, styles.half]}
          />
          <TextInput
            placeholder="Blood Pressure"
            value={bloodPressure}
            onChangeText={setBloodPressure}
            style={[styles.input, styles.half]}
          />
        </View>

        {/* TAKE PICTURE BUTTON */}
        <TouchableOpacity
          style={[
            styles.cameraButton,
            image && { backgroundColor: '#E5E7EB', borderColor: '#9CA3AF' }
          ]}
          onPress={takePicture}
          disabled={!!image} // disables after capture
        >
          <MaterialIcons name="photo-camera" size={24} color="#0bc9da" />
          <Text style={styles.cameraText}>
            {image ? 'Picture Captured' : 'Take Picture'}
          </Text>
        </TouchableOpacity>

        {/* IMAGE PREVIEW */}
        {image && (
          <View style={styles.previewBox}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <Text style={styles.previewText}>Captured Image</Text>
          </View>
        )}

        <View style={{ height: 30 }} />

        {/* START ANALYSIS */}
        <TouchableOpacity
          style={[
            styles.button,
            !isFormValid && styles.disabledButton
          ]}
          disabled={!isFormValid} // now enabled if image + fields filled
          onPress={() => Alert.alert('Analysis Started')}
        >
          <MaterialIcons name="analytics" size={20} color="#fff" />
          <Text style={styles.buttonText}>Start Analysis</Text>
        </TouchableOpacity>

        {/* HIPAA AGREEMENT TEXT */}
        <Text style={styles.hipaaText}>
          By clicking analysis, you agree to our processing of medical data according to HIPAA standards.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
};

export default Scan;