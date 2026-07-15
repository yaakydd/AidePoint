import { StyleSheet, Platform } from "react-native";
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, scale } from "../assets/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING["2xl"],
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  logoBadge: {
    width: scale(28),
    height: scale(28),
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
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

  // Progress bar
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING["2xl"],
    borderRadius: RADIUS.full,
    overflow: "hidden",
    marginBottom: scale(12),
  },
  progressFill: {
    height: "100%",
    borderRadius: RADIUS.full,
  },

  slide: {
    paddingHorizontal: scale(32),
    alignItems: "center",
    justifyContent: "center",
  },

  iconRing: {
    width: scale(176),
    height: scale(176),
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(36),
  },

  iconCircle: {
    width: scale(140),
    height: scale(140),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
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
    lineHeight: scale(22),
    paddingHorizontal: scale(6),
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    gap: 6,
  },

  dot: {
    height: 7,
    borderRadius: RADIUS.full,
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
