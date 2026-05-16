// styles/HomeStyles.js

import { StyleSheet } from "react-native";

import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  layout,
  SCREEN,
} from "../assets/theme";

export const homeStyles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
  },

  scrollContent: {
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.sm,
  },


  // HEADER

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },

  avatarCircle: {
    backgroundColor: COLORS.primary,
  },

  avatarInitials: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },

  greeting: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  subGreeting: {
    marginTop: 2,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.full,

    backgroundColor: COLORS.surface,

    justifyContent: "center",
    alignItems: "center",

    ...SHADOWS.sm,
  },

  notifDot: {
    position: "absolute",
    top: 10,
    right: 10,

    width: 10,
    height: 10,
    borderRadius: RADIUS.full,

    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: COLORS.white,
  },


  // TITLES

  sectionTitle: {
    fontSize: FONTS["2xl"],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },


  // STATS CARDS

statsRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  marginBottom: SPACING.xl,
  gap: SPACING.md,
},

statCard: {
  width: layout.isSmallScreen ? "48%" : "31%",

  backgroundColor: COLORS.surface,

  borderRadius: RADIUS.xl,

  paddingVertical: SPACING.lg,
  paddingHorizontal: SPACING.md,

  ...SHADOWS.sm,
},
  statCardPrimary: {
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },

  statCardWarning: {
    borderWidth: 1,
    borderColor: COLORS.warning,
  },

  statLabel: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 1,

    marginBottom: SPACING.sm,
  },

  statValue: {
    fontSize: FONTS["3xl"],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  statSub: {
    marginTop: 4,

    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },


  // CHART

    barsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",     // bars grow upward from the same bottom line
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,                    // each column takes equal width automatically
    gap: 4,
  },
  barCount: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
  barCountToday: {
    color: "#6200EE",
    fontWeight: "700",
  },
  barTrack: {
    width: "60%",               // bar is 60% of the column width
    justifyContent: "flex-end", // bar grows from the BOTTOM of the track
    alignItems: "center",
  },
  barFill: {
    width: "100%",
  },
  dayLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "400",
    marginTop: 2,
  },
  dayLabelToday: {
    color: "#6200EE",
    fontWeight: "700",
  },

  chartCard: {
    backgroundColor: COLORS.surface,

    borderRadius: RADIUS["2xl"],

    padding: SPACING.lg,

    marginBottom: SPACING.xl,

    ...SHADOWS.md,
  },

  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: SPACING.sm,
  },

  chartTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  chartSub: {
    marginTop: 4,

    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },

  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,

    backgroundColor: COLORS.primary,

    marginRight: 6,
  },

  legendText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },

  chartSkeleton: {
    height: 120,
    borderRadius: RADIUS.lg,

    backgroundColor: COLORS.divider,

    marginTop: SPACING.md,
  },


  // QUICK ACTION BUTTON

  quickActionBtn: {
    backgroundColor: COLORS.primary,

    borderRadius: RADIUS.xl,

    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,

    marginBottom: SPACING["2xl"],

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    ...SHADOWS.lg,
  },

  quickActionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  quickActionText: {
    color: COLORS.white,

    fontSize: FONTS.md,
    fontWeight: FONTS.bold,

    marginLeft: SPACING.sm,
  },


  // LIST HEADER

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: SPACING.md,
  },

  viewAll: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },


  // PATIENT CARD

  patientCard: {
    backgroundColor: COLORS.surface,

    borderRadius: RADIUS.xl,

    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,

    marginBottom: SPACING.md,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    ...SHADOWS.sm,
  },

  patientInfo: {
    flexDirection: "row",
    alignItems: "center",

    flex: 1,
    marginRight: SPACING.sm,
  },

  patientIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.full,

    justifyContent: "center",
    alignItems: "center",

    marginRight: SPACING.md,
  },

  patientTextContainer: {
    flex: 1,
  },

  patientName: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,

    marginBottom: 2,
  },

  patientTime: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },

  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,

    borderRadius: RADIUS.full,

    maxWidth: SCREEN.WIDTH * 0.34,
  },

  statusText: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    textTransform: "uppercase",
  },


  // EMPTY STATE

  emptyContainer: {
    backgroundColor: COLORS.surface,

    borderRadius: RADIUS.xl,

    paddingVertical: SPACING["4xl"],
    paddingHorizontal: SPACING.xl,

    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    marginTop: SPACING.lg,

    fontSize: FONTS.md,
    fontWeight: FONTS.bold,

    color: COLORS.textPrimary,
  },

  emptySubText: {
    marginTop: SPACING.sm,

    fontSize: FONTS.sm,
    color: COLORS.textSecondary,

    textAlign: "center",
    lineHeight: 20,
  },


  // SKELETON

  skeletonCard: {
    height: 88,
    backgroundColor: COLORS.divider,
  },
});