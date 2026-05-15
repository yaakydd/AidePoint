// styles/ScanStyles.js

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

// ─── SCAN SCREEN STYLES ─────────────────────────────────────────────────────
// Fully responsive using your global theme system.
//
// Why this fits all Android + iOS screens:
//
// 1. Uses scale(), vScale(), mScale()
//    → automatically adapts spacing and sizing to screen size.
//
// 2. Uses layout helpers
//    → respects notches, safe areas, tab bars, Dynamic Island.
//
// 3. Uses flexbox instead of fixed widths
//    → adapts to small phones + large tablets.
//
// 4. Uses theme constants only
//    → consistent UI across the entire app.
//
// 5. No hardcoded pixel-heavy layouts
//    → prevents overflow on small Android devices.
//

export const scanStyles = StyleSheet.create({

  // ─── ROOT ────────────────────────────────────────────────────────────────

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scroll: {
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.lg,
  },

  // ─── HEADER ──────────────────────────────────────────────────────────────

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  title: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  resetText: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.danger,
  },

  // ─── SCAN ID ─────────────────────────────────────────────────────────────

  scanBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },

  scanLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },

  scanId: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },

  // ─── INPUTS ──────────────────────────────────────────────────────────────

  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: Platform.select({
      ios: SPACING.lg,
      android: SPACING.md,
    }),
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },

  half: {
    flex: 1,
    minWidth: 0,
  },

  // ─── DOCTOR SELECTOR ─────────────────────────────────────────────────────

  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },

  selectorIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },

  selectorPlaceholder: {
    fontSize: FONTS.md,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },

  selectorValue: {
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
    fontWeight: FONTS.bold,
  },

  selectorSub: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // ─── CAMERA BUTTON ───────────────────────────────────────────────────────

  cameraButton: {
    height: vScale(150),
    borderRadius: RADIUS['2xl'],
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },

  cameraText: {
    marginTop: SPACING.sm,
    fontSize: FONTS.md,
    color: COLORS.primaryDark,
    fontWeight: FONTS.semibold,
    textAlign: 'center',
  },

  // ─── IMAGE PREVIEW ───────────────────────────────────────────────────────

  previewBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },

  previewImage: {
    width: '100%',
    height: vScale(layout.isSmallScreen ? 180 : 220),
  },

  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
  },

  previewText: {
    marginLeft: SPACING.xs,
    fontSize: FONTS.sm,
    color: COLORS.success,
    fontWeight: FONTS.semibold,
  },

  retakeBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
  },

  retakeText: {
    fontSize: FONTS.sm,
    color: COLORS.primaryDark,
    fontWeight: FONTS.semibold,
  },

  // ─── VALIDATION ──────────────────────────────────────────────────────────

  validationHint: {
    fontSize: FONTS.sm,
    color: COLORS.warning,
    marginTop: scale(-4),
    marginBottom: SPACING.md,
    lineHeight: mScale(20),
  },

  // ─── BUTTON ──────────────────────────────────────────────────────────────

  button: {
    height: vScale(56),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.white,
  },

  // ─── COMPLIANCE TEXT ─────────────────────────────────────────────────────

  hipaaText: {
    textAlign: 'center',
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    lineHeight: mScale(18),
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },

  // ─── MODAL ───────────────────────────────────────────────────────────────

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
    paddingTop: SPACING.md,
    paddingBottom: layout.bottomInset + SPACING.xl,
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
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    lineHeight: mScale(20),
  },

  // ─── DOCTOR ROW ──────────────────────────────────────────────────────────

  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },

  doctorRowSelected: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
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
    backgroundColor: COLORS.primaryDark,
  },

  doctorName: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
  },

  doctorSpecialty: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // ─── ANALYSIS OVERLAY ────────────────────────────────────────────────────

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
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: mScale(22),
    textAlign: 'center',
  },

});