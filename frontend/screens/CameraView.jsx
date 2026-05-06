// CameraView.js
// Full-screen camera used by the Scan screen to capture blood sample images.
// After the user confirms the photo, it navigates back to ScanScreen
// and passes the image URI via navigation params.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Camera } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function CameraView({ navigation }) {

  const [hasPermission, setHasPermission] = useState(null);
  const [photo, setPhoto]         = useState(null); // URI of captured photo
  const [lightOk, setLightOk]       = useState(true);
  const [focusOk, setFocusOk]       = useState(false);
  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Request camera permission and start the pulse animation on mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    // Continuous gentle pulse on the AI feedback badges
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900,  useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900,  useNativeDriver: true }),
      ])
    ).start();
  }, []);

  //  Capturing the image

  async function takePicture() {
    if (!cameraRef.current) return;
    const data = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    setPhoto(data.uri); // show preview to the user,then user confirms or retakes
  }

  // Confirm: send photo back to ScanScreen 
  // navigation.navigate('ScanHome', { capturedPhoto: uri }) puts the URI into
  // route.params on ScanScreen, which has a useEffect watching for it.

  function confirmPhoto() {
    if (photo) {
      navigation.navigate('ScanHome', { capturedPhoto: photo });
    }
  }

  function retakePhoto() {
    setPhoto(null); // clear preview, go back to live camera
  }

  function handleBack() {
    navigation.goBack();
  }

  //Camera Permission states 
  if (hasPermission === null) {
    return <View style={localStyles.blank} />;
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={localStyles.noPermissionScreen}>
        <MaterialIcons name="no-photography" size={48} color="#9CA3AF" />
        <Text style={localStyles.noPermissionTitle}>Camera Access Required</Text>
        <Text style={localStyles.noPermissionSub}>
          Please enable camera access in your device settings to capture blood samples.
        </Text>
        <TouchableOpacity style={localStyles.backBtn} onPress={handleBack}>
          <Text style={localStyles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Photo preview (after capture)

  if (photo) {
    return (
      <SafeAreaView style={localStyles.container}>

        {/* Preview image */}
        <Image source={{ uri: photo }} style={localStyles.previewFull} resizeMode="cover" />

        {/* Preview overlay */}
        <View style={localStyles.previewOverlay}>

          <View style={localStyles.previewHeader}>
            <Text style={localStyles.previewTitle}>Review Image</Text>
            <Text style={localStyles.previewSubtitle}>
              Make sure the blood sample is clearly visible and in focus
            </Text>
          </View>

          <View style={localStyles.previewActions}>
            {/* Retake */}
            <TouchableOpacity style={localStyles.retakeButton} onPress={retakePhoto} activeOpacity={0.8}>
              <MaterialIcons name="refresh" size={22} color="#fff" />
              <Text style={localStyles.retakeText}>Retake</Text>
            </TouchableOpacity>

            {/* Use this photo */}
            <TouchableOpacity style={localStyles.confirmButton} onPress={confirmPhoto} activeOpacity={0.85}>
              <MaterialIcons name="check" size={22} color="#fff" />
              <Text style={localStyles.confirmText}>Use Photo</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    );
  }

  // Live camera viewfinder

  return (
    <SafeAreaView style={localStyles.container}>
      <Camera style={localStyles.camera} ref={cameraRef}>

        {/* Back button */}
        <TouchableOpacity style={localStyles.backIconBtn} onPress={handleBack} activeOpacity={0.75}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Instruction text */}
        <View style={localStyles.instructionBanner}>
          <Text style={localStyles.instructionText}>
            Position the blood sample slide in the circle
          </Text>
        </View>

        {/* Circular alignment guide — helps lab tech centre the sample */}
        <View style={localStyles.viewfinder}>
          <Animated.View style={[localStyles.outerCircle, { transform: [{ scale: pulseAnim }] }]}>
            <View style={localStyles.innerCircle} />
          </Animated.View>
        </View>

        {/* AI quality feedback badges */}
        <View style={localStyles.feedbackRow}>
          <Animated.View style={[localStyles.badge, { transform: [{ scale: pulseAnim }] }]}>
            <MaterialIcons name="lightbulb" size={13} color={lightOk ? '#22c55e' : '#f87171'} />
            <Text style={localStyles.badgeText}>Light</Text>
          </Animated.View>
          <Animated.View style={[localStyles.badge, { transform: [{ scale: pulseAnim }] }]}>
            <MaterialIcons name="center-focus-strong" size={13} color={focusOk ? '#22c55e' : '#f87171'} />
            <Text style={localStyles.badgeText}>Focus</Text>
          </Animated.View>
        </View>

        {/* Capture button at the bottom */}
        <View style={localStyles.bottomBar}>
          <TouchableOpacity onPress={takePicture} style={localStyles.captureRing} activeOpacity={0.85}>
            <View style={localStyles.captureInner} />
          </TouchableOpacity>
        </View>

      </Camera>
    </SafeAreaView>
  );
}

// STYLES


const localStyles = StyleSheet.create({

  container:          { flex: 1, backgroundColor: '#000' },
  blank:              { flex: 1, backgroundColor: '#000' },
  camera:             { flex: 1 },

  // Back button
  backIconBtn:        { position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },

  // Instruction banner at the top
  instructionBanner:  { position: 'absolute', top: 70, left: 0, right: 0, alignItems: 'center' },
  instructionText:    { color: '#fff', fontSize: 13, fontWeight: '500', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },

  // Circular viewfinder guide
  viewfinder:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  outerCircle:        { width: width * 0.72, height: width * 0.72, borderRadius: width * 0.36, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' },
  innerCircle:        { width: width * 0.08, height: width * 0.08, borderRadius: width * 0.04, backgroundColor: 'rgba(255,255,255,0.35)' },

  // AI feedback badges
  feedbackRow:        { position: 'absolute', bottom: 110, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  badge:              { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText:          { color: '#fff', fontSize: 12, fontWeight: '500' },

  // Bottom capture controls
  bottomBar:          { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  captureRing:        { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  captureInner:       { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },

  // No permission
  noPermissionScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F8FA', padding: 32 },
  noPermissionTitle:  { fontSize: 18, fontWeight: '700', color: '#1A1B2E', marginTop: 16, marginBottom: 8 },
  noPermissionSub:    { fontSize: 14, color: '#9799A8', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  backBtn:            { paddingHorizontal: 28, paddingVertical: 13, backgroundColor: '#1A2F6E', borderRadius: 12 },
  backBtnText:        { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Photo preview
  previewFull:        { ...StyleSheet.absoluteFillObject },
  previewOverlay:     { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.25)' },
  previewHeader:      { padding: 24, paddingTop: 40 },
  previewTitle:       { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  previewSubtitle:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  previewActions:     { flexDirection: 'row', gap: 12, padding: 24, paddingBottom: 40 },
  retakeButton:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  retakeText:         { color: '#fff', fontSize: 15, fontWeight: '600' },
  confirmButton:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: '#1A2F6E' },
  confirmText:        { color: '#fff', fontSize: 15, fontWeight: '600' },
});
