import { StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, scale, mScale } from '../assets/theme';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  headerTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  scrollContent: {
    paddingBottom: SPACING['4xl'],
  },

// ── Identity block (avatar left, info right) ──
identityBlock: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: SPACING.xl,
  marginHorizontal: SPACING.lg,
  marginTop: SPACING.lg,
  marginBottom: SPACING.lg,
  backgroundColor: COLORS.surface,
  borderRadius: RADIUS.xl,
  ...SHADOWS.sm,
},
avatarWrap: {
  marginRight: SPACING.lg,
},
avatarRing: {
  width: scale(84),
  height: scale(84),
  borderRadius: scale(42),
  borderWidth: 2,
  borderColor: COLORS.primaryLight,
  justifyContent: 'center',
  alignItems: 'center',
},
avatarCircle: {
  width: scale(74),
  height: scale(74),
  borderRadius: scale(37),
  backgroundColor: COLORS.primary,
  justifyContent: 'center',
  alignItems: 'center',
  ...SHADOWS.md,
},
avatarInitials: {
  fontSize: FONTS.xl,
  fontWeight: FONTS.bold,
  color: COLORS.white,
  letterSpacing: 1,
},
avatarImage: {
  width: '100%',
  height: '100%',
  borderRadius: scale(37),
},
avatarBadge: {
  position: 'absolute',
  bottom: -2,
  right: -2,
  width: scale(24),
  height: scale(24),
  borderRadius: scale(12),
  backgroundColor: COLORS.primaryDark,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: COLORS.surface,
},
identityInfo: {
  flex: 1,
},
userName: {
  fontSize: FONTS.lg,
  fontWeight: FONTS.bold,
  color: COLORS.textPrimary,
  marginBottom: 2,
},
userEmail: {
  fontSize: FONTS.sm,
  color: COLORS.textSecondary,
  marginBottom: SPACING.xs,
},
userRole: {
  fontSize: FONTS.xs,
  color: COLORS.textMuted,
  fontWeight: FONTS.medium,
  marginBottom: SPACING.sm,
},
identityMetaRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: SPACING.sm,
},
tierPill: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: SPACING.xs,
  paddingHorizontal: SPACING.sm + 2,
  paddingVertical: 5,
  borderRadius: RADIUS.full,
  borderWidth: 1,
},
tierPillText: {
  fontSize: FONTS.xs,
  fontWeight: FONTS.bold,
},
manageBtn: {
  paddingHorizontal: SPACING.md,
  paddingVertical: 5,
  borderRadius: RADIUS.full,
  backgroundColor: COLORS.primary,
  ...SHADOWS.sm,
},
manageBtnText: {
  fontSize: FONTS.xs,
  fontWeight: FONTS.bold,
  color: COLORS.white,
},

  // Cards / sections
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md + 2,
    paddingBottom: SPACING.xs,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 1,
    gap: SPACING.md,
  },
  iconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: RADIUS.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
    fontWeight: FONTS.medium,
  },
  rowValue: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    maxWidth: scale(160),
    marginRight: SPACING.xs,
  },
  rowSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: scale(64),
  },

  // Plain-text sign out link, Gmail "Sign out of all accounts" style
  signOutRow: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  signOutText: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
    color: COLORS.danger,
  },

  version: {
    textAlign: 'center',
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    fontWeight: FONTS.semibold,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
});
