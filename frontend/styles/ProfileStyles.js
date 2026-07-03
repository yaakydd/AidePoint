import { StyleSheet } from 'react-native';
import { COLORS } from '../assets/theme';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // ── Identity block (Gmail-style, centered) ──
  identityBlock: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  avatarWrap: {
    marginBottom: 14,
  },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS?.primary || '#00CFE8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS?.primary || '#00CFE8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13.5,
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 14,
    textAlign: 'center',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 16,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  manageBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.3,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  manageBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 11.5,
    color: '#B45309',
    fontWeight: '500',
  },

  // Cards / sections
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 13,
    color: '#94A3B8',
    maxWidth: 160,
    marginRight: 4,
  },
  rowSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 64,
  },

  // Plain-text sign out link, Gmail "Sign out of all accounts" style
  signOutRow: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#EF4444',
  },

  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#CBD5E1',
    letterSpacing: 1.2,
    fontWeight: '600',
    paddingTop: 4,
    paddingBottom: 8,
  },
});
