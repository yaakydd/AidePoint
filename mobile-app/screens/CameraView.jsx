// screens/CameraView.js
//
// Full-screen blood smear camera screen for AidePoint.
//
// Flow:
// 1. Request camera permission
// 2. Show live camera preview
// 3. Overlay microscope alignment UI
// 4. Capture image
// 5. Review image
// 6. Retake OR confirm image

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';

import {
  CameraView as ExpoCameraView,
  useCameraPermissions,
} from 'expo-camera';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import { CameraStyles as s, FRAME_SIZE } from '../styles/CameraStyles';

export default function CameraView({ navigation }) {

  // Camera permission hook
  const [permission, requestPermission] = useCameraPermissions();

  // Captured image URI
  const [photo, setPhoto] = useState(null);

  // Torch state
  const [torchOn, setTorchOn] = useState(false);

  // Camera ref
  const cameraRef = useRef(null);

  // Capture flash animation
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Request permissions + start animations
  useEffect(() => {
    requestPermission();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
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

      // Camera flash effect
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 70,
          useNativeDriver: true,
        }),

        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Capture image
      const data = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      setPhoto(data.uri);

    } catch (err) {
      console.log('Capture Error:', err);
    }
  }

  // Confirm image
  function confirmPhoto() {

    if (!photo) return;

    navigation.navigate('ScanHome', {
      capturedPhoto: photo,
    });
  }

  // Retake image
  function retakePhoto() {
    setPhoto(null);
  }

  // Go back
  function handleBack() {
    navigation.goBack();
  }

  // Permission loading
  if (!permission) {
    return <View style={s.blank} />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={s.permissionScreen}>

        <View style={s.permissionIcon}>
          <MaterialIcons
            name="no-photography"
            size={44}
            color="#94A3B8"
          />
        </View>

        <Text style={s.permissionTitle}>
          Camera Access Required
        </Text>

        <Text style={s.permissionSub}>
          AidePoint requires camera permission
          to capture blood smear samples.
        </Text>

        <TouchableOpacity
          style={s.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={s.permissionBtnText}>
            Grant Access
          </Text>
        </TouchableOpacity>

      </SafeAreaView>
    );
  }

  // Review captured image
  if (photo) {

    return (
      <SafeAreaView style={s.container}>

        <Image
          source={{ uri: photo }}
          style={s.previewImage}
          resizeMode="cover"
        />

        <View style={s.previewOverlay}>

          <View style={s.previewHeader}>

            <Text style={s.previewTitle}>
              Review Capture
            </Text>

            <Text style={s.previewSubtitle}>
              Ensure the blood cells are sharp,
              centered, and properly illuminated.
            </Text>

          </View>

          <View style={s.previewBottom}>

            <TouchableOpacity
              style={s.retakeButton}
              onPress={retakePhoto}
            >
              <MaterialIcons
                name="refresh"
                size={20}
                color="#fff"
              />

              <Text style={s.actionText}>
                Retake
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.confirmButton}
              onPress={confirmPhoto}
            >
              <MaterialIcons
                name="check"
                size={20}
                color="#fff"
              />

              <Text style={s.actionText}>
                Use Photo
              </Text>
            </TouchableOpacity>

          </View>

        </View>

      </SafeAreaView>
    );
  }

  // Live Camera Screen
  return (

    <SafeAreaView style={s.container} edges={[]}>

      {/* CAMERA */}
      <ExpoCameraView
        ref={cameraRef}
        style={s.camera}
        facing="back"
        enableTorch={torchOn}
      />

      {/* OVERLAYS */}
      <View style={s.overlay} pointerEvents="box-none">

        {/* Top bar */}
        <View style={s.topBar}>

          <TouchableOpacity
            style={s.iconBtn}
            onPress={handleBack}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color="#fff"
            />
          </TouchableOpacity>

          <Text style={s.topBarTitle}>
            Blood Smear Capture
          </Text>

          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => setTorchOn(!torchOn)}
          >
            <MaterialIcons
              name={
                torchOn
                  ? 'flashlight-on'
                  : 'flashlight-off'
              }
              size={22}
              color="#fff"
            />
          </TouchableOpacity>

        </View>

        {/* Instruction */}
        <View style={s.instructionBanner}>

          <MaterialCommunityIcons
            name="microscope"
            size={15}
            color="#fff"
          />

          <Text style={s.instructionText}>
            Align blood smear within guide
          </Text>

        </View>

        {/* Viewfinder */}
        <View style={s.viewfinderContainer}>

          <Animated.View
            style={[
              s.frame,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={s.centerDot} />
          </Animated.View>

          <View style={s.zoomBadge}>
            <Text style={s.zoomText}>40×</Text>
          </View>

        </View>

        {/* AI Status */}
        <View style={s.statusRow}>

          <View style={s.statusBadge}>
            <View style={s.greenDot} />

            <Text style={s.statusText}>
              Focus Stable
            </Text>
          </View>

          <View style={s.statusBadge}>
            <View style={s.greenDot} />

            <Text style={s.statusText}>
              Lighting Good
            </Text>
          </View>

        </View>

        {/* Shutter */}
        <View style={s.shutterBar}>

          <TouchableOpacity
            style={s.shutterRing}
            onPress={takePicture}
          >
            <View style={s.shutterDisc} />
          </TouchableOpacity>

        </View>

      </View>

      {/* Capture flash */}
      <Animated.View
        pointerEvents="none"
        style={[
          s.flashOverlay,
          { opacity: flashAnim },
        ]}
      />

    </SafeAreaView>
  );
}