import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, SCREEN, layout, scale } from '../assets/theme';

// Shared, theme-derived bottom clearance for the report list, so it
// scales with the actual tab bar height on this device rather than a
// hardcoded guess -- exported so ReportScreen.js can use the same value
// instead of keeping its own separate hardcoded constant.
export const REPORT_LIST_BOTTOM_CLEARANCE = layout.tabBarHeight + SPACING.lg;

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
    // FIXED: back to a small fixed gap. The previous layout.statusBarHeight
    // approach assumed SafeAreaView's top edge was excluded, but
    // layout.statusBarHeight is hardcoded to 0 on iOS specifically
    // because SafeAreaView is supposed to own that inset -- with 'top'
    // excluded, nothing accounted for the notch on iOS and the header
    // rendered underneath the status bar. SafeAreaView now handles the
    // real per-device top inset (edges includes 'top' again in
    // ReportScreen.js); this is just the small breathing-room gap below
    // that inset, not a substitute for it.
    paddingTop: SPACING.sm,
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
    marginTop: SPACING.md,
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
    height: scale(40),
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
  // FIXED: paddingHorizontal removed. This container wraps everything
  // inside the FlatList -- header, search bar, filters, AND every card
  // -- so its own horizontal padding was adding an extra inset on top
  // of whatever the header's own paddingHorizontal already applied,
  // which is why the header's white background could never actually
  // reach the true left/right screen edges no matter what the header
  // style itself said. Horizontal spacing now lives only on the things
  // that should actually be inset (card, below) -- the header and
  // search bar each control their own spacing directly and are no
  // longer nested inside a second padded box.
  listContent: {
    paddingTop: SPACING.xs,
  },

  // ─── CARD
  // FIXED: marginHorizontal added -- previously this inset came for
  // free from listContent's paddingHorizontal (now removed, see above),
  // so cards need to carry their own spacing now that the shared
  // container is edge-to-edge.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.pagePad,
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

  // FIXED: wrapped in scale() -- these were the last hardcoded raw
  // pixel dimensions left in this file (everything else already used
  // SPACING/FONTS/RADIUS, which are themselves scale()-derived), so
  // small UI elements like this dot were the one thing not actually
  // scaling with screen size across different devices.
  verifyDot: {
    width: scale(7),
    height: scale(7),
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
    width: scale(6),
    height: scale(6),
    borderRadius: 3,
  },

  badgeLabel: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semibold,
  },

  // ─── EMPTY STATE
  // FIXED: paddingHorizontal added for the same reason as card above --
  // this text is no longer automatically inset by listContent.
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING['4xl'],
    paddingHorizontal: SPACING.pagePad,
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
    width: scale(42),
    height: scale(4),
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
    width: scale(36),
    height: scale(36),
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