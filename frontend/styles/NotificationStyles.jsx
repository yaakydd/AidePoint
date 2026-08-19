import { StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../assets/theme';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  headerTitle: { 
    fontSize: FONTS.xl, 
    fontWeight: FONTS.bold, 
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  markAllText: { 
    fontSize: FONTS.xs, 
    fontWeight: FONTS.semibold, 
    color: COLORS.primaryDark 
  },

  listContent: { 
    paddingVertical: SPACING.sm 
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  rowUnread: { 
    backgroundColor: COLORS.primaryLight 
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: { 
    fontSize: FONTS.sm, 
    fontWeight: FONTS.semibold, 
    color: COLORS.textPrimary 
  },
  body:  { 
    fontSize: FONTS.sm, 
    color: COLORS.textSecondary, 
    marginTop: 2 
  },
  time:  { 
    fontSize: FONTS.xs, 
    color: COLORS.textMuted, 
    marginTop: SPACING.xs 
  },

  unreadDot: {
    width: 8, 
    height: 8, 
    borderRadius: 4,
    backgroundColor: COLORS.primary, 
    marginTop: 4,
  },

  centerFill: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: SPACING['2xl'] 
  },
  emptyText: { 
    fontSize: FONTS.md, 
    fontWeight: FONTS.semibold, 
    color: COLORS.textPrimary, 
    marginTop: SPACING.md 
  },
  emptySub:  { 
    fontSize: FONTS.sm, 
    color: COLORS.textMuted, 
    marginTop: SPACING.xs, 
    textAlign: 'center' 
  },
});