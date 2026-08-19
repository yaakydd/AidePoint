import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: Screen_Width, height: Screen_Height } = Dimensions.get('window');

const Base_Width = 390;

export const scale = (size) => (Screen_Width / Base_Width) * size;

export const vScale = (size) => (Screen_Height / 844) * size;

export const mScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export const SCREEN = { WIDTH: Screen_Width, HEIGHT: Screen_Height };

export const COLORS = {
  primary:        '#00CFE8',
  primaryLight:   '#E0F7FA',
  primaryDark:    '#0097A7',

  brand:      '#00E6E6', 
  brandDark:  '#007373', 
  brandLight: '#E0FBFB', 

  background:     '#F1F5F9',
  surface:        '#FFFFFF',
  surfaceAlt:     '#F7FAFB',

  textPrimary:    '#1A2332',
  textSecondary:  '#6B7C93',
  textMuted:      '#9CA3AF',

  danger:         '#E53E3E',
  dangerBg:       '#FFF5F5',
  warning:        '#D97706',
  warningBg:      '#FFFBEB',
  success:        '#38A169',
  successBg:      '#F0FFF4',
  info:           '#3182CE',
  infoBg:         '#EBF8FF',

  border:         '#E2E8F0',
  divider:        '#EDF2F7',
  overlay:        'rgba(0,0,0,0.45)',
  white:          '#FFFFFF',
  black:          '#000000',
};

export const FONTS = {
  family: {
    regular:  'Inter_400Regular',
    medium:   'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold:     'Inter_700Bold',
  },

  xs:   mScale(11),
  sm:   mScale(13),
  md:   mScale(15),
  lg:   mScale(17),
  xl:   mScale(20),
  '2xl': mScale(24),
  '3xl': mScale(28),
  '4xl': mScale(34),

  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',

  tight:  1.2,
  normal: 1.5,
  loose:  1.8,
};

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

  pagePad: scale(20),
};

export const RADIUS = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  full: 9999,
};

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

export const layout = {
  statusBarHeight: Platform.select({
    ios: 0,
    android: StatusBar.currentHeight ?? 24,
  }),

  bottomInset: Platform.select({
    ios: 34,
    android: 0,
  }),

  tabBarHeight: Platform.select({
    ios: 83,
    android: 60,
  }),

  isSmallScreen: Screen_Width < 375,
  isLargeScreen: Screen_Width > 414,
};

export const CONDITION_STYLES = {
  anemic:  { label: 'ANEMIC',  color: COLORS.danger,        bg: COLORS.dangerBg },
  healthy: { label: 'HEALTHY', color: COLORS.success,       bg: COLORS.successBg },
  unknown: { label: 'UNKNOWN', color: COLORS.textSecondary, bg: COLORS.surfaceAlt },
};

export const HEADER = {
  paddingHorizontal: SPACING.pagePad,
  paddingVertical: SPACING.md,

  height: SPACING.md * 2 + 44,

  backgroundColor: COLORS.surface,
  borderBottomWidth: 0,
  borderBottomColor: COLORS.border,
  shadow: SHADOWS.sm,

  iconTouchTarget: 44,
  iconSize: 22,

  avatarSize: 48,
  avatarRadius: 24,

  contentGap: SPACING.sm,
};
