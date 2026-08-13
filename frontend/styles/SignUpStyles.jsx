// styles/SignUpStyles.js
//
// Restyled after the Chime reference: top bar with close + "Log in",
// logo + wordmark row, step icons connected by a line with labels
// underneath, and a `stepBody` wrapper with `flexGrow: 1` +
// `justifyContent: 'space-between'` so the form content and the Next
// button spread out to fill the screen instead of clustering at the
// top on taller devices. Every style here is referenced by SignUp.js;
// values pull from theme.js per project convention.

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

  // ── Top bar: close/back + Log in ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.lg,
    minHeight: scale(28),
  },

  topBarLogin: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.primary,
  },

  // ── Logo + wordmark ──
  // ── Logo + wordmark ──
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,        // was 2xl
  },

  logoCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandText: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  // ── Step icons connected by a line, with labels underneath ──
// ── Step icons connected by a line, with labels underneath ──
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.xl,        // was 2xl
    paddingHorizontal: SPACING.xs,
  },

  progressItem: {
    alignItems: 'center',
    width: scale(72),
  },

  stepIconCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },

  stepIconCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  stepIconCircleDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },

  stepIconLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  stepIconLabelActive: {
    color: COLORS.textPrimary,
    fontWeight: FONTS.semibold,
  },

  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginTop: scale(18), // vertically centers the line on the icon circles
    marginHorizontal: -SPACING.xs,
  },

  progressLineDone: {
    backgroundColor: COLORS.success,
  },

  // ── Step body wrapper: spreads form + button to fill remaining
  // screen height on taller devices instead of everything clustering
  // near the top. scrollContent's flexGrow:1 makes this effective. ──
// ── Step body wrapper ──
  stepBody: {
    flexGrow: 1,
    // removed justifyContent: 'space-between' — that was the main
    // culprit, forcing the button all the way to the bottom and
    // stretching everything to fill leftover height on taller screens
    marginTop: SPACING.lg,        // was 2xl
  },

  // ── Privacy policy checkbox (step 3) ──
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },

  checkbox: {
    width: scale(20),
    height: scale(20),
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  privacyText: {
    flex: 1,
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    lineHeight: FONTS.xs * FONTS.normal,
  },

  privacyLink: {
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
  },

  // ── Step title/subtitle ──
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
    marginBottom: SPACING.lg,     // was 2xl
    lineHeight: FONTS.sm * FONTS.normal,
  },

  // ── Form ──
// ── Form ──
  label: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,        // was lg
    marginBottom: SPACING.xs,     // was sm
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
// ── Next / submit button ──
  nextBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    height: scale(56),
    borderRadius: RADIUS.full,
    marginTop: SPACING.xl,        // was 2xl
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
    marginTop: SPACING.lg,
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