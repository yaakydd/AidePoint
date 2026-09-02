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
    paddingTop: SPACING['2xl'],
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

photoFrame: {
  width: "100%",
  aspectRatio: 1.05,        // taller/bigger frame, still close to square so nothing crops
  alignItems: "center",
  justifyContent: "center",
  marginBottom: scale(20),
},

photoGlow: {
  width: "100%",
  height: "100%",
  borderRadius: RADIUS.xl,
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "center",
  padding: scale(8),        // less inner padding so the image itself fills more of the frame
},

photo: {
  width: "100%",
  height: "100%",
  borderRadius: RADIUS.lg,
},

photoCard: {
  width: "100%",
  height: "100%",
  borderRadius: RADIUS.xl,
  overflow: "hidden",
  backgroundColor: COLORS.surfaceAlt,
  padding: SPACING.lg,
  alignItems: "center",
  justifyContent: "center",
  ...SHADOWS.md,
},

  photoInner: {
    width: "58%",
    height: "58%",
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...SHADOWS.md,
  },


  // Small pill badge above the title, replacing the old flat accent bar.
  // Ties the slide's accent color to a meaning (step + action) instead
  // of being purely decorative.
  stepBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },

  stepBadgeText: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.medium,
  },

slideTitle: {
  fontSize: FONTS["2xl"],
  fontWeight: FONTS.bold,
  textAlign: "left",
  alignSelf: "flex-start",
  marginTop: scale(10),      // pushes title (and description below it) down a bit
  marginBottom: SPACING.xs,
  color: COLORS.textPrimary,
},

  slideDescription: {
    fontSize: FONTS.md,
    textAlign: "left",
    alignSelf: "flex-start",
    color: COLORS.textSecondary,
    lineHeight: scale(22),
  },

  navigatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    gap: scale(8),
  },

  navigatorPill: {
    height: scale(8),
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
chatPreviewFrame: {
  width: "100%",
  height: "100%",
  borderRadius: RADIUS.xl,
  overflow: "hidden",
  backgroundColor: COLORS.surfaceAlt,
  padding: SPACING.lg,
  justifyContent: "center",
  gap: SPACING.md,
  ...SHADOWS.md,
},
chatPreviewRow: {
  flexDirection: "row",
  alignItems: "flex-end",
  gap: SPACING.sm,
},
chatPreviewRowUser: {
  flexDirection: "row",
  justifyContent: "flex-end",
},
chatPreviewAvatar: {
  width: scale(28),
  height: scale(28),
  borderRadius: RADIUS.full,
  backgroundColor: COLORS.primaryDark,
  alignItems: "center",
  justifyContent: "center",
},
chatPreviewBubbleBot: {
  backgroundColor: COLORS.surface,
  paddingVertical: SPACING.sm,
  paddingHorizontal: SPACING.md,
  borderRadius: RADIUS.lg,
  borderTopLeftRadius: RADIUS.xs,
  maxWidth: "78%",
  ...SHADOWS.sm,
},
chatPreviewBubbleUser: {
  backgroundColor: COLORS.primary,
  paddingVertical: SPACING.sm,
  paddingHorizontal: SPACING.md,
  borderRadius: RADIUS.lg,
  borderTopRightRadius: RADIUS.xs,
  maxWidth: "78%",
},
chatPreviewTextBot: {
  fontSize: FONTS.sm,
  lineHeight: FONTS.sm * FONTS.normal,
  color: COLORS.textPrimary,
},
chatPreviewTextUser: {
  fontSize: FONTS.sm,
  lineHeight: FONTS.sm * FONTS.normal,
  color: COLORS.white,
},
});
