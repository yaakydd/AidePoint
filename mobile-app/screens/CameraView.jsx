// screens/CameraView.js
//
// CRITICAL FIX: expo-camera v15 (Expo SDK 54) CameraView does NOT allow children.
// Controls must be siblings of CameraView inside a parent View, not nested inside it.
//
// Navigation flow:
//   ScanScreen → navigate('CameraView') → user takes photo →
//   navigate('ScanHome', { capturedPhoto: uri }) → ScanScreen.focus listener picks it up
//
// Image quality:
//   quality: 0.85 — good balance for microscope images.
//   skipProcessing: false — ensures EXIF is stripped cleanly.

import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../assets/theme';

const CameraScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing,      setFacing]      = useState('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashMode,   setFlashMode]   = useState('off');  // 'off' | 'on'
  const cameraRef = useRef(null);

  // ── Permission gate ───────────────────────────────────────────────────────
  if (!permission) {
    // Still loading permission status
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#CBD5E1" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionSub}>
          AidePoint needs camera access to capture blood smear images.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelLink}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelLinkText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Capture ───────────────────────────────────────────────────────────────
  async function takePicture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality:         0.85,   // 85% quality — sharp enough for AI, not oversized
        base64:          false,  // we read base64 in ScanScreen only when needed
        exif:            false,  // strip EXIF — no GPS or device data needed
        skipProcessing:  false,
      });
      // Navigate back to ScanScreen with the captured URI
      navigation.navigate('ScanHome', { capturedPhoto: photo.uri });
    } catch (err) {
      console.error('CameraView capture error:', err);
      Alert.alert('Capture Failed', 'Could not take photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  // KEY: CameraView has NO children. All controls are siblings inside the
  // parent View and float on top via StyleSheet.absoluteFill + zIndex.
  return (
    <View style={styles.container}>

      {/* ── Camera feed — fills the whole screen ── */}
      {/* NO children nested here — this was the source of the error */}
      <CameraView
        style={StyleSheet.absoluteFill}
        ref={cameraRef}
        facing={facing}
        flash={flashMode}
      />

      {/* ── Overlay controls — sibling to CameraView, NOT inside it ── */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]}>

        {/* Top bar */}
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Blood Smear Capture</Text>

          {/* Flash toggle */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setFlashMode(m => m === 'off' ? 'on' : 'off')}
          >
            <MaterialIcons
              name={flashMode === 'on' ? 'flash-on' : 'flash-off'}
              size={26}
              color={flashMode === 'on' ? '#FCD34D' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Centre guide frame */}
        <View style={styles.guideFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.guideText}>
          Centre the blood smear within the frame
        </Text>

        {/* Bottom controls */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>

          {/* Flip camera */}
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
          >
            <MaterialIcons name="flip-camera-ios" size={30} color="#FFFFFF" />
            <Text style={styles.sideBtnText}>Flip</Text>
          </TouchableOpacity>

          {/* Capture button */}
          <TouchableOpacity
            style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
            onPress={takePicture}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            {isCapturing
              ? <ActivityIndicator size="large" color={COLORS.primary} />
              : <View style={styles.captureInner} />
            }
          </TouchableOpacity>

          {/* Placeholder to balance the row */}
          <View style={styles.sideBtn} />
        </SafeAreaView>
      </View>
    </View>
  );
};

export default CameraScreen;

// ── Styles ──────────────────────────────────────────────────────────────────────
const CORNER_SIZE = 24;
const CORNER_THICK = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centred:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },

  // Overlay sits on top of the camera feed
  overlay: {
    justifyContent: 'space-between',
    zIndex: 10,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
  },
  topTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  iconBtn:  { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  // Guide frame (corner brackets)
  guideFrame: {
    width: 240,
    height: 240,
    alignSelf: 'center',
    position: 'relative',
  },
  corner:     { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#FFFFFF' },
  cornerTL:   { top: 0,  left: 0,  borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK },
  cornerTR:   { top: 0,  right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK },
  cornerBL:   { bottom: 0, left: 0,  borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK },
  cornerBR:   { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK },
  guideText:  {
    color: 'rgba(255,255,255,0.8)', textAlign: 'center',
    fontSize: 13, marginTop: 12,
  },

  // Bottom controls
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingHorizontal: 32,
  },
  sideBtn:     { width: 60, alignItems: 'center' },
  sideBtnText: { color: '#FFFFFF', fontSize: 11, marginTop: 4 },

  // Capture shutter button
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  captureBtnDisabled: { opacity: 0.6 },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },

  // Permission screen
  permissionScreen: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0F172A', paddingHorizontal: 32, gap: 12,
  },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  permissionSub:   { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 21 },
  permissionBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 12, marginTop: 8,
  },
  permissionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  cancelLink:        { marginTop: 8 },
  cancelLinkText:    { color: '#64748B', fontSize: 14 },
});
