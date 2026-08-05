// styles/CameraStyles.js

import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, SCREEN } from '../assets/theme';

// Circular guide — mirrors the round vignette you see through a microscope
// eyepiece, so the on-screen guide matches what a good capture should
// actually look like.
export const GUIDE_SIZE = Math.min(SCREEN.WIDTH * 0.78, 320);

export const CameraStyles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },

  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
  },

  overlay: {
    justifyContent: 'space-between',
    zIndex: 10,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.xs,
    paddingBottom: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  topTitle: {
    color: COLORS.white,
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.3,
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Circular guide frame ────────────────────────────────────────────────
  guideCentreWrapper: {
    alignItems: 'center',
  },

  guideFrame: {
    width: GUIDE_SIZE,
    height: GUIDE_SIZE,
    borderRadius: GUIDE_SIZE / 2,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  guideFrameInner: {
    width: GUIDE_SIZE - 16,
    height: GUIDE_SIZE - 16,
    borderRadius: (GUIDE_SIZE - 16) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
  },

  guideText: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING['2xl'],
  },

  // ── Capture tips panel ──────────────────────────────────────────────────
  tipsPanel: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 80 : 64,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    zIndex: 30,
    ...SHADOWS.lg,
  },

  tipsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },

  tipsPanelTitle: {
    color: COLORS.white,
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },

  tipNumberCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  tipNumberText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: FONTS.bold,
  },

  tipText: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: FONTS.sm,
    lineHeight: 19,
  },

  // ── Bottom controls ──────────────────────────────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: Platform.OS === 'ios' ? SPACING.lg : SPACING['2xl'],
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING['2xl'],
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  sideBtn: {
    width: 60,
    alignItems: 'center',
  },

  sideBtnLabel: {
    color: COLORS.white,
    fontSize: FONTS.xs,
    marginTop: 4,
  },

  captureBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  captureBtnDisabled: {
    opacity: 0.55,
  },

  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.white,
  },

  // ── Permission screen ────────────────────────────────────────────────────
  permissionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: SPACING['2xl'],
    gap: SPACING.md,
  },

  permissionTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    textAlign: 'center',
  },

  permissionSub: {
    fontSize: FONTS.sm,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },

  permissionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
  },

  permissionBtnText: {
    color: COLORS.white,
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
  },

  cancelLink: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
  },

  cancelLinkText: {
    color: '#64748B',
    fontSize: FONTS.sm,
  },
});