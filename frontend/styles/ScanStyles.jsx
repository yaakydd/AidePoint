// styles/ScanStyles.js
//
// AidePoint Scan Screen Styles
//
// Fully responsive external stylesheet using:
// - COLORS
// - FONTS
// - SPACING
// - RADIUS
// - SHADOWS
// - layout helpers
// - scale helpers

import { StyleSheet, Platform } from 'react-native';

import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  layout,
  scale,
  vScale,
  mScale,
} from '../assets/theme';

export const scanStyles = StyleSheet.create({

  // ─────────────────────────────────────────────
  // ROOT
  // ─────────────────────────────────────────────

  container: {
    flex: 1,
    backgroundColor: '#EEF2F5',
  },
  scroll: {
  paddingHorizontal: SPACING.pagePad,
  // paddingTop removed — SafeAreaView's inset + header's own
  // paddingVertical already provide top spacing; this was stacking
  // a third gap on top of both.
  },

  // ─────────────────────────────────────────────
  // HEADER — white background, centered title,
  // reset reduced to an icon with a tap tooltip
  // ─────────────────────────────────────────────

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.pagePad,
    paddingVertical: SPACING.md,
    marginHorizontal: -SPACING.pagePad,   // bleed to screen edges
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },

  headerSide: {
    width: scale(40),
    justifyContent: 'center',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: scale(36),
    height: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  // FIXED: Scan.jsx wraps the reset button + its tooltip in
  // styles.resetWrapper and uses styles.resetIconBtn for the button
  // itself -- neither existed before, only the unused resetButton below,
  // so the reset icon and its "Tap again to reset" tooltip were
  // rendering with zero positioning/sizing.
  resetWrapper: {
    position: 'relative',
  },

  resetIconBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerBg,
  },

  resetButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },

 resetTooltip: {
  position: 'absolute',
  top: scale(44),
  right: 0,
  backgroundColor: COLORS.textPrimary,
  paddingHorizontal: SPACING.md,
  paddingVertical: SPACING.xs + 2,
  borderRadius: RADIUS.md,
  zIndex: 20,
  alignItems: 'center',
  justifyContent: 'center',
  ...SHADOWS.md,
},

resetTooltipText: {
  color: COLORS.white,
  fontSize: FONTS.xs,
  fontWeight: FONTS.medium,
  textAlign: 'center',
},

// Small triangle pointing up at the reset icon, so the tooltip reads
// as attached to the button instead of floating on its own.
resetTooltipCaret: {
  position: 'absolute',
  top: -6,
  right: SPACING.md,
  width: 0,
  height: 0,
  borderLeftWidth: 6,
  borderRightWidth: 6,
  borderBottomWidth: 6,
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  borderBottomColor: COLORS.textPrimary,
},
  scanIdCard: {
    backgroundColor: '#F4F6F8',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },

  scanIdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanIdRight: {
  alignItems: 'flex-end',
  flexShrink: 1,
},

  scanIdLabel: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },

  // FIXED: scanIdValue (the ID itself) and the remaining-scans pill sit
  // side by side inside this card -- scanIdRight is the right-hand
  // column that groups and right-aligns both, and needed a maxWidth so
  // a long UUID-style scan ID can ellipsize instead of pushing the pill
  // off-screen.
  scanIdRight: {
    alignItems: 'flex-end',
    flexShrink: 1,
    maxWidth: '55%',
  },

  scanIdValue: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },

  // FIXED: the little "N scans remaining today" badge next to the scan
  // ID -- referenced in Scan.jsx but never defined. Danger variant kicks
  // in at remaining === 0.
  remainingPill: {
    marginTop: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successBg,
  },

  remainingPillDanger: {
    backgroundColor: COLORS.dangerBg,
  },

  remainingText: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semibold,
    color: COLORS.success,
  },

  remainingTextDanger: {
    color: COLORS.danger,
  },
  usageBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: COLORS.primaryLight,
  borderRadius: RADIUS.lg,
  paddingHorizontal: SPACING.lg,
  paddingVertical: SPACING.md,   // bumped from SPACING.sm for a bit more presence as a lead banner
  marginBottom: SPACING.lg,
},

  usageBannerLabel: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },

  usageBannerValue: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.primaryDark,
  },

  usageBannerValueWarning: {
    color: COLORS.danger,
  },

  // ─────────────────────────────────────────────
  // SECTION HEADERS
  // ─────────────────────────────────────────────

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  sectionTitle: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  // ─────────────────────────────────────────────
  // INPUTS
  // ─────────────────────────────────────────────

  inputLabel: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontWeight: FONTS.medium,
  },

  input: {
    height: vScale(54),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#CBEAF0',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
    ...SHADOWS.sm,
  },

  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },

  // FIXED: Scan.jsx wraps each Age/Gender and Temperature/Blood-Pressure
  // field in styles.rowItem (flex: 1) -- previously this layout was
  // inlined as {{ flex: 1 }} directly in Scan.js, but the newer Scan.jsx
  // references it as a named style that didn't exist here.
  rowItem: {
    flex: 1,
  },

  half: {
    flex: 1,
  },

  // FIXED: gender pill selector styles -- previously lived in a
  // component-local StyleSheet inside Scan.js (genderStyles); Scan.jsx
  // now references these directly off the shared scanStyles instead,
  // so they need to live here to actually apply.
  genderPillRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 2,
  },

  genderPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md - 1,
    borderRadius: RADIUS.sm + 2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },

  genderPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  genderPillText: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
    color: COLORS.textMuted,
  },

  genderPillTextActive: {
    color: COLORS.white,
  },

  // ─────────────────────────────────────────────
  // DOCTOR SELECTOR
  // ─────────────────────────────────────────────

  selectorButton: {
    height: vScale(54),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#CBEAF0',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },

  selectorText: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
    fontWeight: FONTS.medium,
  },

  // ─────────────────────────────────────────────
  // TAKE PICTURE BUTTON
  // ─────────────────────────────────────────────

  takePictureBtn: {
    height: vScale(58),
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },

  takePictureText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.semibold,
    color: COLORS.primary,
  },

  // ─────────────────────────────────────────────
  // IMAGE PREVIEW
  // ─────────────────────────────────────────────

  previewBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },

  previewWrapper: {
    marginBottom: SPACING.xl,
  },

  previewImage: {
    width: '100%',
    height: vScale(220),
  },

  // FIXED: the "Tap to enlarge" pill overlaid on the image preview --
  // referenced in Scan.jsx but never defined, so it was rendering
  // unstyled and unpositioned directly on top of the photo.
  previewZoomHint: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
  },

  previewZoomText: {
    color: COLORS.white,
    fontSize: FONTS.xs,
    fontWeight: FONTS.medium,
  },

  // FIXED: wraps the "Retake Photo" icon + text as a single pressable
  // row -- previously only retakeText (just the label) existed, so the
  // icon and text had no shared layout/press target sizing.
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },

  retakeText: {
    textAlign: 'center',
    color: COLORS.primary,
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
  },

  // ─────────────────────────────────────────────
  // UPLOAD CARD
  // ─────────────────────────────────────────────

  uploadCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9FEAF2',
    borderRadius: RADIUS['2xl'],
    backgroundColor: '#F2FAFC',
    paddingVertical: SPACING['4xl'],
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },

  uploadIconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: RADIUS.full,
    backgroundColor: '#CFF5F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },

  uploadTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },

  uploadSub: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: mScale(22),
    marginBottom: SPACING.xl,
  },

  browseBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING['3xl'],
    paddingVertical: SPACING.md,
    ...SHADOWS.md,
  },

  browseBtnText: {
    color: COLORS.white,
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
  },

  // ─────────────────────────────────────────────
  // VALIDATION HINT — red text, aligned with icon
  // ─────────────────────────────────────────────

  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },

  validationHint: {
    flex: 1,
    color: COLORS.danger,
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
    lineHeight: mScale(20),
  },

  // ─────────────────────────────────────────────
  // START ANALYSIS BUTTON
  // ─────────────────────────────────────────────

  button: {
    height: vScale(60),
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    ...SHADOWS.lg,
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },

  // ─────────────────────────────────────────────
  // FOOTER TEXT
  // ─────────────────────────────────────────────

  hipaaText: {
    textAlign: 'center',
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.sm,
    lineHeight: mScale(22),
    color: COLORS.textSecondary,
  },

  // ─────────────────────────────────────────────
  // MODAL (doctor sheet — unchanged)
  // ─────────────────────────────────────────────

  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },

  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: layout.bottomInset + SPACING['3xl'],
    maxHeight: '75%',
  },

  modalHandle: {
    width: scale(50),
    height: scale(5),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },

  modalTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  modalSubtitle: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
  },

  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },

  doctorRowSelected: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  doctorAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },

  doctorAvatarSelected: {
    backgroundColor: COLORS.primary,
  },

  doctorName: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
  },

  doctorSpecialty: {
    marginTop: scale(2),
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },

  // ─────────────────────────────────────────────
  // ANALYSIS OVERLAY
  // ─────────────────────────────────────────────

  analysisOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },

  analysisCard: {
    width: '100%',
    maxWidth: scale(340),
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING['3xl'],
    alignItems: 'center',
    ...SHADOWS.lg,
  },

  analysisTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },

  analysisSub: {
    textAlign: 'center',
    fontSize: FONTS.sm,
    lineHeight: mScale(22),
    color: COLORS.textSecondary,
  },

  // ─────────────────────────────────────────────
  // SUCCESS MODAL (post-analysis)
  // ─────────────────────────────────────────────

  successOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },

  successCard: {
    width: '100%',
    maxWidth: scale(380),
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.lg,
  },

  successIconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },

  successTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },

  successScanId: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },

  successResultBox: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },

  successResultLabel: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    letterSpacing: 0.5,
    marginBottom: 4,
    opacity: 0.8,
  },

  successResultValue: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },

  successMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.sm,
  },

  successMetaLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
  },

  successMetaValue: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
  },

  successButtonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
    marginTop: SPACING.xl,
  },

  successSecondaryBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },

  successSecondaryBtnText: {
    color: COLORS.textSecondary,
    fontWeight: FONTS.semibold,
    fontSize: FONTS.sm,
  },

  successPrimaryBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },

  successPrimaryBtnText: {
    color: COLORS.white,
    fontWeight: FONTS.bold,
    fontSize: FONTS.sm,
  },

  bonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.md,
    width: '100%',
  },

  bonusBannerText: {
    flex: 1,
    fontSize: FONTS.xs,
    color: COLORS.success,
    fontWeight: FONTS.semibold,
  },

  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fullImage: {
    width: '100%',
    height: '80%',
  },

  closeViewer: {
    position: 'absolute',
    top: layout.topInset ? layout.topInset + SPACING.xl : SPACING.xl,
    right: SPACING.xl,
    zIndex: 99,
  },

});