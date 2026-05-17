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
//
// This ensures:
// ✓ iPhone compatibility
// ✓ Android compatibility
// ✓ Tablet responsiveness
// ✓ Proper spacing on small screens
// ✓ Consistent UI across the entire app

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
    paddingTop: SPACING.lg,
  },

  // ─────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    marginRight: SPACING.md,
  },

  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  resetButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.dangerBg,
  },

  resetText: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.danger,
  },

  // ─────────────────────────────────────────────
  // SCAN ID CARD
  // ─────────────────────────────────────────────

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
    marginBottom: SPACING.xl,
  },

  scanIdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  scanIdLabel: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },

  scanIdValue: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
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

  half: {
    flex: 1,
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

  retakeText: {
    marginTop: SPACING.md,
    textAlign: 'center',
    color: COLORS.primary,
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
  },

  retakeText: {
    color: COLORS.white,
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
  // VALIDATION HINT
  // ─────────────────────────────────────────────

  validationHint: {
    color: COLORS.warning,
    fontSize: FONTS.sm,
    marginBottom: SPACING.lg,
    lineHeight: mScale(20),
  },

    validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
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
  // MODAL
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

    paddingBottom:
      layout.bottomInset + SPACING['3xl'],

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

  // ─────────────────────────────────────────────
  // DOCTOR ROWS
  // ─────────────────────────────────────────────

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

    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

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
    top: layout.topInset + SPACING.xl,
    right: SPACING.xl,
    zIndex: 99,
  },

});