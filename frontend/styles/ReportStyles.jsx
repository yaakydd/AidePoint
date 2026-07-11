import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, SCREEN, layout } from '../assets/theme';

const TAB_BAR_CLEARANCE = layout.tabBarHeight + SPACING.lg;

export const ReportStyles = StyleSheet.create({

  // ─── SCREEN
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ─── HEADER — white background to match the rest of the app's screens
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },

  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  // Visible, branded total count instead of a near-invisible muted grey
  headerCount: {
    fontSize: FONTS.sm,
    color: COLORS.primaryDark,
    fontWeight: FONTS.bold,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },

  // ─── SEARCH (by patient name or ID)
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.pagePad,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
    marginBottom: SPACING.md,
  },

  searchInput: {
    flex: 1,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },

  // ─── FILTER STRIP — plain row, no boxed/bordered wrapper
  filterWrapper: {
    backgroundColor: 'transparent',
    paddingBottom: SPACING.md,
  },

  filterContent: {
    paddingHorizontal: SPACING.pagePad,
    flexDirection: 'row',
    alignItems: 'center',
  },

  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 40,
    marginRight: SPACING.sm,
  },

  // Clearer "selected" state: filled with the app's brand cyan
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  filterText: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
    color: COLORS.textSecondary,
  },

  filterTextActive: {
    color: COLORS.white,
    fontWeight: FONTS.semibold,
  },

  // ─── LIST
  listContent: {
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.xs,
  },

  // ─── CARD
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.divider,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },

  cardBody: {
    flex: 1,
    gap: 4,
  },

  cardName: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
  },

  cardId: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },

  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },

  cardTime: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },

  verifyRow: {
    flexDirection: 'row',
    gap: 4,
  },

  verifyDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },

  // ─── BADGE
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    gap: 6,
    maxWidth: SCREEN.WIDTH * 0.5,
  },

  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  badgeLabel: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semibold,
  },

  // ─── EMPTY STATE
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING['4xl'],
    gap: SPACING.sm,
  },

  emptyTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
  },

  emptySubtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ─── MODAL / DETAIL SHEET
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },

  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: layout.bottomInset + SPACING.lg,
    maxHeight: '90%',
    ...SHADOWS.lg,
  },

  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },

  // ── Report letterhead (AidePoint-branded clinical report look)
  reportHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },

  reportBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  reportBrandLogo: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reportBrandName: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  reportBrandSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },

  reportMetaRight: {
    alignItems: 'flex-end',
  },

  reportMetaLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },

  reportMetaValue: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },

  sheetName: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  sheetId: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },

  sectionHeading: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  detailLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },

  detailValue: {
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    flex: 2,
    textAlign: 'right',
    fontWeight: FONTS.medium,
  },

  detailValueFlagged: {
    color: COLORS.danger,
    fontWeight: FONTS.bold,
  },

  resultBanner: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  resultBannerLabel: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    letterSpacing: 0.6,
    opacity: 0.85,
    marginBottom: 4,
  },

  resultBannerValue: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
  },

  resultBannerMorphology: {
    fontSize: FONTS.sm,
    marginTop: SPACING.sm,
    lineHeight: 19,
    opacity: 0.9,
  },

  verifyCard: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  verifyBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  verifyBadgeLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
  },

  verifyBadgeStatus: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
  },

  // ── Export / download row
  exportRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },

  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  exportBtnText: {
    color: COLORS.primaryDark,
    fontWeight: FONTS.bold,
    fontSize: FONTS.sm,
  },

  closeBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },

  closeBtnText: {
    color: COLORS.white,
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
  },

  disclaimerNote: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.lg,
    lineHeight: 16,
  },
});
