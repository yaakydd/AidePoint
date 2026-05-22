import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

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

const SLIDES = [
  {
    id: "1",
    icon: "microscope",
    color: "#0EA5E9",
    bg: "#E0F2FE",
    step: "01",
    title: "Welcome to AidePoint",
    description:
      "AidePoint uses AI to analyse blood smear images from your microscope and detect 8 critical blood conditions — in seconds.",
    tip: null,
  },
  {
    id: "2",
    icon: "clipboard-text-outline",
    color: "#6366F1",
    bg: "#EEF2FF",
    step: "02",
    title: "Enter patient details first",
    description:
      "Before every scan, go to the Scan tab and fill in the patient's name, age, blood pressure, and temperature. This data becomes part of the final report.",
    tip: "Tip: Patient vitals affect the AI's confidence score.",
  },
  {
    id: "3",
    icon: "camera-outline",
    color: "#F59E0B",
    bg: "#FFFBEB",
    step: "03",
    title: "Capture the smear image",
    description:
      "Tap 'Take Photo' to open the camera. Hold your phone steady over the microscope eyepiece and tap the shutter. The clearer the image, the more accurate the result.",
    tip: "Tip: Use 40× or 100× objective lens for best results.",
  },
  {
    id: "4",
    icon: "file-chart-outline",
    color: "#10B981",
    bg: "#ECFDF5",
    step: "04",
    title: "Read and share the report",
    description:
      "After analysis, a full clinical report is generated automatically. You can download it as a PDF, share it with a doctor, or sign it to verify the findings.",
    tip: "Tip: Doctors on the hospital portal receive reports instantly.",
  },
  {
    id: "5",
    icon: "robot-outline",
    color: "#EC4899",
    bg: "#FDF2F8",
    step: "05",
    title: "Ask AidePoint AI anything",
    description:
      "The chatbot tab is always available. Ask it to explain a blood condition, walk you through the app, or help you understand a report result.",
    tip: "Tip: AidePoint AI knows all 8 detectable conditions in detail.",
  },
];

const Onboarding = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef(null);

  const navigation = useNavigation();

  const handleScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      navigation.navigate("UserType");
    }
  };

  const handleSkip = () => {
    navigation.navigate("UserType");
  };

  const renderSlide = ({ item }) => (
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

      <Text style={styles.slideDescription}>
        {item.description}
      </Text>

      {item.tip ? (
        <View style={[styles.tipBox, { borderLeftColor: item.color }]}>
          <Text style={[styles.tipText, { color: item.color }]}>
            {item.tip}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsRow}>
      {SLIDES.map((slide, index) => (
        <View
          key={slide.id}
          style={[
            styles.dot,
            {
              backgroundColor:
                index === currentIndex
                  ? SLIDES[currentIndex].color
                  : COLORS.border,
              width: index === currentIndex ? scale(28) : scale(8),
            },
          ]}
        />
      ))}
    </View>
  );

  const current = SLIDES[currentIndex];
  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.white}
      />

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
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{
              top: 10,
              bottom: 10,
              left: 10,
              right: 10,
            }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        style={styles.flatList}
      />

      <View style={styles.bottomSection}>
        {renderDots()}

        <TouchableOpacity
          style={[
            styles.nextBtn,
            { backgroundColor: current.color },
          ]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {isLastSlide ? "Get Started" : "Next"}
          </Text>

          <Feather
            name="arrow-right"
            size={scale(20)}
            color={COLORS.white}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("SignIn")}
          style={styles.signInLink}
        >
          <Text style={styles.signInText}>
            Already have an account?{" "}
            <Text
              style={[
                styles.signInHighlight,
                { color: current.color },
              ]}
            >
              Sign In
            </Text>
          </Text>
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

  flatList: {
    flex: 1,
  },

  slide: {
    paddingHorizontal: scale(28),
    paddingTop: SPACING.xl,
    justifyContent: "center",
    alignItems: "center",
  },

  stepCounter: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    letterSpacing: 1.5,
    marginBottom: scale(28),
    alignSelf: "flex-start",
  },

  iconCircle: {
    width: scale(160),
    height: scale(160),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(36),
  },

  slideTitle: {
    fontSize: FONTS["2xl"],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.md,
    lineHeight: mScale(32),
  },

  slideDescription: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: mScale(24),
    marginBottom: SPACING.xl,
  },

  tipBox: {
    borderLeftWidth: scale(3),
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignSelf: "stretch",
    marginTop: SPACING.xs,
  },

  tipText: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    lineHeight: mScale(18),
  },

  bottomSection: {
    paddingHorizontal: SPACING["2xl"],
    paddingBottom:
      layout.bottomInset + SPACING.lg,
    paddingTop: SPACING.lg,
    alignItems: "center",
    gap: SPACING.lg,
  },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },

  dot: {
    height: scale(8),
    borderRadius: RADIUS.full,
  },

  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
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

  signInLink: {
    paddingVertical: SPACING.xs,
  },

  signInText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },

  signInHighlight: {
    fontWeight: FONTS.semibold,
  },
}); 

export default Onboarding;