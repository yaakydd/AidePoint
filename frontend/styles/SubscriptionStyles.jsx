// styles/SubscriptionStyles.js
import { StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, scale } from '../assets/theme';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

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
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },

  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING['4xl'] },

  intro: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg + 2,
    marginBottom: SPACING.lg,
    position: 'relative',
    ...SHADOWS.sm,
  },

  cardCurrent: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    ...SHADOWS.md,
  },

  cardLocked: {
    backgroundColor: COLORS.surfaceAlt,
    opacity: 0.85,
  },

  currentBadge: {
    position: 'absolute',
    top: -10,
    right: SPACING.lg,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  comingSoonBadge: {
    position: 'absolute',
    top: -10,
    right: SPACING.lg,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.textMuted,
  },
  comingSoonBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md + 2,
  },
  planIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  planIconLocked: {
    backgroundColor: COLORS.border,
  },
  planName: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  planNameLocked: { color: COLORS.textSecondary },
  planPrice: { fontSize: FONTS.sm, fontWeight: FONTS.semibold, marginTop: 1, color: COLORS.primaryDark },
  planPriceLocked: { color: COLORS.textMuted },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  featureText: { fontSize: FONTS.sm, color: COLORS.textPrimary, flex: 1 },
  featureTextLocked: { color: COLORS.textMuted },

  actionBtn: {
    marginTop: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm + 2,
    alignItems: 'center',
  },
  actionBtnActive: { backgroundColor: COLORS.primary },
  actionBtnDisabled: { backgroundColor: COLORS.surfaceAlt },
  actionBtnText: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.white },
  actionBtnTextDisabled: { color: COLORS.textMuted },

  footnote: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
    lineHeight: 17,
  },
});