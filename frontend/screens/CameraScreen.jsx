import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../assets/theme';
import { CameraStyles as styles, GUIDE_SIZE } from '../styles/CameraStyles';

const CAPTURE_TIPS = [
  'Focus the microscope itself first — the cell edges should look sharp through the eyepiece before you tap the shutter.',
  'Centre the sample inside the circular guide so the whole frame is filled, the way it looks through the eyepiece.',
  'Turn the phone flash off — rely on the microscope\u2019s own light source, flash just creates glare and washes out the cells.',
  'Hold the phone steady against the eyepiece with both hands, or use a phone-to-eyepiece adapter if you have one.',
];

const CameraScreen = ({ navigation }) => {

  const [permission, requestPermission] = useCameraPermissions();
  const [facing,      setFacing]      = useState('back');
  const [flashMode,   setFlashMode]   = useState('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [tipsVisible, setTipsVisible] = useState(true);

  const cameraRef = useRef(null);

  // ── Permission: still loading ──────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Permission: denied ──────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#CBD5E1" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionSub}>
          AidePoint needs camera access to capture blood smear images.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permissionBtnText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelLinkText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Capture ──────────────────────────────────────────────────────────────
  async function takePicture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality:        0.85,
        base64:         false,
        exif:           false,
        skipProcessing: false,
      });
      // Navigate back to the Scan form — its focus-listener picks up capturedPhoto.
      // ScanStackNavigator registers Scan.js under the name "ScanHome".
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

      {/* Camera feed — no children inside this component */}
      <CameraView
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        ref={cameraRef}
        facing={facing}
        flash={flashMode}
      />

      {/* All controls: sibling to CameraView */}
      <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, styles.overlay]}>

        {/* Top bar */}
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Blood Smear Capture</Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setTipsVisible(v => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="lightbulb-outline" size={22} color={tipsVisible ? '#FCD34D' : '#FFFFFF'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setFlashMode(prev => (prev === 'off' ? 'on' : 'off'))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name={flashMode === 'on' ? 'flash-on' : 'flash-off'}
                size={22}
                color={flashMode === 'on' ? '#FCD34D' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Capture tips */}
        {tipsVisible && (
          <View style={styles.tipsPanel}>
            <View style={styles.tipsPanelHeader}>
              <Text style={styles.tipsPanelTitle}>Get a sharper capture</Text>
              <TouchableOpacity onPress={() => setTipsVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
            {CAPTURE_TIPS.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipNumberCircle}>
                  <Text style={styles.tipNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Circular guide — mirrors the round microscope eyepiece view */}
        <View style={styles.guideCentreWrapper}>
          <View style={styles.guideFrame}>
            <View style={styles.guideFrameInner} />
          </View>
          <Text style={styles.guideText}>
            Fill the circle with the eyepiece view, the way you'd see it looking through the microscope
          </Text>
        </View>

        {/* Bottom controls */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => setFacing(prev => (prev === 'back' ? 'front' : 'back'))}
          >
            <MaterialIcons name="flip-camera-ios" size={28} color="#FFFFFF" />
            <Text style={styles.sideBtnLabel}>Flip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
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

          <View style={styles.sideBtn} />
        </SafeAreaView>

      </View>
    </View>
  );
};

export default CameraScreen;
