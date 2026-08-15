import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../assets/theme';
import { CameraStyles as styles, GUIDE_SIZE } from '../styles/CameraStyles';

const CAPTURE_TIPS = [
  'Focus through the eyepiece until sharp, then tap',
  'Fill the circle with the eyepiece view',
  'Flash off , use scope light only',
  'Hold steady, both hands (or adapter)',
];

// Below this, a shot is flagged as too dark to be reliably usable.
// This is a fast, cheap pre-filter only , it catches the obvious failure
// (flash off + scope light not aligned) before spending an upload on it.
// It is NOT a sharpness/blur check. Real blur detection (variance-of-Laplacian
// or similar) needs a proper image-processing library and is done server-side,
// in the same pipeline that scores anemia confidence , see ScanHome / backend.
const MIN_BRIGHTNESS = 40;

const CameraScreen = ({ navigation }) => {

  const [permission, requestPermission] = useCameraPermissions();
  const [facing,      setFacing]      = useState('back');
  const [flashMode,   setFlashMode]   = useState('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [tipsVisible, setTipsVisible] = useState(true);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [pictureSize, setPictureSize] = useState(undefined);

  const cameraRef = useRef(null);

  // Request the highest resolution the device's camera actually supports.
  // getAvailablePictureSizesAsync is a standard CameraView method, stable
  // across devices , not tied to a specific SDK quirk.
  useEffect(() => {
    if (!permission?.granted) return;
    (async () => {
      try {
        const sizes = await cameraRef.current?.getAvailablePictureSizesAsync?.();
        if (sizes?.length) {
          setPictureSize(sizes[sizes.length - 1]);
        }
      } catch (err) {
        console.error('CameraScreen getAvailablePictureSizesAsync:', err.message);
        // Fail open: capture still works at the device default resolution.
      }
    })();
  }, [permission?.granted]);

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

  //  Cheap client-side exposure pre-filter 
  // Downsamples the photo and estimates average brightness. Deliberately
  // simple: this only needs to catch "clearly unusable," not grade quality.
  // Real quality scoring (sharpness) happens server-side , see header note.
  async function isTooDark(uri) {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 8, height: 8 } }],
        { base64: true, compress: 0, format: ImageManipulator.SaveFormat.PNG }
      );
      if (!result.base64) return false;

      const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
      let sum = 0;
      let count = 0;
      for (let i = 8; i < bytes.length; i += 4) {
        sum += bytes[i];
        count++;
      }
      const avgBrightness = count ? sum / count : 255;
      return avgBrightness < MIN_BRIGHTNESS;
    } catch (err) {
      console.error('CameraScreen isTooDark:', err.message);
      return false; // fail open , never block a capture on a broken check
    }
  }

  //  Capture 
  async function takePicture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality:        0.9,
        base64:         false,
        exif:           false,
        skipProcessing: false,
      });

      const tooDark = await isTooDark(photo.uri);
      if (tooDark) {
        Alert.alert(
          'Image Looks Too Dark',
          'This capture may be too dark to analyze reliably. Check the scope light and retake, or continue anyway , final quality is also verified before analysis.',
          [
            { text: 'Retake', style: 'cancel' },
            {
              text: 'Use Anyway',
              onPress: () => navigation.navigate('ScanHome', { capturedPhoto: photo.uri }),
            },
          ]
        );
        return;
      }

      // Server performs the authoritative quality check (sharpness/blur)
      // as part of the same pipeline that scores anemia confidence.
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

      {/* Camera feed , no children inside this component */}
      <CameraView
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        ref={cameraRef}
        facing={facing}
        flash={flashMode}
        autofocus="on"
        pictureSize={pictureSize}
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

        {/* Capture tips , collapsed to one short line by default */}
        {tipsVisible && (
          <View style={styles.tipsPanel}>
            <TouchableOpacity
              style={styles.tipsPanelHeader}
              onPress={() => setTipsExpanded(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.tipsPanelTitle}>
                {tipsExpanded ? 'Capture checklist' : CAPTURE_TIPS[0]}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <MaterialIcons
                  name={tipsExpanded ? 'expand-less' : 'expand-more'}
                  size={18}
                  color="rgba(255,255,255,0.7)"
                />
                <TouchableOpacity
                  onPress={() => setTipsVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {tipsExpanded && CAPTURE_TIPS.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipNumberCircle}>
                  <Text style={styles.tipNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Circular guide , mirrors the round microscope eyepiece view.
            No tap-to-focus: expo-camera exposes no reliable cross-device API
            for it, so the guide's job is framing only. Sharp focus through
            the eyepiece is the technician's responsibility, per the checklist. */}
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