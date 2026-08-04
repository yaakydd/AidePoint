// styles/HelpCenterStyles.js
import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, scale } from '../assets/theme';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },

  headerTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  scrollContent: {
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.lg,
    paddingBottom: layout.tabBarHeight + SPACING.xl,
  },

  // ── Intro banner ──
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },

  introIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  introTextBlock: {
    flex: 1,
  },

  introTitle: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.primaryDark,
    marginBottom: 2,
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
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.sm,
  },

  cardTitle: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },

  // ── Row (tappable list item) ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    gap: SPACING.md,
  },

  iconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowLabel: {
    flex: 1,
    fontSize: FONTS.md,
    fontWeight: FONTS.medium,
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
    marginLeft: scale(48),
  },

  // ── FAQ accordion ──
  faqItem: {
    paddingVertical: SPACING.sm,
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
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
  },

  faqAnswerText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: FONTS.sm * FONTS.normal,
    marginTop: SPACING.sm,
    paddingRight: SPACING.xl,
  },

  // ── App info footer ──
  footerBlock: {
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: 2,
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
    padding: SPACING.lg,
    paddingBottom: layout.bottomInset + SPACING.lg,
    ...SHADOWS.lg,
  },

  modalHandle: {
    alignSelf: 'center',
    width: scale(42),
    height: scale(4),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },

  modalTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  modalDescription: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: FONTS.sm * FONTS.normal,
    marginBottom: SPACING.md,
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
    marginBottom: SPACING.lg,
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
    fontWeight: FONTS.semibold,
    fontSize: FONTS.sm,
  },

  modalButtonTextSend: {
    color: COLORS.white,
    fontWeight: FONTS.bold,
    fontSize: FONTS.sm,
  },
});