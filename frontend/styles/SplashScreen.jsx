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

  logoWrap: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xl,
  },

  logoImage: {
    width: scale(72),
    height: scale(72),
  },

  wordmark: {
    height: vScale(30),
    width: scale(160),
    marginBottom: SPACING.sm,
  },

  subtitle: {
    fontSize: FONTS.md,
    fontWeight: FONTS.medium,
    color: "rgba(255,255,255,1)",
    textAlign: "center",
    letterSpacing: 0.3,
  },

  loader: {
    marginTop: SPACING["3xl"],
  },
});
