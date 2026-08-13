/**

 * AidePoint Global Theme & Cross-Platform Styling Constants
 *
 * Import anywhere:
 *   import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout } from '../assets/theme';

 */

import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: Screen_Width, height: Screen_Height } = Dimensions.get('window');

// Responsive Scale Helpers 
// Base design width is 390px (iPhone 14). All sizes scale from this.
const Base_Width = 390;

/** Scale a size relative to screen width */
export const scale = (size) => (Screen_Width / Base_Width) * size;

/** Vertical scale - use for heights and vertical spacing */
export const vScale = (size) => (Screen_Height / 844) * size;

/** Moderate scale — use for font sizes (less aggressive than scale) */
export const mScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export const SCREEN = { WIDTH: Screen_Width, HEIGHT: Screen_Height };

//  Colours
export const COLORS = {
  // Brand
  primary:        '#00CFE8',   // AidePoint signature cyan #0BC9DA
  primaryLight:   '#E0F7FA',   // Light cyan
  primaryDark:    '#0097A7',   // Dark cyan

  // Backgrounds
  background:     '#F1F5F9',   // Page background (light blue-grey)
  surface:        '#FFFFFF',   // Cards
  surfaceAlt:     '#F7FAFB',   // Alternate surface

  // Text
  textPrimary:    '#1A2332',   // Dark navy — headings
  textSecondary:  '#6B7C93',   // Subtext / labels
  textMuted:      '#9CA3AF', 
  
  // Placeholder / disabled

  // Status / Conditions
  danger:         '#E53E3E',   // Sickle cell / critical
  dangerBg:       '#FFF5F5',
  warning:        '#D97706',   // Malaria / warning
  warningBg:      '#FFFBEB',
  success:        '#38A169',   // Normal
  successBg:      '#F0FFF4',
  info:           '#3182CE',   // Info
  infoBg:         '#EBF8FF',

  // Misc
  border:         '#E2E8F0',
  divider:        '#EDF2F7',
  overlay:        'rgba(0,0,0,0.45)',
  white:          '#FFFFFF',
  black:          '#000000',
};

//  Typography 
// React Native uses sp units for fonts — mScale ensures readability
// across small Android phones and large iPhones equally.
export const FONTS = {
  // Font family — reference these directly as `fontFamily` in styles
  // (e.g. fontFamily: FONTS.family.bold) since RN doesn't reliably map
  // fontWeight onto custom-loaded font files the way it does system
  // fonts. The plain regular/medium/semibold/bold string tokens below
  // are kept for any remaining legacy `fontWeight: FONTS.bold` usage.
  family: {
    regular:  'Inter_400Regular',
    medium:   'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold:     'Inter_700Bold',
  },

  // Sizes
  xs:   mScale(11),
  sm:   mScale(13),
  md:   mScale(15),
  lg:   mScale(17),
  xl:   mScale(20),
  '2xl': mScale(24),
  '3xl': mScale(28),
  '4xl': mScale(34),

  // Weights (Android needs string values, iOS uses numeric)
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',

  // Line heights
  tight:  1.2,
  normal: 1.5,
  loose:  1.8,
};

// Spacing 
export const SPACING = {
  xs:   scale(4),
  sm:   scale(8),
  md:   scale(12),
  lg:   scale(16),
  xl:   scale(20),
  '2xl': scale(24),
  '3xl': scale(32),
  '4xl': scale(40),
  '5xl': scale(48),

  // Page padding — consistent horizontal inset across all screens
  pagePad: scale(20),
};

//  Border Radius 
export const RADIUS = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  full: 9999,
};

//  Shadows 
// Android uses elevation; iOS uses shadow* props.
// These objects spread directly onto a style.
export const SHADOWS = {
  none: {},

  sm: Platform.select({
    ios: {
      shadowColor: '#1A2332',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
  }),

  md: Platform.select({
    ios: {
      shadowColor: '#1A2332',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
  }),

  lg: Platform.select({
    ios: {
      shadowColor: '#1A2332',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
    android: { elevation: 8 },
  }),
};

// Layout Helpers 
// Use these instead of hardcoded values for safe areas.
export const layout = {
  // iOS has a notch/Dynamic Island + home indicator.
  // Android has a status bar. Both handled here.
  statusBarHeight: Platform.select({
    ios: 0,          // iOS: use SafeAreaView — it handles this automatically
    android: StatusBar.currentHeight ?? 24,
  }),

  // Bottom nav / home indicator clearance
  bottomInset: Platform.select({
    ios: 34,         // Home indicator height on Face ID iPhones
    android: 0,      // Android handles this via navigationBarHeight or nothing
  }),

  // Tab bar total height (your bottom nav)
  tabBarHeight: Platform.select({
    ios: 83,         // 49px bar + 34px home indicator
    android: 60,
  }),

  isSmallScreen: Screen_Width < 375,   // iPhone SE, small Androids
  isLargeScreen: Screen_Width > 414,   // Plus/Max iPhones, large Androids
};

// Condition Badge Config
// Centralised — used in HomeScreen, ReportsScreen, ScanScreen
export const CONDITION_STYLES = {
  sickle_cell: { label: 'SICKLE CELL DETECTED', color: COLORS.danger, bg: COLORS.dangerBg  },
  iron_deficiency:{ label: 'IRON DEFICIENCY', color: COLORS.warning, bg: COLORS.warningBg },
  malaria: { label: 'MALARIA DETECTED', color: COLORS.warning, bg: COLORS.warningBg },
  thalassemia: { label: 'THALASSEMIA', color: COLORS.danger, bg: COLORS.dangerBg },
  pernicious: { label: 'PERNICIOUS ANAEMIA', color: COLORS.info, bg: COLORS.infoBg },
  megaloblastic: { label: 'MEGALOBLASTIC', color: COLORS.info, bg: COLORS.infoBg },
  aplastic: { label: '! APLASTIC — CRITICAL', color: COLORS.danger, bg: COLORS.dangerBg },
  hemolytic: { label: 'HAEMOLYTIC', color: COLORS.warning, bg: COLORS.warningBg },
  normal: { label: 'NORMAL', color: COLORS.success, bg: COLORS.successBg },
  unknown: { label: 'UNKNOWN', color: COLORS.textSecondary, bg: COLORS.surfaceAlt },

};


// Header Layout 
// Single source of truth for header sizing/spacing, so every screen's
// header — whether it's HomeScreen's avatar+greeting header or a
// back-arrow+title header like Scan/Profile — has identical height,
// padding, and touch-target sizes. Screens should import these instead
// of hardcoding their own header padding/heights in their local
// StyleSheet, which is how HomeStyles/ScanStyles/ProfileStyles drifted
// out of sync in the first place.
export const HEADER = {
  // Horizontal inset — same as page content padding, so the header's
  // edges line up with the screen body below it.
  paddingHorizontal: SPACING.pagePad,

  // Vertical padding above/below header content.
  paddingVertical: SPACING.md,

  // Standard tappable icon size for back buttons, bell icons, etc.
  // (matches HomeStyles.notificationButton)
  iconTouchTarget: 44,

  // Standard icon glyph size inside a touch target (back arrow, bell)
  iconSize: 22,

  // Avatar circle size + radius (matches HomeStyles.avatar)
  avatarSize: 48,
  avatarRadius: 24,

  // Gap between an icon/avatar and the title/greeting text next to it New Color:  rgb(51, 203, 213)
  contentGap: SPACING.sm,
};