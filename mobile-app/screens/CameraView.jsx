// CameraView.js
// Full-screen camera used by the Scan screen to capture blood sample images.
// After confirmation, the image URI is passed back to ScanHome.

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

import {
  CameraView as ExpoCameraView,
  useCameraPermissions,
} from 'expo-camera';

import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function CameraView({ navigation }) {

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // Captured image
  const [photo, setPhoto] = useState(null);

  // Mock AI indicators
  const [lightOk] = useState(true);
  const [focusOk] = useState(true);

  // Camera reference
  const cameraRef = useRef(null);

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Request permissions + start animation
  useEffect(() => {

    requestPermission();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),

        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

  }, []);

  // Capture image
  async function takePicture() {

    if (!cameraRef.current) return;

    try {

      const data = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      setPhoto(data.uri);

    } catch (error) {
      console.error('Capture Error:', error);
    }
  }

  // Confirm image
  function confirmPhoto() {

    if (!photo) return;

    navigation.navigate('ScanHome', {
      capturedPhoto: photo,
    });
  }

  // Retake
  function retakePhoto() {
    setPhoto(null);
  }

  // Back
  function handleBack() {
    navigation.goBack();
  }

  // Waiting for permission state
  if (!permission) {
    return <View style={localStyles.blank} />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={localStyles.noPermissionScreen}>

        <MaterialIcons
          name="no-photography"
          size={48}
          color="#9CA3AF"
        />

        <Text style={localStyles.noPermissionTitle}>
          Camera Access Required
        </Text>

        <Text style={localStyles.noPermissionSub}>
          Please enable camera access in your device settings.
        </Text>

        <TouchableOpacity
          style={localStyles.backBtn}
          onPress={handleBack}
        >
          <Text style={localStyles.backBtnText}>
            Go Back
          </Text>
        </TouchableOpacity>

      </SafeAreaView>
    );
  }

  // Preview mode
  if (photo) {

    return (
      <SafeAreaView style={localStyles.container}>

        <Image
          source={{ uri: photo }}
          style={localStyles.previewFull}
          resizeMode="cover"
        />

        <View style={localStyles.previewOverlay}>

          <View style={localStyles.previewHeader}>

            <Text style={localStyles.previewTitle}>
              Review Image
            </Text>

            <Text style={localStyles.previewSubtitle}>
              Make sure the blood sample is clear and in focus.
            </Text>

          </View>

          <View style={localStyles.previewActions}>

            <TouchableOpacity
              style={localStyles.retakeButton}
              onPress={retakePhoto}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="refresh"
                size={22}
                color="#fff"
              />

              <Text style={localStyles.retakeText}>
                Retake
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={localStyles.confirmButton}
              onPress={confirmPhoto}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name="check"
                size={22}
                color="#fff"
              />

              <Text style={localStyles.confirmText}>
                Use Photo
              </Text>
            </TouchableOpacity>

          </View>

        </View>

      </SafeAreaView>
    );
  }

  // Live camera
  return (

    <SafeAreaView style={localStyles.container}>

      <ExpoCameraView
        ref={cameraRef}
        style={localStyles.camera}
        facing="back"
      >

        {/* Back button */}
        <TouchableOpacity
          style={localStyles.backIconBtn}
          onPress={handleBack}
          activeOpacity={0.75}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Instructions */}
        <View style={localStyles.instructionBanner}>

          <Text style={localStyles.instructionText}>
            Position the blood sample slide in the circle
          </Text>

        </View>

        {/* Viewfinder */}
        <View style={localStyles.viewfinder}>

          <Animated.View
            style={[
              localStyles.outerCircle,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={localStyles.innerCircle} />
          </Animated.View>

        </View>

        {/* AI indicators */}
        <View style={localStyles.feedbackRow}>

          <Animated.View
            style={[
              localStyles.badge,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <MaterialIcons
              name="lightbulb"
              size={13}
              color={lightOk ? '#22c55e' : '#f87171'}
            />

            <Text style={localStyles.badgeText}>
              Light
            </Text>

          </Animated.View>

          <Animated.View
            style={[
              localStyles.badge,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <MaterialIcons
              name="center-focus-strong"
              size={13}
              color={focusOk ? '#22c55e' : '#f87171'}
            />

            <Text style={localStyles.badgeText}>
              Focus
            </Text>

          </Animated.View>

        </View>

        {/* Capture button */}
        <View style={localStyles.bottomBar}>

          <TouchableOpacity
            onPress={takePicture}
            style={localStyles.captureRing}
            activeOpacity={0.85}
          >
            <View style={localStyles.captureInner} />
          </TouchableOpacity>

        </View>

      </ExpoCameraView>

    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({

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

  backIconBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  instructionBanner: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  instructionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },

  viewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  outerCircle: {
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: width * 0.36,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  innerCircle: {
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: width * 0.04,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  feedbackRow: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  captureRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },

  noPermissionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    padding: 32,
  },

  noPermissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1B2E',
    marginTop: 16,
    marginBottom: 8,
  },

  noPermissionSub: {
    fontSize: 14,
    color: '#9799A8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },

  backBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    backgroundColor: '#1A2F6E',
    borderRadius: 12,
  },

  backBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  previewFull: {
    ...StyleSheet.absoluteFillObject,
  },

  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  previewHeader: {
    padding: 24,
    paddingTop: 40,
  },

  previewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },

  previewSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },

  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingBottom: 40,
  },

  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
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