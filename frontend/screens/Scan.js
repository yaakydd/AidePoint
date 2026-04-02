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
import { useRoute, useNavigation } from '@react-navigation/native';
import { scanStyles as styles } from "../styles/ScanStyles";

const Scan = () => {
  const route = useRoute();
  const navigation = useNavigation();

  const [patientName, setPatientName] = useState('');
  const [temperature, setTemperature] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [image, setImage] = useState(null);
  const [scanId, setScanId] = useState('');

  // Generate scan ID
  useEffect(() => {
    const generateScanId = () => {
      const random = Math.floor(1000 + Math.random() * 9000);
      const year = new Date().getFullYear();
      return `AP-${year}-${random}`;
    };
    setScanId(generateScanId());
  }, []);

  // Receive captured image
  useEffect(() => {
    if (route.params?.capturedImage) setImage(route.params.capturedImage);
  }, [route.params?.capturedImage]);

  // Open camera
  const openCamera = () => navigation.navigate("CameraView");

  // Optional gallery
  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Gallery access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const isFormValid =
    patientName.trim() !== '' &&
    temperature.trim() !== '' &&
    bloodPressure.trim() !== '' &&
    image !== null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.logo}>
              <MaterialIcons name="biotech" size={20} color="#fff" />
            </View>
            <Text style={styles.title}>AidePoint</Text>
          </View>
        </View>

        {/* Scan ID */}
        <View style={styles.scanBox}>
          <Text style={styles.scanLabel}>Scan ID</Text>
          <Text style={styles.scanId}>{scanId}</Text>
        </View>

        {/* Inputs */}
        <TextInput placeholder="Patient Name" value={patientName} onChangeText={setPatientName} style={styles.input} />
        <View style={styles.row}>
          <TextInput placeholder="Temperature (°C)" value={temperature} onChangeText={setTemperature} style={[styles.input, styles.half]} />
          <TextInput placeholder="Blood Pressure" value={bloodPressure} onChangeText={setBloodPressure} style={[styles.input, styles.half]} />
        </View>

        {/* Camera Button */}
        <TouchableOpacity
          style={[styles.cameraButton, image && { backgroundColor: '#E5E7EB', borderColor: '#9CA3AF' }]}
          onPress={openCamera}
          disabled={!!image}
        >
          <MaterialIcons name="photo-camera" size={24} color="#0bc9da" />
          <Text style={styles.cameraText}>{image ? 'Picture Captured' : 'Take Picture'}</Text>
        </TouchableOpacity>

        {/* Gallery */}
        {!image && (
          <TouchableOpacity onPress={pickFromGallery}>
            <Text style={{ textAlign: 'center', marginTop: 10, color: '#0bc9da' }}>Upload from Gallery</Text>
          </TouchableOpacity>
        )}

        {/* Preview */}
        {image && (
          <View style={styles.previewBox}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <Text style={styles.previewText}>Captured Image</Text>
            <TouchableOpacity onPress={() => setImage(null)}>
              <Text style={{ color: 'red', textAlign: 'center', marginTop: 5 }}>Retake Image</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Start Analysis */}
        <View style={{ height: 20 }} />
        <TouchableOpacity
          style={[styles.button, !isFormValid && styles.disabledButton]}
          disabled={!isFormValid}
          onPress={() => {
            Alert.alert('Analysis Started');

            // TODO: Firebase Storage upload
            // TODO: Firestore save scan data
            // TODO: AI analysis integration
            // TODO: Navigate to ReportDetails
          }}
        >
          <MaterialIcons name="analytics" size={20} color="#fff" />
          <Text style={styles.buttonText}>Start Analysis</Text>
        </TouchableOpacity>

        <Text style={styles.hipaaText}>
          By clicking analysis, you agree to our processing of medical data according to HIPAA standards.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
};

export default Scan;