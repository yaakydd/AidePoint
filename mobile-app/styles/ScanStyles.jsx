// styles/ScanStyles.js
//
// AidePoint Scan Screen Styling
//
// Matches the modern cyan healthcare UI
// shown in the design reference.

import { StyleSheet } from 'react-native';

import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../assets/theme';

export const scanStyles = StyleSheet.create({

  // ROOT

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scroll: {
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.lg,
  },

  // HEADER

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },

  backButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  // SCAN ID

  scanIdCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  scanIdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  scanIdLabel: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },

  scanIdValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // SECTIONS

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // INPUTS

  inputLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },

  input: {
    height: 54,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BDECF2',
    paddingHorizontal: 16,
    marginBottom: 18,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  half: {
    flex: 1,
  },

  // DOCTOR SELECTOR

  selectorButton: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BDECF2',
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  selectorText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  // CAMERA BUTTON

  takePictureBtn: {
    height: 58,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginBottom: 18,
  },

  takePictureText: {
    marginLeft: 10,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // UPLOAD CARD

  uploadCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#A5F3FC',
    backgroundColor: '#ECFEFF',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 18,
  },

  uploadIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: '#CFFAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  uploadSub: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },

  browseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  browseBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // IMAGE PREVIEW

  previewBox: {
    marginBottom: 20,
  },

  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
  },

  retakeBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },

  retakeText: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // VALIDATION

  validationHint: {
    color: COLORS.warning,
    marginBottom: 16,
    lineHeight: 22,
  },

  // BUTTON

  button: {
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...SHADOWS.md,
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // FOOTER TEXT

  hipaaText: {
    textAlign: 'center',
    marginTop: 18,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 40,
  },
});