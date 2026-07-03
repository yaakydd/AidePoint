// auth/Onboarding.js
//
// Redesigned to feel like a real clinical-tool onboarding rather than a
// generic template: a thin progress bar (not a page counter), a slide
// order that follows the actual scan workflow, and a dedicated slide for
// offline support since that's a genuine differentiator for lab techs in
// low-connectivity areas — not just filler copy.

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
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
    icon: "microscope",
    color: "#0EA5E9",
    bg: "#E0F2FE",
    title: "Welcome to AidePoint",
    description:
      "AI-assisted anemia screening built for the lab bench — photograph a blood smear and get results in seconds, online or off.",
  },
  {
    id: "2",
    icon: "clipboard-text-outline",
    color: "#6366F1",
    bg: "#EEF2FF",
    title: "Start with patient details",
    description:
      "Enter the patient's basic information first. It's attached to every scan and improves the accuracy of the analysis.",
  },
  {
    id: "3",
    icon: "camera-outline",
    color: "#F59E0B",
    bg: "#FFFBEB",
    title: "Capture the smear",
    description:
      "Line the slide up inside the guide frame and hold steady. Good lighting and a clean focus make the biggest difference.",
  },
  {
    id: "4",
    icon: "chart-donut",
    color: "#10B981",
    bg: "#ECFDF5",
    title: "Get a full CBC read",
    description:
      "Every scan returns an anemia probability, estimated blood counts, and morphology flags — saved straight to the patient's report.",
  },
  {
    id: "5",
    icon: "cloud-off-outline",
    color: "#0D9488",
    bg: "#F0FDFA",
    title: "Works without a connection",
    description:
      "No signal at the clinic? Scans queue on the device automatically and sync the moment you're back online.",
  },
  {
    id: "6",
    icon: "robot-outline",
    color: "#EC4899",
    bg: "#FDF2F8",
    title: "Ask AideBot anytime",
    description:
      "Unsure about a result? AideBot is built in to help you interpret findings and answer clinical questions on the spot.",
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
  const activeColor = SLIDES[currentIndex].color;

  // Progress bar width interpolated from scroll position
  const progressWidth = scrollX.interpolate({
    inputRange: [0, width * (SLIDES.length - 1)],
    outputRange: [
      `${(1 / SLIDES.length) * 100}%`,
      "100%",
    ],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── Top bar: brand mark, skip ── */}
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

      {/* ── Progress bar ── */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { width: progressWidth, backgroundColor: activeColor }]}
        />
      </View>

      {/* ── Slides ── */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconRing, { borderColor: `${item.color}33` }]}>
              <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
                <MaterialCommunityIcons name={item.icon} size={scale(46)} color={item.color} />
              </View>
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

      {/* ── Dots ── */}
      <View style={styles.dotsRow}>
        {SLIDES.map((slide, index) => (
          <View
            key={slide.id}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentIndex ? activeColor : COLORS.border,
                width: index === currentIndex ? 20 : 7,
              },
            ]}
          />
        ))}
      </View>

      {/* ── CTA ── */}
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
