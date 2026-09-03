import { StyleSheet } from 'react-native';
import {
  COLORS, FONTS, SPACING, RADIUS, SHADOWS,
  layout, scale, mScale,
} from '../assets/theme';

// The scrollable content's bottom padding must clear the absolutely-positioned
// footer below it. Deriving it from the footer's own measurements (rather than
// a hardcoded number) keeps the gap consistent across screen sizes and
// platforms, since layout.bottomInset and the scaled padding/button height
// both vary by device.
const FOOTER_BUTTON_HEIGHT = SPACING.lg * 2 + mScale(17) * 1.3; // paddingVertical*2 + approx line height
const FOOTER_HEIGHT =
  SPACING.md +               // footer paddingTop
  FOOTER_BUTTON_HEIGHT +
  layout.bottomInset + SPACING.md; // footer paddingBottom

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: {
    paddingHorizontal: SPACING.pagePad,
    paddingBottom: FOOTER_HEIGHT + SPACING.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: scale(40),
    paddingBottom: SPACING['2xl'],
  },
  iconWrap: {
    width: scale(88),
    height: scale(88),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS['2xl'],
    fontFamily: FONTS.family.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: mScale(22),
  },
  infoCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  infoIconWrap: {
    width: scale(44),
    height: scale(44),
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBody: { flex: 1 },
  infoTitle: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.family.semibold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: mScale(19),
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  toggleLabel: {
    fontSize: FONTS.md,
    fontFamily: FONTS.family.semibold,
    color: COLORS.textPrimary,
  },
  toggleSub: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    lineHeight: mScale(18),
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.md,
    paddingBottom: layout.bottomInset + SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  btn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontFamily: FONTS.family.semibold,
  },
});
