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

  brandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,        // was 2xl
  },

  brandLogoImage: {
    width: scale(180),
    height: scale(42),   // matches the logo's ~4.28:1 aspect ratio
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
    backgroundColor: COLORS.brandDark,
    borderColor: COLORS.brandDark,
  },

  stepIconCircleDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },

  stepIconLabel: {
    fontSize: FONTS.sm,
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


  stepBody: {
    flexGrow: 1,
    marginTop: SPACING.lg,        // was 2xl
  },


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
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: FONTS.sm * FONTS.normal,
  },

  privacyLink: {
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
  },

  //  Step title/subtitle 
//  Step title/subtitle 
  stepTitle: {
    fontSize: FONTS['3xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  stepSubtitle: {
    fontSize: FONTS.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,     // was 2xl
    lineHeight: FONTS.sm * FONTS.normal,
  },


//  Form 
  label: {
    fontSize: FONTS.md,
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
    fontSize: FONTS.lg,
    color: COLORS.textPrimary,
  },

  fieldError: {
    color: COLORS.danger,
    fontSize: FONTS.sm,
    marginTop: SPACING.xs,
  },

  //  Hospital field (tappable, opens modal) 
  hospitalInputText: {
    flex: 1,
    fontSize: FONTS.lg,
    color: COLORS.textPrimary,
  },

  hospitalInputPlaceholder: {
    color: COLORS.textMuted,
  },

  //  Password strength (single bar + hint, matches reference image) 
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
    fontSize: FONTS.sm,
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
    fontSize: FONTS.sm,
  },

  checkPass: {
    color: COLORS.success,
  },

  checkFail: {
    color: COLORS.textMuted,
  },

  //  Next / submit button 
//  Next / submit button 
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
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    marginRight: SPACING.sm,
  },

  nextBtnTextDisabled: {
    color: COLORS.textMuted,
  },

  //  Sign in link (final step only) 
  signinRow: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },

  signinText: {
    fontSize: FONTS.md,
    color: COLORS.textMuted,
  },

  signinLink: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },

  //  Auth error banner 
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
    fontSize: FONTS.md,
    flex: 1,
  },

  //  Hospital picker modal 
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
    fontSize: FONTS.lg,
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
    fontSize: FONTS.lg,
    color: COLORS.textPrimary,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },

  listItemName: {
    fontSize: FONTS.md,
    fontWeight: FONTS.medium,
    color: COLORS.textPrimary,
  },

  listItemCity: {
    fontSize: FONTS.sm,
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
    fontSize: FONTS.md,
    marginTop: SPACING['3xl'],
  },

  typePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },

  typePillText: {
    fontSize: FONTS.xs,
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
    fontSize: FONTS.md,
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
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },

  customConfirmBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },

  customConfirmBtnDisabled: {
    opacity: 0.4,
  },

  customConfirmText: {
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
    fontSize: FONTS.md,
  },
});