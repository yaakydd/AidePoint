const styles = StyleSheet.create({

  // ── Screen ────────────────────────────────────────────────────────────────
  screen: {
    flex:            1,
    backgroundColor: '#F7F8FA',
  },
  loadingScreen: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: '#F7F8FA',
  },

  // ── Top Bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E8EF',
  },
  backButton: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: '#F0F1F5',
    justifyContent:  'center',
    alignItems:      'center',
  },
  screenTitle: {
    flex:          1,
    textAlign:     'center',
    fontSize:      17,
    fontWeight:    '600',
    color:         '#1A1B2E',
    letterSpacing: -0.3,
  },

  // ── Search ────────────────────────────────────────────────────────────────
  searchWrapper: {
    backgroundColor:   '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop:        10,
    paddingBottom:     12,
  },
  searchBar: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#F0F1F5',
    borderRadius:    12,
    paddingHorizontal: 14,
    paddingVertical:   Platform.OS === 'ios' ? 10 : 8,
    gap:             10,
  },
  searchInput: {
    flex:       1,
    fontSize:   14,
    color:      '#1A1B2E',
    padding:    0,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  clearBtn: {
    fontSize: 14,
    color:    '#9799A8',
    padding:  2,
  },

  // ── Filter Pills ──────────────────────────────────────────────────────────
  filterScroll: {
    backgroundColor:   '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E8EF',
    flexGrow:          0,
  },
  filterRow: {
    flexDirection:    'row',
    paddingHorizontal: 16,
    paddingVertical:   10,
    gap:              8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       '#D8DAE5',
    backgroundColor:   '#FFFFFF',
  },
  filterPillActive: {
    backgroundColor: '#1A2F6E',
    borderColor:     '#1A2F6E',
  },
  filterPillText: {
    fontSize:   13,
    fontWeight: '500',
    color:      '#4A4B60',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: {
    padding:       16,
    paddingBottom: 40,
    flexGrow:      1,
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 0.9,
    color:         '#9799A8',
    marginBottom:  12,
    marginLeft:    4,
  },

  // ── Report Card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius:    16,
    borderWidth:     0.5,
    borderColor:     '#E5E8EF',
    padding:         14,
    flexDirection:   'row',
    alignItems:      'center',
    marginBottom:    10,
    gap:             12,
  },
  cardIconWrap: {
    borderRadius: 14,
    overflow:     'hidden',
  },
  cardBody: {
    flex: 1,
    gap:  3,
  },
  cardName: {
    fontSize:      15,
    fontWeight:    '600',
    color:         '#1A1B2E',
    letterSpacing: -0.2,
  },
  cardPatientId: {
    fontSize:   11,
    color:      '#9799A8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardTrailing: {
    alignItems:    'flex-end',
    alignSelf:     'stretch',
    justifyContent:'space-between',
    paddingVertical: 2,
  },
  cardTime: {
    fontSize: 11,
    color:    '#B0B2BE',
  },

  // ── Badge ─────────────────────────────────────────────────────────────────
  badge: {
    flexDirection:  'row',
    alignItems:     'center',
    alignSelf:      'flex-start',
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:   20,
    gap:            5,
    marginTop:      2,
  },
  badgeDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  badgeLabel: {
    fontSize:   11,
    fontWeight: '600',
  },

  // ── Empty State ───────────────────────────────────────────────────────────
  emptyWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize:   16,
    fontWeight: '600',
    color:      '#4A4B60',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize:   13,
    color:      '#9799A8',
    textAlign:  'center',
    lineHeight: 20,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(20, 22, 40, 0.55)',
    justifyContent:  'flex-end',
  },
  modalSheet: {
    backgroundColor:    '#FFFFFF',
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingBottom:      Platform.OS === 'ios' ? 36 : 24,
    maxHeight:          SCREEN_HEIGHT * 0.88,
  },
  modalHandle: {
    width:        36,
    height:       4,
    backgroundColor: '#D8DAE5',
    borderRadius: 2,
    alignSelf:    'center',
    marginTop:    12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       20,
    gap:           14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F1F5',
  },
  modalIconBg: {
    width:          72,
    height:         72,
    borderRadius:   18,
    justifyContent: 'center',
    alignItems:     'center',
    overflow:       'hidden',
  },
  modalPatientName: {
    fontSize:      18,
    fontWeight:    '700',
    color:         '#1A1B2E',
    letterSpacing: -0.3,
    marginBottom:  2,
  },
  modalPatientId: {
    fontSize:   12,
    color:      '#9799A8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 6,
  },
  modalScroll: {
    paddingHorizontal: 20,
    flexGrow:          0,
  },
  modalRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
    paddingVertical:   13,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F1F5',
  },
  modalRowLabel: {
    fontSize:   13,
    color:      '#9799A8',
    fontWeight: '500',
    flex:       1,
  },
  modalRowValue: {
    fontSize:  13,
    color:     '#1A1B2E',
    fontWeight:'500',
    maxWidth:  '58%',
    textAlign: 'right',
    lineHeight: 19,
  },
  modalNotesValue: {
    fontSize:  12,
    lineHeight: 18,
    color:     '#4A4B60',
  },
  closeButton: {
    marginHorizontal: 20,
    marginTop:        16,
    paddingVertical:  15,
    borderRadius:     14,
    backgroundColor:  '#1A2F6E',
    alignItems:       'center',
  },
  closeButtonText: {
    color:         '#FFFFFF',
    fontSize:      15,
    fontWeight:    '600',
    letterSpacing: -0.2,
  },
});