// ReportStyles.js

import {
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";

/**
 * DEVICE HEIGHT
 */
const { height: SCREEN_HEIGHT } =
  Dimensions.get("window");

/**
 * RESPONSIVE MODAL HEIGHT
 */
const MODAL_MAX_HEIGHT =
  SCREEN_HEIGHT * 0.80;

export const ReportStyles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#F7F8FA",
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
      backgroundColor: "#FFFFFF",
    },

    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: "#1A1B2E",
    },

    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: "#FFFFFF",
    },

    searchInput: {
      backgroundColor: "#F0F1F5",

      borderRadius: 14,

      paddingHorizontal: 16,
      paddingVertical:
        Platform.OS === "ios"
          ? 14
          : 12,

      fontSize: 14,
      color: "#1A1B2E",
    },

    filterStrip: {
      backgroundColor: "#FFFFFF",
      paddingVertical: 12,
      maxHeight: 58,
    },

    filterPill: {
      marginLeft: 16,

      paddingHorizontal: 16,
      paddingVertical: 8,

      borderRadius: 20,

      borderWidth: 1,
      borderColor: "#D8DAE5",

      backgroundColor: "#FFFFFF",
    },

    filterPillActive: {
      backgroundColor: "#1A2F6E",
      borderColor: "#1A2F6E",
    },

    filterText: {
      fontSize: 13,
      color: "#4A4B60",
      fontWeight: "600",
    },

    filterTextActive: {
      color: "#FFFFFF",
    },

    /**
     * Prevent tab bar overlap
     */
    listContent: {
      padding: 16,

      paddingBottom: 120,

      flexGrow: 1,
    },

    card: {
      backgroundColor: "#FFFFFF",

      borderRadius: 18,

      padding: 16,

      marginBottom: 12,

      flexDirection: "row",
      alignItems: "center",

      shadowColor: "#000",

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.05,
      shadowRadius: 8,

      elevation: 3,
    },

    cardBody: {
      flex: 1,
      marginLeft: 14,
    },

    cardName: {
      fontSize: 15,
      fontWeight: "700",
      color: "#1A1B2E",
    },

    cardId: {
      marginTop: 2,

      fontSize: 12,
      color: "#9799A8",
    },

    cardTime: {
      fontSize: 11,
      color: "#B0B2BE",
    },

    badge: {
      flexDirection: "row",
      alignItems: "center",

      alignSelf: "flex-start",

      paddingHorizontal: 10,
      paddingVertical: 5,

      borderRadius: 20,

      marginTop: 8,
    },

    badgeDot: {
      width: 6,
      height: 6,

      borderRadius: 3,

      marginRight: 6,
    },

    badgeLabel: {
      fontSize: 11,
      fontWeight: "700",
    },

    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",

      paddingTop: 120,
      paddingHorizontal: 30,
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#4A4B60",
    },

    emptySubtitle: {
      marginTop: 8,

      fontSize: 14,
      color: "#9799A8",

      textAlign: "center",
    },

    overlay: {
      flex: 1,

      backgroundColor:
        "rgba(20,22,40,0.55)",

      justifyContent: "flex-end",
    },

    /**
     * MODAL SHEET
     */
    sheet: {
      backgroundColor: "#FFFFFF",

      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,

      paddingBottom:
        Platform.OS === "ios"
          ? 34
          : 24,

      maxHeight: MODAL_MAX_HEIGHT,

      overflow: "hidden",
    },

    handle: {
      width: 40,
      height: 5,

      borderRadius: 5,

      backgroundColor: "#D8DAE5",

      alignSelf: "center",

      marginTop: 12,
      marginBottom: 10,
    },

    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 20,
      paddingBottom: 20,
    },

    sheetName: {
      fontSize: 20,
      fontWeight: "700",
      color: "#1A1B2E",

      marginBottom: 4,
    },

    sheetId: {
      fontSize: 12,
      color: "#9799A8",

      marginBottom: 8,
    },

    sheetScroll: {
      paddingHorizontal: 20,
    },

    detailRow: {
      flexDirection: "row",

      justifyContent: "space-between",

      paddingVertical: 15,

      borderBottomWidth: 0.5,
      borderBottomColor: "#ECEEF3",
    },

    detailLabel: {
      fontSize: 13,
      color: "#9799A8",

      flex: 1,
    },

    detailValue: {
      fontSize: 13,
      color: "#1A1B2E",

      fontWeight: "600",

      maxWidth: "58%",

      textAlign: "right",
    },

    closeBtn: {
      marginHorizontal: 20,
      marginTop: 18,

      paddingVertical: 15,

      borderRadius: 16,

      backgroundColor: "#1A2F6E",

      alignItems: "center",
    },

    closeBtnText: {
      color: "#FFFFFF",

      fontSize: 15,
      fontWeight: "700",
    },
  });