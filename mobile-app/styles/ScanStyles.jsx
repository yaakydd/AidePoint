// styles/ScanStyles.js
// Complete styles for Scan.js.
// All styles that were missing and causing crashes have been added.

import { StyleSheet, Platform } from 'react-native';

export const scanStyles = StyleSheet.create({

  // ── LAYOUT
  container: {
    flex: 1,
    backgroundColor: '#F5F8F8',
  },
  scroll: {
    padding: 20,
  },

  // ── HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  // "Reset" link in the header — red to signal destructive action
  resetText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },

  // ── SCAN ID BOX
  scanBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  scanLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  scanId: {
    fontSize: 14,
    color: '#0bc9da',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── FORM INPUTS
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },

  // ── DOCTOR SELECTOR
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 10,
  },
  selectorIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  selectorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2F6E',
  },
  selectorSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  selectorPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // ── VALIDATION HINT
  // Shown below the camera section when the form is incomplete.
  // Uses a bullet to draw the eye to the missing field.
  validationHint: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 10,
    paddingHorizontal: 4,
    fontWeight: '500',
  },

  // ── CAMERA BUTTON
  cameraButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0bc9da',
    borderStyle: 'dashed',
    paddingVertical: 20,
    borderRadius: 12,
    gap: 10,
    marginTop: 2,
  },
  cameraText: {
    color: '#0bc9da',
    fontWeight: '700',
    fontSize: 15,
  },

  // ── IMAGE PREVIEW
  previewBox: {
    marginTop: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  // Row below the image: "Image captured" + Retake button
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  previewText: {
    fontSize: 13,
    color: '#27AE60',
    fontWeight: '500',
    flex: 1,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F0FAFB',
    borderWidth: 1,
    borderColor: '#0bc9da',
  },
  retakeText: {
    fontSize: 12,
    color: '#0bc9da',
    fontWeight: '600',
  },

  // ── START ANALYSIS BUTTON
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0bc9da',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // ── COMPLIANCE TEXT
  hipaaText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 12,
    lineHeight: 17,
    paddingHorizontal: 8,
  },

  // ── DOCTOR MODAL ─────────────────────────────────────────────────────────
  // A "bottom sheet" — a panel that slides up from the bottom of the screen.
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    // No background here — the TouchableOpacity overlay handles dimming
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '65%',    // sheet can use at most 65% of screen height
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  // The small handle bar at the top of the bottom sheet
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },

  // ── DOCTOR LIST ITEMS
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  // Highlighted when this doctor is selected
  doctorRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8EDF8',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  doctorAvatarSelected: {
    backgroundColor: '#1A2F6E',
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // ── ANALYSIS OVERLAY ─────────────────────────────────────────────────────
  // Covers the ENTIRE screen (including header) while AI runs.
  // Rendered outside the ScrollView so nothing is clickable underneath.
  analysisOverlay: {
    ...StyleSheet.absoluteFillObject,  // same as: { position:'absolute', top:0, left:0, right:0, bottom:0 }
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  analysisCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '75%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  analysisTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  analysisSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
