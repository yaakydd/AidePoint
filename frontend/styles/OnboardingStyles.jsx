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

  // Photo frame: full slide width (minus the slide's own horizontal
  // padding), fixed 4:3 aspect ratio via aspectRatio rather than a
  // hardcoded height, so it scales correctly across every device width
  // instead of relying on one baseline pixel value. resizeMode="cover"
  // on the Image inside crops to fill this exact box.
  photoFrame: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceAlt,
    marginBottom: scale(36),
    ...SHADOWS.md,
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  // Thin accent bar under the photo, colored per-slide to tie the image
  // back to the active progress/navigator color.
  photoAccentBar: {
    height: scale(4),
    width: "100%",
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

  // Enlarged pill-style page navigator, replacing the old small dots --
  // bigger hit target, bigger visual weight, active pill grows into a
  // wide pill rather than just a slightly bigger dot.
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
});