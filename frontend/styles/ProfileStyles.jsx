// styles/ProfileStyles.js
import { StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, scale, mScale } from '../assets/theme';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  scrollContent: {
    paddingBottom: SPACING['4xl'],
  },

  // ── Identity block (Gmail-style, centered) ──
  identityBlock: {
    alignItems: 'center',
    paddingTop: SPACING['3xl'],
    paddingBottom: SPACING['2xl'],
    paddingHorizontal: SPACING['2xl'],
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  avatarWrap: {
    marginBottom: SPACING.lg,
  },
  avatarCircle: {
    width: scale(92),
    height: scale(92),
    borderRadius: scale(46),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarInitials: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: scale(46),
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
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
  userName: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  userRole: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  tierPillText: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
  },
  manageBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1.3,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  manageBtnText: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
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
