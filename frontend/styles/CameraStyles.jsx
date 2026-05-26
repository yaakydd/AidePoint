// styles/CameraStyles.js

import {
  StyleSheet,
  Platform,
} from 'react-native';

import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  layout,
  SCREEN,
} from '../assets/theme';

export const FRAME_SIZE = SCREEN.WIDTH * 0.78;

export const CameraStyles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },

  blank: {
    flex: 1,
    backgroundColor: COLORS.black,
  },

  camera: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
  },

  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 18,
    left: 0,
    right: 0,
    zIndex: 50,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: SPACING.lg,
  },

  topBarTitle: {
    color: COLORS.white,
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,

    backgroundColor: 'rgba(0,0,0,0.45)',

    justifyContent: 'center',
    alignItems: 'center',
  },

  instructionBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 85,
    alignSelf: 'center',

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,

    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: RADIUS.full,
    gap: SPACING.sm,
  },

  instructionText: {
    color: COLORS.white,
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
  },

  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,

    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.xl,

    justifyContent: 'center',
    alignItems: 'center',
  },

  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },

  zoomBadge: {
    position: 'absolute',
    bottom: -50,

    backgroundColor: 'rgba(0,0,0,0.5)',

    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,

    borderRadius: RADIUS.full,
  },

  zoomText: {
    color: COLORS.white,
    fontWeight: FONTS.bold,
  },

  statusRow: {
    position: 'absolute',
    bottom: 145,

    width: '100%',

    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,

    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: RADIUS.full,
  },

  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 999,

    marginRight: SPACING.sm,

    backgroundColor: COLORS.success,
  },

  statusText: {
    color: COLORS.white,
    fontSize: FONTS.xs,
    fontWeight: FONTS.medium,
  },

  shutterBar: {
    position: 'absolute',

    bottom: layout.tabBarHeight + 40,

    width: '100%',
    alignItems: 'center',
  },

  shutterRing: {
    width: 84,
    height: 84,
    borderRadius: 999,

    borderWidth: 4,
    borderColor: COLORS.white,

    justifyContent: 'center',
    alignItems: 'center',
  },

  shutterDisc: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },

  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.white,
  },

  previewImage: {
    flex: 1,
  },

  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',

    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  previewHeader: {
    paddingTop: 70,
    paddingHorizontal: SPACING.xl,
  },

  previewTitle: {
    color: COLORS.white,
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    marginBottom: SPACING.sm,
  },

  previewSubtitle: {
    color: COLORS.white,
    fontSize: FONTS.sm,
    lineHeight: 22,
  },

  previewBottom: {
    flexDirection: 'row',

    paddingHorizontal: SPACING.xl,

    paddingBottom: layout.tabBarHeight + 30,

    gap: SPACING.md,
  },

  retakeButton: {
    flex: 1,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    paddingVertical: SPACING.lg,

    backgroundColor: 'rgba(255,255,255,0.2)',

    borderRadius: RADIUS.lg,
  },

  confirmButton: {
    flex: 1,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    paddingVertical: SPACING.lg,

    backgroundColor: COLORS.primaryDark,

    borderRadius: RADIUS.lg,
  },

  actionText: {
    color: COLORS.white,
    fontWeight: FONTS.semibold,
    marginLeft: SPACING.sm,
  },

  permissionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: COLORS.background,

    paddingHorizontal: SPACING['2xl'],
  },

  permissionIcon: {
    width: 90,
    height: 90,
    borderRadius: 999,

    backgroundColor: COLORS.surface,

    justifyContent: 'center',
    alignItems: 'center',

    marginBottom: SPACING.xl,

    ...SHADOWS.sm,
  },

  permissionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,

    marginBottom: SPACING.sm,
  },

  permissionSub: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,

    marginBottom: SPACING.xl,
  },

  permissionBtn: {
    backgroundColor: COLORS.primaryDark,

    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.lg,

    borderRadius: RADIUS.lg,
  },

  permissionBtnText: {
    color: COLORS.white,
    fontWeight: FONTS.semibold,
  },

});