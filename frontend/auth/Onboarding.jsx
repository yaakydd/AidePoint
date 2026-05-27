import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StyleSheet,
  StatusBar,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  layout,
  scale,
  mScale,
} from "../assets/theme";

const { width } = Dimensions.get("window");

const ONBOARDING_KEY = "aidepoint_has_launched";

const SLIDES = [
  {
    id: "1",
    icon: "microscope",
    color: "#0EA5E9",
    bg: "#E0F2FE",
    step: "01",
    title: "Welcome to AidePoint",
    description:
      "AidePoint uses AI to analyse blood smear images and detect conditions.",
    tip: null,
  },
  {
    id: "2",
    icon: "clipboard-text-outline",
    color: "#6366F1",
    bg: "#EEF2FF",
    step: "02",
    title: "Enter patient details first",
    description: "Fill patient details before scanning.",
    tip: "Tip: improves accuracy",
  },
  {
    id: "3",
    icon: "camera-outline",
    color: "#F59E0B",
    bg: "#FFFBEB",
    step: "03",
    title: "Capture image",
    description: "Take a clear microscope image.",
    tip: null,
  },
  {
    id: "4",
    icon: "file-chart-outline",
    color: "#10B981",
    bg: "#ECFDF5",
    step: "04",
    title: "Read reports",
    description: "Get instant AI reports.",
    tip: null,
  },
  {
    id: "5",
    icon: "robot-outline",
    color: "#EC4899",
    bg: "#FDF2F8",
    step: "05",
    title: "Ask AI",
    description: "Chat with AI anytime.",
    tip: null,
  },
];

const Onboarding = () => {
  const navigation = useNavigation();
  const flatListRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / width
    );
    setCurrentIndex(index);
  };

  // ✅ FIXED: THIS NOW ACTUALLY WORKS
  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");

    // IMPORTANT: reset stack properly
    navigation.reset({
      index: 0,
      routes: [{ name: "SignUp" }],
    });
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      return;
    }

    await finishOnboarding();
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const currentSlide = SLIDES[currentIndex];
  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* HEADER */}
      <View style={styles.topRow}>
        <View style={styles.logoRow}>
          <MaterialCommunityIcons
            name="dna"
            size={scale(22)}
            color={COLORS.primary}
          />
          <Text style={styles.logoText}>AidePoint</Text>
        </View>

        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SLIDES */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={[styles.stepCounter, { color: item.color }]}>
              {item.step} / 0{SLIDES.length}
            </Text>

            <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={scale(80)}
                color={item.color}
              />
            </View>

            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideDescription}>{item.description}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* DOTS (FIXED — YOU LOST THIS BEFORE) */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index === currentIndex
                    ? currentSlide.color
                    : COLORS.border,
                width: index === currentIndex ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* BUTTON */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: currentSlide.color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {isLastSlide ? "Get Started" : "Next"}
          </Text>

          <Feather name="arrow-right" size={scale(20)} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING["2xl"],
    paddingTop: layout.statusBarHeight + SPACING.sm,
    paddingBottom: SPACING.sm,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },

  logoText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  skipText: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },

  slide: {
    paddingHorizontal: scale(28),
    justifyContent: "center",
    alignItems: "center",
  },

  stepCounter: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    marginBottom: scale(28),
    alignSelf: "flex-start",
  },

  iconCircle: {
    width: scale(160),
    height: scale(160),
    borderRadius: RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale(36),
  },

  slideTitle: {
    fontSize: FONTS["2xl"],
    fontWeight: FONTS.bold,
    textAlign: "center",
    marginBottom: SPACING.md,
    color: COLORS.textPrimary,
  },

  slideDescription: {
    fontSize: FONTS.md,
    textAlign: "center",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },

  tipBox: {
    borderLeftWidth: 3,
    padding: SPACING.sm,
    alignSelf: "stretch",
  },

  tipText: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },

  dot: {
    height: 8,
    borderRadius: RADIUS.full,
    marginHorizontal: 4,
  },

  bottomSection: {
    paddingHorizontal: SPACING["2xl"],
    paddingBottom: layout.bottomInset + SPACING.lg,
  },

  nextBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },

  nextBtnText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: FONTS.semibold,
  },
});

export default Onboarding;