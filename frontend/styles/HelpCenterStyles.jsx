// styles/HelpCenterStyles.js
import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, scale } from '../assets/theme';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // FIXED: header was reading small/cramped -- paddingTop bumped up
  // (matches the amount of breathing room ReportStyles.js gives its own
  // header, SPACING.sm was barely anything), title bumped from FONTS.lg
  // to FONTS.xl with bold weight to actually read as a screen title
  // rather than a label, and a marginBottom added so the header has
  // clear separation from the intro card below it instead of the two
  // basically touching.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.xs,
    ...SHADOWS.sm,
  },

  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  scrollContent: {
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.xl,
    paddingBottom: layout.tabBarHeight + SPACING.xl,
  },

  // ── Intro banner ──
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
    fontWeight: FONTS.bold,
    color: COLORS.primaryDark,
    marginBottom: 4,
  },

  introSub: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: FONTS.sm * FONTS.normal,
  },

  // ── Section card ──
  // FIXED: internal padding SPACING.md -> SPACING.lg, gap between cards
  // SPACING.lg -> SPACING['2xl'] -- the old values made every section
  // feel like it was crowding the next one, especially noticeable
  // between GET HELP and FAQ.
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
    fontWeight: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },

  // ── Row (tappable list item) ──
  // FIXED: vertical padding SPACING.sm -> SPACING.md so each row has
  // more tap-friendly height and doesn't feel squeezed against its
  // divider.
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
    marginLeft: scale(50),
  },

  // ── FAQ accordion ──
  // FIXED: same vertical padding bump as `row`, plus a touch more
  // spacing above the answer text when expanded so it doesn't feel
  // glued to the question.
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
    fontWeight: FONTS.semibold,
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
    fontWeight: FONTS.bold,
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
    fontWeight: FONTS.semibold,
    fontSize: FONTS.sm,
  },

  modalButtonTextSend: {
    color: COLORS.white,
    fontWeight: FONTS.bold,
    fontSize: FONTS.sm,
  },
});