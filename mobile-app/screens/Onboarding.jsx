// screens/auth/OnboardingScreen.js

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

// Dimensions.get('window') gives you the screen width/height in pixels.
// We use 'width' to make each slide exactly one screen wide.
const { width } = Dimensions.get("window");

// Each slide is a plain object — icon name, title, description, accent colour.
// Keeping content in a data array (not JSX) makes it easy to add/remove slides
// without touching any layout code.
const SLIDES = [
  {
    id: "1",
    icon: "microscope",
    title: "Smart Blood Analysis",
    description:
      "Capture blood smear images from your microscope and let our AI detect 8 critical blood conditions in seconds.",
    color: "#0EA5E9",
  },
  {
    id: "2",
    icon: "file-document-outline",
    title: "Instant Clinical Reports",
    description:
      "Generate professional reports that can be downloaded as PDF, shared with doctors, or sent via the portal.",
    color: "#6366F1",
  },
  {
    id: "3",
    icon: "hospital-building",
    title: "Hospital Integration",
    description:
      "Connect to your hospital system. Doctors receive reports directly and can add verified notes and signatures.",
    color: "#10B981",
  },
];

const OnboardingScreen = () => {
  // currentIndex tracks which slide is visible right now.
  // We update it every time the user swipes.
  const [currentIndex, setCurrentIndex] = useState(0);

  // useRef gives us a stable reference to the FlatList so we can
  // call scrollToIndex() on it programmatically (for the Next button).
  const flatListRef = useRef(null);

  const navigation = useNavigation();

  // Called on every scroll event. We calculate which slide is visible
  // by dividing the horizontal scroll offset by the screen width.
  // Math.round() handles partial scrolls cleanly.
  const handleScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      // Not on last slide — scroll to next slide
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // Last slide — take user to choose their account type
      navigation.navigate("UserType");
    }
  };

  // Allows skipping all slides at once
  const handleSkip = () => {
    navigation.navigate("UserType");
  };

  // renderItem is called by FlatList once per entry in SLIDES[].
  // Each slide is exactly 'width' pixels wide so the list snaps
  // to exactly one slide per swipe.
  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      {/* Tinted circle behind the icon — color is the slide's accent at 15% opacity */}
      <View style={[styles.iconCircle, { backgroundColor: item.color + "26" }]}>
        <MaterialCommunityIcons name={item.icon} size={72} color={item.color} />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  // Dot indicators: wide/coloured = active, small/grey = inactive.
  const renderDots = () => (
    <View style={styles.dotsRow}>
      {SLIDES.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                index === currentIndex ? "#0EA5E9" : "#CBD5E1",
              width: index === currentIndex ? 24 : 8, // active dot is wider
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Skip — top-right corner, hidden on the last slide */}
      {currentIndex < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* pagingEnabled makes the list snap to full-screen slides.
          scrollEventThrottle={16} fires the scroll event ~60 times/sec
          so our dot indicator stays perfectly in sync. */}
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
        // getItemLayout lets FlatList skip measuring each item —
        // a performance optimisation since all slides are the same size.
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Bottom bar: dots + action button */}
      <View style={styles.bottomBar}>
        {renderDots()}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          {currentIndex === SLIDES.length - 1 ? (
            <Text style={styles.nextBtnText}>Get Started</Text>
          ) : (
            <>
              <Text style={styles.nextBtnText}>Next</Text>
              <Feather name="arrow-right" size={20} color="#FFF" />
            </>
          )}
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
  skipBtn: {
    position: "absolute",
    top: 52,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingTop: 60,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 26,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 24,
    alignItems: "center",
    gap: 20,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    gap: 8,
    width: "100%",
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default OnboardingScreen;