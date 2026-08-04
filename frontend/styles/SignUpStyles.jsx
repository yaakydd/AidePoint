// styles/SignUpStyles.js
//
// FIXED: removed dead styles from the original file -- ssoDivider/line/
// ssoText/ssoRow/ssoButton/ssoBtnLabel (no SSO buttons anywhere in this
// app), logoContainer/logoCircle/logoText (unused, SignUp never renders
// a logo the way SignIn does), footerLegal (never rendered), and the
// generic `error` style (superseded by fieldError, used consistently
// with SignInStyles.js's naming). Every remaining style is referenced
// by SignUp.js. All values now pull from theme.js instead of hardcoded
// hex/px, per project convention.

import { StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, scale } from '../assets/theme';

export const signupStyle = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.pagePad,
    paddingBottom: SPACING['3xl'],
  },

  // ── Step header: close/back button + progress dots ──
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },

  progressRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },

  progressDot: {
    width: scale(22),
    height: scale(4),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
  },

  progressDotActive: {
    backgroundColor: COLORS.primary,
  },

  progressDotDone: {
    backgroundColor: COLORS.primaryLight,
  },

  // ── Step title/subtitle ──
  stepTitle: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  stepSubtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING['2xl'],
    lineHeight: FONTS.sm * FONTS.normal,
  },

  // ── Form ──
  label: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: scale(54),
  },

  inputWrapperError: {
    borderColor: COLORS.danger,
  },

  inputIcon: {
    marginRight: SPACING.sm,
  },

  input: {
    flex: 1,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
  },

  fieldError: {
    color: COLORS.danger,
    fontSize: FONTS.xs,
    marginTop: SPACING.xs,
  },

  // ── Hospital field (tappable, opens modal) ──
  hospitalInputText: {
    flex: 1,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
  },

  hospitalInputPlaceholder: {
    color: COLORS.textMuted,
  },

  // ── Password strength (single bar + hint, matches reference image) ──
  strengthBarTrack: {
    height: scale(5),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },

  strengthBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },

  strengthHint: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },

  checkList: {
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },

  checkText: {
    fontSize: FONTS.xs,
  },

  checkPass: {
    color: COLORS.success,
  },

  checkFail: {
    color: COLORS.textMuted,
  },

  // ── Next / submit button ──
  nextBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    height: scale(56),
    borderRadius: RADIUS.full,
    marginTop: SPACING['2xl'],
    ...SHADOWS.md,
  },

  nextBtnDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },

  nextBtnText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    marginRight: SPACING.sm,
  },

  nextBtnTextDisabled: {
    color: COLORS.textMuted,
  },

  // ── Sign in link (final step only) ──
  signinRow: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },

  signinText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },

  signinLink: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },

  // ── Auth error banner ──
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

  // ── Hospital picker modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },

  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '78%',
    paddingBottom: layout.bottomInset + SPACING.md,
    ...SHADOWS.lg,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  modalTitle: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },

  modalSearchInput: {
    flex: 1,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },

  listItemName: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
    color: COLORS.textPrimary,
  },

  listItemCity: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: SPACING.xl,
  },

  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONTS.sm,
    marginTop: SPACING['3xl'],
  },

  typePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },

  typePillText: {
    fontSize: 10,
    fontWeight: FONTS.semibold,
    textTransform: 'capitalize',
  },

  customBox: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  customLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  customRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  customInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },

  customConfirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },

  customConfirmBtnDisabled: {
    opacity: 0.4,
  },

  customConfirmText: {
    color: COLORS.white,
    fontWeight: FONTS.semibold,
    fontSize: FONTS.sm,
  },
});