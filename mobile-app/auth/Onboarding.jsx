// screens/auth/OnboardingScreen.js
//
// 5 slides that teach the user how AidePoint works:
//   1. Welcome — what the app is
//   2. Patient details — how to fill the form before a scan
//   3. Capture — how to take the microscope photo
//   4. Reports — what happens after analysis
//   5. AidePoint AI — the chatbot for help and guidance

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
  Platform,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

// ─── SLIDE CONTENT ─────────────────────────────────────────────────────────
// Each object defines one slide. We keep content in data (not JSX)
// so adding a 6th slide is just adding one object here — no layout changes.
const SLIDES = [
  {
    id: "1",
    icon: "microscope",
    color: "#0EA5E9",       // sky blue
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
    color: "#6366F1",       // indigo
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
    color: "#F59E0B",       // amber
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
    color: "#10B981",       // emerald
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
    color: "#EC4899",       // pink
    bg: "#FDF2F8",
    step: "05",
    title: "Ask AidePoint AI anything",
    description:
      "The chatbot tab is always available. Ask it to explain a blood condition, walk you through the app, or help you understand a report result.",
    tip: "Tip: AidePoint AI knows all 8 detectable conditions in detail.",
  },
];

const OnboardingScreen = () => {
  // currentIndex tracks which slide the user is on (0 to 4).
  const [currentIndex, setCurrentIndex] = useState(0);

  // flatListRef lets us call scrollToIndex() programmatically
  // when the user taps "Next" instead of swiping.
  const flatListRef = useRef(null);

  const navigation = useNavigation();

  // ─── SCROLL HANDLER ──────────────────────────────────────────────────────
  // FlatList calls this on every scroll event.
  // contentOffset.x = how many pixels we've scrolled from the left.
  // Dividing by screen width tells us which slide we're on.
  // Math.round() handles partial scrolls gracefully.
  const handleScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  // ─── NEXT BUTTON ─────────────────────────────────────────────────────────
  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      // Scroll the FlatList to the next slide programmatically.
      // animated: true = smooth sliding motion.
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // We're on the last slide. Take the user to pick their account type.
      navigation.navigate("UserType");
    }
  };

  // ─── SKIP BUTTON ─────────────────────────────────────────────────────────
  const handleSkip = () => {
    // Jump straight to UserType without finishing onboarding.
    // The 'isFirstLaunch' flag will be written to AsyncStorage
    // in AuthContext.login() after they complete signup/login,
    // so onboarding won't show again next time.
    navigation.navigate("UserType");
  };

  // ─── SLIDE RENDERER ──────────────────────────────────────────────────────
  // FlatList calls this function once per item in SLIDES[].
  // 'item' is one slide object. { width } makes each slide
  // exactly as wide as the screen so pagingEnabled works correctly.
  const renderSlide = ({ item, index }) => (
    <View style={[styles.slide, { width }]}>

      {/* Step counter: "01 / 05" */}
      <Text style={[styles.stepCounter, { color: item.color }]}>
        {item.step} / 0{SLIDES.length}
      </Text>

      {/* Large icon in a tinted circle */}
      <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
        <MaterialCommunityIcons name={item.icon} size={80} color={item.color} />
      </View>

      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>

      {/* Optional tip — only shown if the slide has one */}
      {item.tip ? (
        <View style={[styles.tipBox, { borderLeftColor: item.color }]}>
          <Text style={[styles.tipText, { color: item.color }]}>{item.tip}</Text>
        </View>
      ) : null}
    </View>
  );

  // ─── DOT INDICATORS ──────────────────────────────────────────────────────
  // Shows 5 dots at the bottom. The active dot is wider and coloured.
  // This gives the user a sense of progress through the slides.
  const renderDots = () => (
    <View style={styles.dotsRow}>
      {SLIDES.map((slide, index) => (
        <View
          key={slide.id}
          style={[
            styles.dot,
            {
              // Active dot = slide's accent colour, wider pill shape
              // Inactive dot = grey, small square
              backgroundColor: index === currentIndex ? SLIDES[currentIndex].color : "#CBD5E1",
              width: index === currentIndex ? 28 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  // Current slide data — used to colour the Next button dynamically
  const current = SLIDES[currentIndex];
  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP ROW: logo + skip button */}
      <View style={styles.topRow}>
        <View style={styles.logoRow}>
          <MaterialCommunityIcons name="dna" size={22} color="#0EA5E9" />
          <Text style={styles.logoText}>AidePoint</Text>
        </View>

        {/* Hide Skip on the last slide — "Get Started" replaces it */}
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/*
        THE SLIDESHOW
        horizontal       = scrolls left/right
        pagingEnabled    = snaps to complete slides, never halfway
        showsHorizontalScrollIndicator={false} = no scrollbar
        scrollEventThrottle={16} = fires onScroll ~60 times/sec
                                   keeping the dot indicator smooth
        getItemLayout    = a performance hint that tells FlatList
                           "all items are exactly 'width' pixels wide,
                           starting at offset width*index".
                           Without it, FlatList has to measure each item first.
      */}
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

      {/* BOTTOM: dots + button */}
      <View style={styles.bottomSection}>
        {renderDots()}

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: current.color }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          {isLastSlide ? (
            // Last slide: "Get Started" — implies moving forward to sign up
            <>
              <Text style={styles.nextBtnText}>Get Started</Text>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </>
          ) : (
            // Middle slides: "Next"
            <>
              <Text style={styles.nextBtnText}>Next</Text>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* 
          Sign in link at the very bottom — for existing users who already
          completed onboarding before and are now logging into a new device.
        */}
        <TouchableOpacity
          onPress={() => navigation.navigate("SignIn")}
          style={styles.signInLink}
        >
          <Text style={styles.signInText}>
            Already have an account?{" "}
            <Text style={[styles.signInHighlight, { color: current.color }]}>
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
    backgroundColor: "#FFFFFF",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 12 : 4,
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  skipText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
  flatList: {
    flex: 1,
  },
  slide: {
    // Each slide is exactly one screen wide.
    // This is required for pagingEnabled to snap correctly.
    paddingHorizontal: 28,
    paddingTop: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  stepCounter: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 28,
    alignSelf: "flex-start",
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 32,
  },
  slideDescription: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  tipBox: {
    // Left-border accent — coloured border on the left, light background
    borderLeftWidth: 3,
    borderRadius: 0,          // no rounded corners on single-sided border
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "stretch",
    marginTop: 4,
  },
  tipText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    paddingTop: 16,
    alignItems: "center",
    gap: 16,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,           // pill shape at any width
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  signInLink: {
    paddingVertical: 4,
  },
  signInText: {
    fontSize: 14,
    color: "#64748B",
  },
  signInHighlight: {
    fontWeight: "600",
  },
});

export default OnboardingScreen;
