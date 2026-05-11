// screens/CameraView.js
//
// Full-screen camera screen. Opened from ScanScreen when the technician
// taps "Take Blood Sample Picture". The flow is:
//
//   1. Check/request camera permission
//   2. Show live viewfinder with alignment guide
//   3. Technician taps the shutter button
//   4. Preview screen shows the captured image
//   5. Technician taps "Use Photo" → navigate back to ScanHome with the URI
//   OR taps "Retake" → go back to the live viewfinder

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import {
  CameraView as ExpoCameraView,
  useCameraPermissions,
} from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// The square frame that guides the technician to position the slide correctly.
// 78% of screen width — large enough to fill most of the microscope eyepiece.
const FRAME_SIZE = width * 0.78;

// ─── CORNER BRACKET COMPONENT ────────────────────────────────────────────────
// Classic camera "corner bracket" viewfinder.
// Each corner is a small L-shape made from two borders on adjacent sides.
// Much more professional-looking than a full circle outline.
const CornerBrackets = () => {
  // Length of each arm of the L-shape (in pixels)
  const ARM = 24;
  const THICKNESS = 3;
  const COLOR = 'rgba(255,255,255,0.9)';

  // Each corner position + which two sides to show
  const corners = [
    { top: 0,    left: 0,    borderTop: THICKNESS, borderLeft: THICKNESS },
    { top: 0,    right: 0,   borderTop: THICKNESS, borderRight: THICKNESS },
    { bottom: 0, left: 0,    borderBottom: THICKNESS, borderLeft: THICKNESS },
    { bottom: 0, right: 0,   borderBottom: THICKNESS, borderRight: THICKNESS },
  ];

  return (
    <View
      style={{
        position: 'absolute',
        width: FRAME_SIZE,
        height: FRAME_SIZE,
      }}
    >
      {corners.map((corner, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: ARM,
            height: ARM,
            borderColor: COLOR,
            ...corner,
          }}
        />
      ))}
    </View>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function CameraView({ navigation }) {

  // useCameraPermissions() returns [permissionObject, requestFn].
  // permission.granted = true means camera access was approved.
  const [permission, requestPermission] = useCameraPermissions();

  // The URI of the captured photo, or null if not captured yet.
  const [photo, setPhoto] = useState(null);

  // Whether the torch (flash) is on.
  // Useful in low-light microscopy environments.
  const [torchOn, setTorchOn] = useState(false);

  // Reference to the ExpoCameraView instance.
  // We call .takePictureAsync() on it when the shutter button is pressed.
  const cameraRef = useRef(null);

  // Animated value for the pulsing shutter ring + status indicators.
  // Goes between 1 and 1.05 on a loop — a subtle "ready" animation.
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animated value for the shutter flash effect.
  // Flashes white on capture.
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestPermission();

    // Start the gentle pulse loop on mount.
    // Animated.loop() repeats forever until .stop() is called.
    // Animated.sequence() runs animations one after another.
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1000,
          useNativeDriver: true, // runs on GPU, doesn't block JS
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // ── Capture photo
  async function takePicture() {
    if (!cameraRef.current) return;

    // Flash the screen white briefly — visual feedback that the shutter fired.
    // This is purely cosmetic. flashAnim controls the opacity of a white overlay.
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 60,  useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    try {
      const data = await cameraRef.current.takePictureAsync({
        quality: 0.85, // 0–1. 0.85 gives good quality at a reasonable file size.
      });
      setPhoto(data.uri);
    } catch (error) {
      console.error('[CameraView] Capture error:', error);
    }
  }

  // ── Confirm: pass the photo URI back to ScanHome
  function confirmPhoto() {
    if (!photo) return;
    // navigate() to ScanHome (which is behind CameraView in the stack)
    // passes capturedPhoto as a param. Scan.js picks it up via the
    // 'focus' event listener and updates its image state.
    navigation.navigate('ScanHome', { capturedPhoto: photo });
  }

  function retakePhoto() {
    setPhoto(null); // go back to live viewfinder
  }

  function handleBack() {
    navigation.goBack();
  }

  // ─── PERMISSION LOADING ───────────────────────────────────────────────────
  // While the permission request is in flight, show a blank dark screen.
  if (!permission) {
    return <View style={s.blank} />;
  }

  // ─── PERMISSION DENIED ────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <SafeAreaView style={s.permissionScreen}>
        <View style={s.permissionIcon}>
          <MaterialIcons name="no-photography" size={44} color="#9CA3AF" />
        </View>
        <Text style={s.permissionTitle}>Camera Access Required</Text>
        <Text style={s.permissionSub}>
          AidePoint needs camera access to capture blood sample images.{'\n'}
          Please enable it in your device settings.
        </Text>
        <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
          <Text style={s.permissionBtnText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBack} style={{ marginTop: 12 }}>
          <Text style={s.permissionBack}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── PHOTO PREVIEW ────────────────────────────────────────────────────────
  // Shown after the shutter is pressed. User can confirm or retake.
  if (photo) {
    return (
      <SafeAreaView style={s.container}>
        {/* Full-screen preview image */}
        <Image
          source={{ uri: photo }}
          style={s.previewFull}
          resizeMode="cover"
        />

        {/* Semi-transparent overlay with instructions + buttons */}
        <View style={s.previewOverlay}>

          {/* Top: title + guidance */}
          <View style={s.previewHeader}>
            <Text style={s.previewTitle}>Review Image</Text>
            <Text style={s.previewSubtitle}>
              Make sure the blood cells are visible and in sharp focus.
              Poor image quality reduces AI accuracy.
            </Text>
          </View>

          {/* Quality checklist — helps the technician self-assess */}
          <View style={s.qualityChecklist}>
            {[
              'Cells are visible',
              'No motion blur',
              'Adequate lighting',
            ].map((item) => (
              <View key={item} style={s.checkItem}>
                <MaterialIcons name="check-circle-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={s.checkText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Bottom: Retake + Use Photo buttons */}
          <View style={s.previewActions}>
            <TouchableOpacity
              style={s.retakeButton}
              onPress={retakePhoto}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={s.retakeText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.confirmButton}
              onPress={confirmPhoto}
              activeOpacity={0.85}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={s.confirmText}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── LIVE CAMERA VIEW ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={[]}>
      {/* ExpoCameraView fills the screen. ref= lets us call takePictureAsync(). */}
      <ExpoCameraView
        ref={cameraRef}
        style={s.camera}
        facing="back"
        // enableTorch controls the flashlight (torch mode = continuous on,
        // not flash burst). Useful for microscope environments with poor lighting.
        enableTorch={torchOn}
      >

        {/* ── Top bar: Back + Torch */}
        <View style={s.topBar}>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={handleBack}
            activeOpacity={0.75}
          >
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={s.topBarTitle}>Blood Smear Capture</Text>

          {/* Torch toggle — on/off */}
          <TouchableOpacity
            style={[s.iconBtn, torchOn && s.iconBtnActive]}
            onPress={() => setTorchOn(!torchOn)}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name={torchOn ? 'flashlight-on' : 'flashlight-off'}
              size={22}
              color={torchOn ? '#FCD34D' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* ── Instruction banner */}
        <View style={s.instructionBanner}>
          <MaterialCommunityIcons name="microscope" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={s.instructionText}>
            Align the slide within the frame
          </Text>
        </View>

        {/* ── Viewfinder: dimmed area + bright frame + corner brackets */}
        <View style={s.viewfinderContainer}>
          {/* Dark overlay on all sides EXCEPT the frame area.
              We achieve this with a semi-transparent full-screen overlay
              and then a transparent cut-out in the center. */}
          <View style={s.dimOverlay} />

          {/* The bright frame + animated corner brackets */}
          <Animated.View
            style={[
              s.frame,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <CornerBrackets />

            {/* Center dot — helps align the microscope eyepiece */}
            <View style={s.centerDot} />
          </Animated.View>

          {/* Zoom level indicator (visual only for now) */}
          <View style={s.zoomBadge}>
            <Text style={s.zoomText}>40×</Text>
          </View>
        </View>

        {/* ── Status indicators */}
        <View style={s.statusRow}>
          <Animated.View
            style={[s.statusBadge, { transform: [{ scale: pulseAnim }] }]}
          >
            <View style={[s.statusDot, { backgroundColor: '#22C55E' }]} />
            <Text style={s.statusText}>Light OK</Text>
          </Animated.View>

          <Animated.View
            style={[s.statusBadge, { transform: [{ scale: pulseAnim }] }]}
          >
            <View style={[s.statusDot, { backgroundColor: '#22C55E' }]} />
            <Text style={s.statusText}>Focus OK</Text>
          </Animated.View>

          {torchOn && (
            <View style={[s.statusBadge, { backgroundColor: 'rgba(252,211,77,0.25)' }]}>
              <MaterialIcons name="flashlight-on" size={12} color="#FCD34D" />
              <Text style={[s.statusText, { color: '#FCD34D' }]}>Torch On</Text>
            </View>
          )}
        </View>

        {/* ── Shutter button */}
        <View style={s.shutterBar}>
          <TouchableOpacity
            onPress={takePicture}
            style={s.shutterRing}
            activeOpacity={0.85}
          >
            {/* The outer ring is the white border.
                The inner disc is the actual "button" you see. */}
            <View style={s.shutterDisc} />
          </TouchableOpacity>
        </View>

        {/* ── Screen-flash overlay (on capture) */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#FFFFFF',
              opacity: flashAnim,
            },
          ]}
        />

      </ExpoCameraView>
    </SafeAreaView>
  );
}

// ─── CAMERA VIEW STYLES ───────────────────────────────────────────────────────
const s = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  blank: {
    flex: 1,
    backgroundColor: '#000',
  },

  camera: {
    flex: 1,
  },

  // ── Top bar
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },

  topBarTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Slightly brighter when the torch is on
  iconBtnActive: {
    backgroundColor: 'rgba(252,211,77,0.2)',
  },

  // ── Instruction banner
  instructionBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 72,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },

  instructionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // ── Viewfinder
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Dark overlay. The actual cut-out effect is visual illusion —
  // the camera feed shows through, and we just overlay darkness on the sides.
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // The bright square frame — drawn OVER the dim overlay
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    // This cuts a "hole" in the overlay visually
    backgroundColor: 'transparent',
  },

  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  zoomBadge: {
    position: 'absolute',
    bottom: -(FRAME_SIZE / 2) + 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },

  zoomText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Status indicators
  statusRow: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Shutter
  shutterBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  shutterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  shutterDisc: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },

  // ── Permission denied
  permissionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 32,
  },

  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },

  permissionSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },

  permissionBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#1A2F6E',
    borderRadius: 12,
  },

  permissionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  permissionBack: {
    color: '#64748B',
    fontSize: 14,
  },

  // ── Photo preview
  previewFull: {
    ...StyleSheet.absoluteFillObject,
  },

  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  previewHeader: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },

  previewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },

  previewSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 21,
  },

  qualityChecklist: {
    paddingHorizontal: 24,
    gap: 8,
  },

  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  checkText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },

  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },

  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  retakeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#1A2F6E',
  },

  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
