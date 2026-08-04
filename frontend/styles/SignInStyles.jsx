// styles/SignInStyles.js
import { StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, scale } from '../assets/theme';

export const signInStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  container: {
    flexGrow: 1,
  },

  // ── Curved color header (holds the logo) ──
  headerSection: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingTop: SPACING['3xl'],
    paddingBottom: SPACING['4xl'],
  },

  // FIXED PLACEHOLDER: swap this View for your real logo Image once you
  // have the asset, e.g.:
  //   <Image source={require('../assets/logo.png')} style={signInStyles.logoImage} />
  // Keeping logoCircle's dimensions/shape on the Image style will match
  // the layout below exactly -- just delete logoCircle's icon child.
  logoCircle: {
    width: scale(76),
    height: scale(76),
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

  // ── White card, rounded top corners, overlaps the header ──
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    marginTop: -SPACING['2xl'],
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING['3xl'],
  },

  greetingTitle: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  greetingSubtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING['2xl'],
  },

  // ── Server error ──
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
    fontSize: FONTS.sm,
    flex: 1,
  },

  form: {
    width: '100%',
  },

  inputLabel: {
    fontSize: FONTS.sm,
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

  inputBoxError: {
    borderColor: COLORS.danger,
  },

  inputIcon: {
    marginRight: SPACING.sm,
  },

  textInput: {
    flex: 1,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
  },

  eyeBtn: {
    padding: SPACING.xs,
  },

  fieldError: {
    color: COLORS.danger,
    fontSize: FONTS.xs,
    marginTop: SPACING.xs,
  },

  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  forgotText: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
    marginTop: SPACING.md,
  },

  // ── Pill-shaped submit button with shadow ──
  signInBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    height: scale(56),
    borderRadius: RADIUS.full,
    marginTop: SPACING['2xl'],
    ...SHADOWS.md,
  },

  signInBtnDisabled: {
    opacity: 0.5,
  },

  signInBtnText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    marginRight: SPACING.sm,
  },

  signUpRow: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },

  signUpText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },

  signUpLink: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
});