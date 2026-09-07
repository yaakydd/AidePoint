import { StyleSheet } from "react-native";
import { COLORS, FONTS, SPACING, scale, vScale } from "../assets/theme";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING["2xl"],
  },

  wordmark: {
    height: vScale(30),
    width: scale(160),
    marginBottom: SPACING.sm,
    fontWeight: FONTS.medium,
  },

  subtitle: {
    fontSize: FONTS.md,
    fontWeight: FONTS.medium,
    color: "rgba(255,255,255,1)",
    textAlign: "center",
    letterSpacing: 0.3,
  },
});
