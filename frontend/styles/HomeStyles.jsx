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
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.sm,
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
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    // no background / shadow — icon only
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarCircle: {
    backgroundColor: COLORS.primary,
  },

  avatarInitials: {
    color: COLORS.white,
    fontSize: FONTS["2xl"],
    fontWeight: FONTS.bold,
  },

  avatarImage: {
  width: 48,
  height: 48,
  borderRadius: 24,
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

  statCardHalf: {
    width: "48%",
  },

  statCardPrimary: {
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },

  statIcon: {
    marginBottom: SPACING.sm,
  },

  statLabel: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textSecondary,
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
    alignItems: "flex-end",
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  barCount: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  barCountToday: {
    color: COLORS.primaryDark,
    fontWeight: "700",
  },
  barTrack: {
    width: "60%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "100%",
  },
  dayLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "400",
    marginTop: 2,
  },
  dayLabelToday: {
    color: COLORS.primaryDark,
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

  // Tap-to-reveal detail line under the chart
  chartDetailBox: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartDetailText: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.primaryDark,
  },
  chartDetailCount: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.primaryDark,
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


  // ERROR BANNER

  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },

  errorBannerText: {
    color: COLORS.danger,
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
  },


  // SKELETON

  skeletonCard: {
    height: 88,
    backgroundColor: COLORS.divider,
  },
});
