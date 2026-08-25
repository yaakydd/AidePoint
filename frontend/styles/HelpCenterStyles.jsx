import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, scale } from '../assets/theme';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  scrollContent: {
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.xl,
    paddingBottom: layout.bottomInset + SPACING.xl,
  },

 
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING['2xl'],
  },

  introIconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  introTextBlock: {
    flex: 1,
  },

  introTitle: {
    fontSize: FONTS.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.primaryDark,
    marginBottom: 4,
  },

  introSub: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: FONTS.sm * FONTS.normal,
  },

  // ── Section card ──
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING['2xl'],
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.sm,
  },

  cardTitle: {
    fontSize: FONTS.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },

  // ── Row (tappable list item) ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    gap: SPACING.md,
  },

  iconBox: {
    width: scale(38),
    height: scale(38),
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowLabel: {
    flex: 1,
    fontSize: FONTS.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textPrimary,
  },

  rowSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: scale(50),
  },

  // ── FAQ accordion ──
  faqItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },

  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },

  faqQuestionText: {
    flex: 1,
    fontSize: FONTS.sm,
    fontFamily: FONTS.family.semibold,
    color: COLORS.textPrimary,
  },

  faqAnswerText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: FONTS.sm * FONTS.normal,
    marginTop: SPACING.md,
    paddingRight: SPACING.xl,
  },

  // ── App info footer ──
  footerBlock: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },

  footerText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },

  // ── Bug report modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: layout.bottomInset + SPACING.xl,
    ...SHADOWS.lg,
  },

  modalHandle: {
    alignSelf: 'center',
    width: scale(42),
    height: scale(4),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.lg,
  },

  modalTitle: {
    fontSize: FONTS.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },

  modalDescription: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: FONTS.sm * FONTS.normal,
    marginBottom: SPACING.lg,
  },

  bugInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: scale(110),
    textAlignVertical: 'top',
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceAlt,
    marginBottom: SPACING.xl,
  },

  modalButtonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },

  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },

  modalButtonCancel: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  modalButtonSend: {
    backgroundColor: COLORS.primary,
  },

  modalButtonTextCancel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.semibold,
    fontSize: FONTS.sm,
  },

  modalButtonTextSend: {
    color: COLORS.white,
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.sm,
  },
});