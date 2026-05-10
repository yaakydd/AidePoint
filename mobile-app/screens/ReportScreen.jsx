// ReportsScreen.js
// Fully rewritten and optimized version
// Includes:
// ✅ SafeArea fixes
// ✅ Responsive modal sizing
// ✅ Fixed tab overlap
// ✅ Better FlatList spacing
// ✅ Cleaner animations
// ✅ Better performance
// ✅ Detailed comments

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";

import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  Line,
} from "react-native-svg";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReportStyles as styles } from "../styles/ReportStyles";
/**
 * DEVICE DIMENSIONS
 */
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Safer responsive modal height
 * Prevents overlap with tab navigator
 */
const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.80;

/**
 * LOCAL STORAGE KEY
 */
const STORAGE_KEY = "@aidepoint_reports";

/* -------------------------------------------------------------------------- */
/*                             CONDITION CONFIG                               */
/* -------------------------------------------------------------------------- */

const CONDITIONS = {
  sickle: {
    label: "Sickle Cell Detected",
    badgeBg: "#FFF0F0",
    badgeText: "#C0392B",
    badgeDot: "#E74C3C",
    iconBg: "#FFF0F0",
    urgency: "High — refer to haematologist",
  },

  malaria: {
    label: "Malaria Detected",
    badgeBg: "#FFF8EC",
    badgeText: "#B07D00",
    badgeDot: "#F39C12",
    iconBg: "#FFF8EC",
    urgency: "High — commence anti-malarial treatment",
  },

  anaemia: {
    label: "Anaemia Detected",
    badgeBg: "#F5F0FF",
    badgeText: "#6C3EC1",
    badgeDot: "#8E44AD",
    iconBg: "#F5F0FF",
    urgency: "Moderate — iron panel recommended",
  },

  normal: {
    label: "Normal Result",
    badgeBg: "#EEFBF3",
    badgeText: "#1A7340",
    badgeDot: "#27AE60",
    iconBg: "#EEFBF3",
    urgency: "None — routine follow-up only",
  },
};

/* -------------------------------------------------------------------------- */
/*                                FILTERS                                     */
/* -------------------------------------------------------------------------- */

const FILTER_OPTIONS = [
  "All",
  "Sickle Cell",
  "Malaria",
  "Anaemia",
  "Normal",
];

const FILTER_TO_KEY = {
  All: null,
  "Sickle Cell": "sickle",
  Malaria: "malaria",
  Anaemia: "anaemia",
  Normal: "normal",
};

/* -------------------------------------------------------------------------- */
/*                              DATE HELPERS                                  */
/* -------------------------------------------------------------------------- */

function getRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();

  const minutes = (now - date) / (1000 * 60);
  const hours = minutes / 60;
  const days = hours / 24;

  if (minutes < 1) return "Just now";

  if (minutes < 60)
    return `${Math.floor(minutes)} min ago`;

  if (hours < 24)
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (days < 2) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getFullDate(isoString) {
  return new Date(isoString).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* -------------------------------------------------------------------------- */
/*                                  SVG ICONS                                 */
/* -------------------------------------------------------------------------- */

function SickleCellIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFF0F0" />

      <Ellipse
        cx="16"
        cy="28"
        rx="11"
        ry="7"
        fill="#F5B7B7"
        transform="rotate(-30 16 28)"
      />

      <Path
        d="M14 22 Q38 10 42 29 Q39 44 22 39"
        fill="#E74C3C"
        opacity="0.88"
      />

      <Ellipse
        cx="23"
        cy="32"
        rx="9"
        ry="5.5"
        fill="#C0392B"
        opacity="0.55"
        transform="rotate(-20 23 32)"
      />
    </Svg>
  );
}

function MalariaIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#FFF8EC" />

      <Circle cx="28" cy="30" r="15" fill="#FDEBD0" />

      <Circle
        cx="28"
        cy="30"
        r="15"
        fill="none"
        stroke="#F39C12"
        strokeWidth="3"
      />

      <Circle
        cx="33"
        cy="25"
        r="5"
        fill="#E67E22"
      />
    </Svg>
  );
}

function AnaemiaIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#F5F0FF" />

      <Ellipse
        cx="18"
        cy="28"
        rx="11"
        ry="8"
        fill="#D7C9F7"
      />

      <Ellipse
        cx="39"
        cy="21"
        rx="10"
        ry="7.5"
        fill="#E8DEFF"
      />
    </Svg>
  );
}

function NormalIcon({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width="56" height="56" rx="14" fill="#EEFBF3" />

      <Path
        d="M30 40 l5 5 l9-11"
        stroke="#1A7340"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const CONDITION_ICONS = {
  sickle: SickleCellIcon,
  malaria: MalariaIcon,
  anaemia: AnaemiaIcon,
  normal: NormalIcon,
};

/* -------------------------------------------------------------------------- */
/*                            SHARED COMPONENTS                               */
/* -------------------------------------------------------------------------- */

function ConditionIcon({ condition, size = 56 }) {
  const Icon =
    CONDITION_ICONS[condition] ?? NormalIcon;

  return <Icon size={size} />;
}

function ConditionBadge({ condition }) {
  const cfg = CONDITIONS[condition];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.badgeBg,
        },
      ]}
    >
      <View
        style={[
          styles.badgeDot,
          {
            backgroundColor: cfg.badgeDot,
          },
        ]}
      />

      <Text
        style={[
          styles.badgeLabel,
          {
            color: cfg.badgeText,
          },
        ]}
      >
        {cfg.label}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                               REPORT CARD                                  */
/* -------------------------------------------------------------------------- */

const ReportCard = React.memo(function ReportCard({
  report,
  onPress,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  /**
   * PRESS ANIMATION
   */
  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 250,
      friction: 18,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 250,
      friction: 18,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onPress(report)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale }],
          },
        ]}
      >
        {/* ICON */}
        <ConditionIcon
          condition={report.condition}
        />

        {/* BODY */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName}>
            {report.patientName}
          </Text>

          <Text style={styles.cardId}>
            ID: {report.patientId}
          </Text>

          <ConditionBadge
            condition={report.condition}
          />
        </View>

        {/* TIME */}
        <Text style={styles.cardTime}>
          {getRelativeTime(report.timestamp)}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

/* -------------------------------------------------------------------------- */
/*                                DETAIL MODAL                                */
/* -------------------------------------------------------------------------- */

function DetailModal({
  report,
  visible,
  onClose,
}) {
  const slideY = useRef(
    new Animated.Value(SCREEN_HEIGHT)
  ).current;

  /**
   * MODAL ANIMATION
   */
  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!report) return null;

  const cfg = CONDITIONS[report.condition];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>

        {/* BACKDROP */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* MODAL SHEET */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: slideY,
                },
              ],
            },
          ]}
        >
          {/* HANDLE */}
          <View style={styles.handle} />

          {/* HEADER */}
          <View style={styles.sheetHeader}>
            <ConditionIcon
              condition={report.condition}
              size={70}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>
                {report.patientName}
              </Text>

              <Text style={styles.sheetId}>
                {report.patientId}
              </Text>

              <ConditionBadge
                condition={report.condition}
              />
            </View>
          </View>

          {/* DETAILS */}
          <ScrollView
            style={styles.sheetScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Condition
              </Text>

              <Text style={styles.detailValue}>
                {cfg.label}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Date
              </Text>

              <Text style={styles.detailValue}>
                {getFullDate(report.timestamp)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Time
              </Text>

              <Text style={styles.detailValue}>
                {getTime(report.timestamp)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                AI Confidence
              </Text>

              <Text style={styles.detailValue}>
                {Number(
                  report.confidence
                ).toFixed(1)}
                %
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Urgency
              </Text>

              <Text
                style={[
                  styles.detailValue,
                  {
                    color: cfg.badgeText,
                  },
                ]}
              >
                {cfg.urgency}
              </Text>
            </View>
          </ScrollView>

          {/* CLOSE BUTTON */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.closeBtnText}>
              Close Report
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                                EMPTY STATE                                 */
/* -------------------------------------------------------------------------- */

function EmptyState({ isFiltering }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>
        {isFiltering
          ? "No matching reports"
          : "No reports yet"}
      </Text>

      <Text style={styles.emptySubtitle}>
        {isFiltering
          ? "Try another search"
          : "Complete a scan to see reports"}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                               MAIN SCREEN                                  */
/* -------------------------------------------------------------------------- */

export default function ReportsScreen({
  navigation,
  route,
}) {
  const [reports, setReports] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [query, setQuery] = useState("");

  const [activeFilter, setActiveFilter] =
    useState("All");

  const [selectedReport, setSelectedReport] =
    useState(null);

  const [modalVisible, setModalVisible] =
    useState(false);

  /**
   * LOAD REPORTS
   */
  useEffect(() => {
    loadReports();
  }, []);

  /**
   * RECEIVE NEW REPORT
   */
  useEffect(() => {
    const incoming =
      route?.params?.newReport;

    if (incoming) {
      saveIncomingReport(incoming);

      navigation?.setParams({
        newReport: undefined,
      });
    }
  }, [route?.params?.newReport]);

  /**
   * LOAD FROM STORAGE
   */
  async function loadReports() {
    try {
      const stored =
        await AsyncStorage.getItem(
          STORAGE_KEY
        );

      if (stored) {
        setReports(JSON.parse(stored));
      }
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * SAVE REPORT
   */
  async function saveIncomingReport(
    newReport
  ) {
    try {
      const updated = [
        newReport,
        ...reports,
      ];

      setReports(updated);

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.warn(error);
    }
  }

  /**
   * OPEN REPORT
   */
  const openReport = useCallback(
    (report) => {
      setSelectedReport(report);

      setModalVisible(true);
    },
    []
  );

  /**
   * CLOSE REPORT
   */
  const closeModal = useCallback(() => {
    setModalVisible(false);

    setTimeout(() => {
      setSelectedReport(null);
    }, 240);
  }, []);

  /**
   * FILTER REPORTS
   */
  const visibleReports = useMemo(() => {
    const conditionKey =
      FILTER_TO_KEY[activeFilter];

    const search = query
      .toLowerCase()
      .trim();

    return reports.filter((r) => {
      const matchesSearch =
        !search ||
        r.patientName
          .toLowerCase()
          .includes(search) ||
        r.patientId
          .toLowerCase()
          .includes(search);

      const matchesFilter =
        !conditionKey ||
        r.condition === conditionKey;

      return (
        matchesSearch && matchesFilter
      );
    });
  }, [reports, query, activeFilter]);

  /**
   * FLATLIST RENDERER
   */
  const renderCard = useCallback(
    ({ item }) => (
      <ReportCard
        report={item}
        onPress={openReport}
      />
    ),
    [openReport]
  );

  /**
   * LOADING STATE
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator
          size="large"
          color="#1A2F6E"
          style={{
            marginTop: 60,
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Medical Reports
        </Text>
      </View>

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* FILTERS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterStrip}
      >
        {FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.filterPill,

              activeFilter === option &&
                styles.filterPillActive,
            ]}
            onPress={() =>
              setActiveFilter(option)
            }
          >
            <Text
              style={[
                styles.filterText,

                activeFilter === option &&
                  styles.filterTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* REPORT LIST */}
      <FlatList
        data={visibleReports}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}

        showsVerticalScrollIndicator={false}

        contentContainerStyle={
          styles.listContent
        }

        ListEmptyComponent={
          <EmptyState
            isFiltering={
              query.length > 0 ||
              activeFilter !== "All"
            }
          />
        }
      />

      {/* DETAIL MODAL */}
      <DetailModal
        report={selectedReport}
        visible={modalVisible}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

