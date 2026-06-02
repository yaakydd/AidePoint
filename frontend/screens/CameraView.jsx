// screens/CameraView.js
//
// Blood smear camera capture screen.
//
// CRITICAL (expo-camera v15 / Expo SDK 54):
//   CameraView does NOT support children. All overlay controls
//   must be siblings inside a parent <View>, never nested inside <CameraView>.
//
// Naming note:
//   This file imports { CameraView } from 'expo-camera'.
//   The component exported from this file is named CameraScreen
//   to avoid any variable collision. The Stack.Screen name="CameraView"
//   string is unaffected — navigation.navigate('CameraView') still works.
//
// Flow:
//   Scan.js → navigate('CameraView', { existingData })
//   → user captures photo
//   → navigate('ScanHome', { capturedPhoto: uri })
//   → Scan.js focus-listener picks up the URI

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../assets/theme';


const CORNER_SIZE  = 26;
const CORNER_THICK = 3;
const GUIDE_SIZE   = 244;


// COMPONENT
// Named CameraScreen to avoid collision with expo-camera's
// CameraView export in the same file scope.


const CameraScreen = ({ navigation }) => {

  const [permission, requestPermission] = useCameraPermissions();
  const [facing,      setFacing]      = useState('back');
  const [flashMode,   setFlashMode]   = useState('off');
  const [isCapturing, setIsCapturing] = useState(false);

  const cameraRef = useRef(null);

  //  Permission: still loading 

  if (!permission) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  //  Permission: denied 

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <MaterialCommunityIcons
          name="camera-off"
          size={64}
          color="#CBD5E1"
        />
        <Text style={styles.permissionTitle}>
          Camera Access Required
        </Text>
        <Text style={styles.permissionSub}>
          AidePoint needs camera access to capture blood smear images.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
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

  //  Capture 

  async function takePicture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality:        0.85,   // sharp enough for AI, not oversized
        base64:         false,
        exif:           false,  // strip EXIF — no GPS or device data needed
        skipProcessing: false,
      });
      // Navigate back — Scan.js focus-listener will pick up capturedPhoto
      navigation.navigate('ScanHome', { capturedPhoto: photo.uri });
    } catch (err) {
      console.error('CameraScreen takePicture:', err.message);
      Alert.alert('Capture Failed', 'Could not take photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }



  return (
    <View style={styles.container}>

      {/*  Camera feed — NO children inside this component  */}
      <CameraView
        style={StyleSheet.absoluteFill}
        ref={cameraRef}
        facing={facing}
        flash={flashMode}
      />

      {/*  All controls: sibling to CameraView, NOT inside it  */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]}>

        {/* Top bar */}
        <SafeAreaView edges={['top']} style={styles.topBar}>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Blood Smear Capture</Text>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              setFlashMode(prev => (prev === 'off' ? 'on' : 'off'))
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name={flashMode === 'on' ? 'flash-on' : 'flash-off'}
              size={26}
              color={flashMode === 'on' ? '#FCD34D' : '#FFFFFF'}
            />
          </TouchableOpacity>

        </SafeAreaView>

        {/* Guide frame with corner brackets */}
        <View style={styles.guideCentreWrapper}>
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.guideText}>
            Centre the blood smear within the frame
          </Text>
        </View>

        {/* Bottom controls */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>

          {/* Flip camera */}
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() =>
              setFacing(prev => (prev === 'back' ? 'front' : 'back'))
            }
          >
            <MaterialIcons
              name="flip-camera-ios"
              size={30}
              color="#FFFFFF"
            />
            <Text style={styles.sideBtnLabel}>Flip</Text>
          </TouchableOpacity>

          {/* Shutter */}
          <TouchableOpacity
            style={[
              styles.captureBtn,
              isCapturing && styles.captureBtnDisabled,
            ]}
            onPress={takePicture}
            disabled={isCapturing}
            activeOpacity={0.85}
          >
            {isCapturing ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <View style={styles.captureInner} />
            )}
          </TouchableOpacity>

          {/* Spacer — keeps shutter centred */}
          <View style={styles.sideBtn} />

        </SafeAreaView>

      </View>

    </View>
  );
};

export default CameraScreen;

// ─
// STYLES
// ─

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },

  //  Overlay 
  overlay: {
    justifyContent: 'space-between',
    zIndex: 10,
  },

  //  Top bar 
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  topTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  //  Guide frame ─
  guideCentreWrapper: {
    alignItems: 'center',
  },

  guideFrame: {
    width:    GUIDE_SIZE,
    height:   GUIDE_SIZE,
    position: 'relative',
  },

  corner: {
    position:    'absolute',
    width:       CORNER_SIZE,
    height:      CORNER_SIZE,
    borderColor: '#FFFFFF',
  },

  cornerTL: {
    top: 0, left: 0,
    borderTopWidth:  CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth:   CORNER_THICK,
    borderRightWidth: CORNER_THICK,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth:   CORNER_THICK,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth:  CORNER_THICK,
  },

  guideText: {
    color:     'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontSize:  13,
    marginTop: 14,
  },

  //  Bottom controls ─
  bottomBar: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-evenly',
    paddingBottom:    Platform.OS === 'ios' ? 16 : 24,
    paddingHorizontal: 32,
    backgroundColor:  'rgba(0,0,0,0.35)',
  },

  sideBtn: {
    width:      60,
    alignItems: 'center',
  },

  sideBtnLabel: {
    color:     '#FFFFFF',
    fontSize:  11,
    marginTop: 4,
  },

  // Shutter ring
  captureBtn: {
    width:           76,
    height:          76,
    borderRadius:    38,
    borderWidth:     4,
    borderColor:     '#FFFFFF',
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: 'transparent',
  },

  captureBtnDisabled: {
    opacity: 0.55,
  },

  // Shutter fill circle
  captureInner: {
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: '#FFFFFF',
  },

  //  Permission screen ─
  permissionScreen: {
    flex:              1,
    justifyContent:    'center',
    alignItems:        'center',
    backgroundColor:   '#0F172A',
    paddingHorizontal: 32,
    gap:               12,
  },

  permissionTitle: {
    fontSize:   20,
    fontWeight: '700',
    color:      '#FFFFFF',
    textAlign:  'center',
  },

  permissionSub: {
    fontSize:   14,
    color:      '#94A3B8',
    textAlign:  'center',
    lineHeight: 22,
  },

  permissionBtn: {
    backgroundColor:  COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical:   14,
    borderRadius:      12,
    marginTop:         8,
  },

  permissionBtnText: {
    color:      '#FFFFFF',
    fontSize:   15,
    fontWeight: '600',
  },

  cancelLink: {
    marginTop: 8,
    padding:   8,
  },

  cancelLinkText: {
    color:    '#64748B',
    fontSize: 14,
  },
});
