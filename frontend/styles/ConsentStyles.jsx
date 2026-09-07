import { StyleSheet } from 'react-native';
import {
  COLORS, FONTS, SPACING, RADIUS, SHADOWS,
  layout, scale, mScale,
} from '../assets/theme';

// The scrollable content's bottom padding must clear the absolutely-positioned
// footer below it. Deriving it from the footer's own measurements (rather than
// a hardcoded number) keeps the gap consistent across screen sizes.
const FOOTER_BUTTON_HEIGHT = SPACING.lg * 2 + mScale(17) * 1.3; // paddingVertical*2 + approx line height

// ConsentScreen has no tab bar (it's shown before the main app nav even
// mounts), so unlike tab-bar screens it can't reuse getTabBarHeight(insets)
// there's no tab bar height to add. It still needs the REAL device
// bottom inset though, not the hardcoded layout.bottomInset guess (iOS 34 /
// Android 0) the static styles below used to use, which meant the footer
// under-padded on any device whose actual inset is bigger than that guess
// (e.g. Android 3-button/gesture nav, which is never 0) -- the Continue
// button ends up positioned under the system nav bar / off the visible
// content, unreachable. Call this from the screen with useSafeAreaInsets()'s
// real insets.bottom instead of relying on the module-load-time constant.
export function getConsentFooterMetrics(insetBottom = 0) {
  const footerPaddingBottom = insetBottom + SPACING.md;
  const footerHeight = SPACING.md + FOOTER_BUTTON_HEIGHT + footerPaddingBottom;
  return { footerPaddingBottom, footerHeight };
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: {
    paddingHorizontal: SPACING.pagePad,
    // Base padding for the default/static case; ConsentScreen overrides
    // this inline with getConsentFooterMetrics(insets.bottom).footerHeight
    // once real safe-area insets are available.
    paddingBottom: getConsentFooterMetrics().footerHeight + SPACING.xl,
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
    paddingTop: SPACING.sm,
    // Keep the safe-area inset, but trim a bit of the footer spacing so the
    // primary button sits a little higher and feels more visually centered.
    paddingBottom: Math.max(getConsentFooterMetrics().footerPaddingBottom - SPACING.sm, 0),
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
  btnDisabled: { 
    opacity: 0.65
  },
  btnText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontFamily: FONTS.family.semibold,
  },
});
