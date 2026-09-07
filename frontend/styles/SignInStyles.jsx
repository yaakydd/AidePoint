import { StyleSheet, Dimensions } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, scale } from '../assets/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');



export const signInStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.brand,
  },

  container: {
    flexGrow: 1,
    backgroundColor: COLORS.surface,
  },

  // 40% of screen height for the logo/header section
  headerSection: {
    height: SCREEN_HEIGHT * 0.4,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoCircle: {
    width: scale(96),
    height: scale(96),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },

  logoImage: {
    width: scale(76),
    height: scale(76),
    borderRadius: RADIUS.full,
  },

  brandTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 1,
  },

  card: {
    minHeight: SCREEN_HEIGHT * 0.6 + SPACING['2xl'],
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    marginTop: -SPACING['2xl'],
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING['3xl'],
  },

  greetingTitle: {
    fontSize: FONTS['3xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  greetingSubtitle: {
    fontSize: FONTS.md,
    color: COLORS.textMuted,
    marginBottom: SPACING['2xl'],
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.dangerBg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: FONTS.md,
    flex: 1,
  },

  form: {
    width: '100%',
  },

  inputLabel: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: scale(54),
  },

  // Focused input ties back to the logo hue without needing a saturated
  // fill — brandLight is a light tint of the same color as `brand`.
  inputBoxFocused: {
    borderColor: COLORS.brandDark,
    backgroundColor: COLORS.brandLight,
  },

  inputBoxError: {
    borderColor: COLORS.danger,
  },

  inputIcon: {
    marginRight: SPACING.sm,
  },

  textInput: {
    flex: 1,
    fontSize: FONTS.lg,
    color: COLORS.textPrimary,
  },

  eyeBtn: {
    padding: SPACING.xs,
  },

  fieldError: {
    color: COLORS.danger,
    fontSize: FONTS.sm,
    marginTop: SPACING.xs,
  },

  // "Forgot password?" now sits below the password field, right-aligned.
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: SPACING.xs,
  },

  forgotText: {
    fontSize: FONTS.md,
    color: COLORS.brandDark,
    fontWeight: FONTS.semibold,
  },

  // The one primary action on this screen — stays a solid fill.
  // brandDark, not brand, because it carries white text (5.68:1 contrast).
  signInBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.brandDark,
    height: scale(56),
    borderRadius: RADIUS.full,
    marginTop: SPACING['2xl'],
    ...SHADOWS.md,
  },

  signInBtnDisabled: {
    opacity: 0.2,
  },

  signInBtnText: {
    color: COLORS.white,
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    marginRight: SPACING.sm,
  },

  signUpRow: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },

  signUpText: {
    fontSize: FONTS.md,
    color: COLORS.textMuted,
  },

  signUpLink: {
    color: COLORS.brandDark,
    fontWeight: FONTS.bold,
  },
});