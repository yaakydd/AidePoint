import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
} from "react-native";
import { Camera } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraStyles as styles } from "../styles/CameraStyles";

const { width, height } = Dimensions.get("window");

const CameraView = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [photo, setPhoto] = useState(null);

  // AI Feedback States
  const [lightOk, setLightOk] = useState(true);
  const [focusOk, setFocusOk] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();

    // Subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const takePicture = async () => {
    if (cameraRef) {
      const data = await cameraRef.takePictureAsync({ quality: 0.7 });
      setPhoto(data.uri);
    }
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <Camera style={styles.camera} ref={(ref) => setCameraRef(ref)}>

        {/* Circular Alignment Guide */}
        <View style={styles.viewfinder}>
          <View style={styles.outerCircle}>
            <View style={styles.innerCircle} />
          </View>
        </View>

        {/* AI Feedback Overlay */}
        <View style={styles.feedbackContainer}>
          <Animated.View style={[styles.feedbackBadge, { transform: [{ scale: pulseAnim }] }]}>
            <MaterialIcons name="lightbulb" size={12} color={lightOk ? "#22c55e" : "#f87171"} />
            <Text style={styles.feedbackText}>Light</Text>
          </Animated.View>
          <Animated.View style={[styles.feedbackBadge, { transform: [{ scale: pulseAnim }] }]}>
            <MaterialIcons name="center-focus-strong" size={12} color={focusOk ? "#22c55e" : "#f87171"} />
            <Text style={styles.feedbackText}>Focus</Text>
          </Animated.View>
        </View>

        {/* Capture Button */}
        <View style={styles.bottomControls}>
          <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
            <View style={styles.innerCaptureButton} />
          </TouchableOpacity>

          {/* Last photo thumbnail */}
          {photo && (
            <View style={styles.thumbnail}>
              <Image source={{ uri: photo }} style={styles.thumbImage} />
            </View>
          )}
        </View>
      </Camera>
    </SafeAreaView>
  );
};

export default CameraView;