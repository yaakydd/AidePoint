import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
  // Image, // unused until real photos are added back
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { COLORS, scale } from "../assets/theme";
import { styles } from "../styles/OnboardingStyles";

const { width } = Dimensions.get("window");
const ONBOARDING_KEY = "aidepoint_has_launched";

const SLIDES = [
  {
    id: "1",
    // image: require("../assets/onboarding/microscope-capture.jpg"),
    accent: "#0EA5E9",
    title: "Scan the smear",
    description: "Photograph a blood smear on the microscope. That's it.",
  },
  {
    id: "2",
    // image: require("../assets/onboarding/microscope-results.jpg"),
    accent: "#10B981",
    title: "Get results instantly",
    description: "Anemia risk and a full CBC read, in seconds.",
  },
  {
    id: "3",
    // image: require("../assets/onboarding/patient-reports.jpg"),
    accent: "#6366F1",
    title: "Every report saved",
    description: "Every scan is saved and searchable by patient.",
  },
];

export default function Onboarding() {
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [currentIndex, setCurrentIndex] = useState(0);

  function handleScroll(event) {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    if (index !== currentIndex) setCurrentIndex(index);
  }

  async function finishOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    navigation.reset({ index: 0, routes: [{ name: "SignUp" }] });
  }

  async function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      return;
    }
    await finishOnboarding();
  }

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const activeColor = SLIDES[currentIndex].accent;

  const progressWidth = scrollX.interpolate({
    inputRange: [0, width * (SLIDES.length - 1)],
    outputRange: [`${(1 / SLIDES.length) * 100}%`, "100%"],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.topRow}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="dna" size={scale(16)} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>AidePoint</Text>
        </View>

        {!isLastSlide && (
          <TouchableOpacity onPress={finishOnboarding} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { width: progressWidth, backgroundColor: activeColor }]}
        />
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.photoFrame}>
              {/* Placeholder tinted block instead of <Image /> */}
              <View style={[styles.photo, { backgroundColor: `${item.accent}22` }]} />
              <View style={[styles.photoAccentBar, { backgroundColor: item.accent }]} />
            </View>

            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideDescription}>{item.description}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false, listener: handleScroll }
        )}
        scrollEventThrottle={16}
      />

      <View style={styles.navigatorRow}>
        {SLIDES.map((slide, index) => (
          <TouchableOpacity
            key={slide.id}
            onPress={() => flatListRef.current?.scrollToIndex({ index, animated: true })}
            hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
          >
            <View
              style={[
                styles.navigatorPill,
                {
                  backgroundColor: index === currentIndex ? activeColor : COLORS.border,
                  width: index === currentIndex ? scale(36) : scale(12),
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: activeColor }]}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <Text style={styles.nextBtnText}>
            {isLastSlide ? "Get Started" : "Continue"}
          </Text>
          <Feather name="arrow-right" size={scale(19)} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}