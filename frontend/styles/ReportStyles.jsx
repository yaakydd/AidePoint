import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, SCREEN, layout } from '../assets/theme';

const TAB_BAR_CLEARANCE = layout.tabBarHeight + SPACING.lg;

export const ReportStyles = StyleSheet.create({

  // ─── SCREEN
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ─── HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },

  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },

  headerCount: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },

  // ─── SEARCH
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
  },

  // ─── FILTERS
  // ─── FILTER STRIP (FIXED LAYOUT)
  // ─── FILTER WRAPPER (KEY FIX)
  filterWrapper: {
    backgroundColor: COLORS.background,

    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.md,

    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,

    // makes it feel like a real sticky toolbar
    ...SHADOWS.sm,
    zIndex: 10,
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

    paddingHorizontal: SPACING.lg,   // 🔥 bigger
    paddingVertical: 10,             // 🔥 bigger

    borderRadius: RADIUS.full,

    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,

    height: 40, // 🔥 bigger touch target

    marginRight: SPACING.sm,
  },

  filterPillActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },

  filterText: {
    fontSize: FONTS.sm,   // 🔥 bigger text
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

  // ─── MODAL / SHEET
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
});