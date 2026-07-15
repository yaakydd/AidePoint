// Two-step bottom sheet that combines:
//   Step 1 — Full scan results (binary, CBC flags, morphology)
//   Step 2 — Clinical notes form (only shown if user has consented)
//
// The modal is intentionally designed to guide consented users through
// Step 2 without letting them trivially skip it:
//   - "Add Clinical Notes" is the primary CTA on Step 1
//   - Step 2 requires either a Suspect/Confirm selection OR an explicit
//     tap on the small "Skip for now" link
//   - If they hard-dismiss (swipe down), we ask once before closing
//
// Usage in Scan.js:
//   <ResultNotesModal
//     visible={!!resultData}
//     data={resultData}            // { report, anemiaInference, isQueued }
//     userConsented={user.clinicalNotesConsent}
//     onClose={() => setResultData(null)}
//     onViewReports={() => { setResultData(null); navigation.navigate('Reports'); }}
//   />

import React, {
  useState, useRef, useEffect, useCallback, useContext,
} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, Animated, PanResponder, Keyboard, Alert,
  Platform, ActivityIndicator, KeyboardAvoidingView,
  StyleSheet, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase }       from '../utils/supabase';
import { AuthContext }    from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../assets/theme';
import { CONDITION_LABELS, CONDITION_SEVERITY } from '../utils/cbcTypeEngine';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_MAX_HEIGHT     = SCREEN_H * 0.92;

// ── Severity → colours ───────────────────────────────────────────────────────
const SEV_STYLE = {
  critical: { icon: 'alert-octagram',   bg: '#FFF1F0', text: '#B91C1C', dot: '#DC2626' },
  high:     { icon: 'alert-circle',     bg: '#FFF7ED', text: '#9A3412', dot: '#EA580C' },
  moderate: { icon: 'alert',            bg: '#FEFCE8', text: '#854D0E', dot: '#D97706' },
  none:     { icon: 'check-circle',     bg: '#F0FDF4', text: '#065F46', dot: '#10B981' },
};

// ── CBC reference ranges for display ────────────────────────────────────────
const CBC_DISPLAY = [
  { key: 'HAEMOGLOBIN',   label: 'Haemoglobin',  unit: 'g/dL'      },
  { key: 'RBC',           label: 'RBC',           unit: '×10¹²/L'   },
  { key: 'HAEMATOCRIT',   label: 'Haematocrit',   unit: '%'         },
  { key: 'MCV',           label: 'MCV',           unit: 'fL'        },
  { key: 'MCH',           label: 'MCH',           unit: 'pg'        },
  { key: 'MCHC',          label: 'MCHC',          unit: 'g/dL'      },
  { key: 'RDW_CV',        label: 'RDW-CV',        unit: '%'         },
  { key: 'WBC',           label: 'WBC',           unit: '×10⁹/L'    },
  { key: 'PLATELETS',     label: 'Platelets',     unit: '×10⁹/L'    },
  { key: 'NEUTROPHILS',   label: 'Neutrophils',   unit: '%'         },
  { key: 'LYMPHOCYTES',   label: 'Lymphocytes',   unit: '%'         },
];

const FLAG_COLOR = { LOW: '#EF4444', HIGH: '#F59E0B', NORMAL: '#10B981' };
const FLAG_BG    = { LOW: '#FEF2F2', HIGH: '#FFFBEB', NORMAL: '#F0FDF4' };

const MORPH_LABELS = {
  dimorphic_picture:  'Dimorphic Picture',
  anisocytosis:       'Anisocytosis',
  hypochromia:        'Hypochromia',
  microcytosis:       'Microcytosis',
  macrocytosis:       'Macrocytosis',
  poikilocytosis:     'Poikilocytosis',
  target_cells:       'Target Cells',
  normal_morphology:  'Normal Morphology',
};

// ── Sub-components ───────────────────────────────────────────────────────────

function CBCRow({ item, cbcValues, cbcFlags }) {
  const val  = cbcValues?.[item.key];
  const flag = cbcFlags?.[item.key] ?? 'NORMAL';
  if (val === undefined || val === -1) return null;
  return (
    <View style={s.cbcRow}>
      <Text style={s.cbcLabel}>{item.label}</Text>
      <View style={[s.cbcBadge, { backgroundColor: FLAG_BG[flag] }]}>
        <Text style={[s.cbcValue, { color: FLAG_COLOR[flag] }]}>
          {typeof val === 'number' ? val.toFixed(1) : val} {item.unit}
        </Text>
        {flag !== 'NORMAL' && (
          <Text style={[s.cbcFlag, { color: FLAG_COLOR[flag] }]}>
            {flag === 'LOW' ? '↓' : '↑'}
          </Text>
        )}
      </View>
    </View>
  );
}

function MorphFlag({ label, value }) {
  const present = value > 0.5;
  if (!present) return null;
  return (
    <View style={s.morphPill}>
      <View style={[s.morphDot, { backgroundColor: COLORS.primaryDark }]} />
      <Text style={s.morphText}>{label}</Text>
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ResultNotesModal({
  visible, data, userConsented, onClose, onViewReports,
}) {
  const { user }     = useContext(AuthContext);
  const [step, setStep]         = useState(1);      // 1 = results, 2 = notes
  const [noteText, setNoteText] = useState('');
  const [selected, setSelected] = useState(null);   // 'suspect' | 'confirm'
  const [saving, setSaving]     = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const scrollRef  = useRef(null);

  const report      = data?.report;
  const inference   = data?.anemiaInference;
  const isQueued    = data?.isQueued ?? false;
  const isAnemic    = report?.isAnemic ?? false;
  const sev         = inference?.severity ?? 'none';
  const sevStyle    = SEV_STYLE[sev] ?? SEV_STYLE.none;

  // ── Animate in / out ───────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setStep(1); setNoteText(''); setSelected(null);
      Animated.spring(translateY, {
        toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_H, duration: 280, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // ── Swipe-to-dismiss handler ───────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, g) => g.dy > 0,
      onMoveShouldSetPanResponder:  (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) {
          // User swiped down significantly
          if (userConsented && step === 2 && !selected) {
            Alert.alert(
              'Skip clinical notes?',
              'Your observation helps improve diagnostic quality. Are you sure you want to skip?',
              [
                { text: 'Go Back', style: 'cancel', onPress: () => {
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
                  }
                },
                { text: 'Skip', style: 'destructive', onPress: onClose },
              ]
            );
          } else {
            onClose();
          }
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // ── Save clinical notes to Supabase ────────────────────────────────────────
  const handleSaveNotes = useCallback(async (classification) => {
    if (!noteText.trim() && classification !== 'skip') {
      Alert.alert('Note required', 'Please add a brief clinical observation before saving.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('clinical_notes').insert({
        scan_id:        report?.id,
        created_by:     user?.id,
        note_text:      noteText.trim(),
        classification,
        suspected_type: inference?.type ?? null,
        inference_reasoning: inference?.reasoning ?? [],
      });
      if (error) throw error;
      onViewReports();
    } catch (err) {
      console.error('[ResultNotesModal] save failed:', err.message);
      Alert.alert('Save failed', 'Could not save your note. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [noteText, report?.id, user?.id, inference, onViewReports]);

  const handleSkipNotes = useCallback(() => {
    if (selected) {
      handleSaveNotes(selected);
    } else {
      Alert.alert(
        'No selection made',
        'Please tap Suspect or Confirm before closing, or use the Skip link below.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Skip anyway', style: 'destructive', onPress: onViewReports },
        ]
      );
    }
  }, [selected, handleSaveNotes, onViewReports]);

  if (!visible || !data) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity
        style={s.backdrop}
        activeOpacity={1}
        onPress={() => {
          if (userConsented && step === 2 && !selected) {
            Alert.alert(
              'Skip clinical notes?',
              'Your observation helps improve diagnostic quality. Are you sure?',
              [
                { text: 'Go Back', style: 'cancel' },
                { text: 'Skip', style: 'destructive', onPress: onClose },
              ]
            );
          } else { onClose(); }
        }}
      />

      <KeyboardAvoidingView
        style={s.kavWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[s.sheet, { transform: [{ translateY }], maxHeight: SHEET_MAX_HEIGHT }]}
        >
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={s.handleArea}>
            <View style={s.handle} />
          </View>

          {/* Step indicator */}
          {userConsented && (
            <View style={s.stepRow}>
              <View style={[s.stepDot, step === 1 && s.stepDotActive]} />
              <View style={s.stepLine} />
              <View style={[s.stepDot, step === 2 && s.stepDotActive]} />
              <Text style={s.stepLabel}>
                {step === 1 ? 'Results' : 'Clinical Notes'}
              </Text>
            </View>
          )}

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* ── STEP 1: RESULTS ──────────────────────────────────────── */}
            {step === 1 && (
              <View style={s.stepContent}>
                {/* Result icon + title */}
                <View style={[s.iconCircle, { backgroundColor: sevStyle.bg }]}>
                  <MaterialCommunityIcons
                    name={sevStyle.icon}
                    size={44}
                    color={sevStyle.text}
                  />
                </View>

                <Text style={s.resultTitle}>
                  {isQueued ? 'Scan Saved Offline' : 'Analysis Complete'}
                </Text>

                {isQueued ? (
                  <Text style={s.resultSub}>
                    This scan has been saved locally and will be analysed when
                    an internet connection is restored.
                  </Text>
                ) : (
                  <>
                    <Text style={[s.conditionLabel, { color: sevStyle.text }]}>
                      {inference?.label ?? (isAnemic ? 'Anaemia Detected' : 'No Anaemia')}
                    </Text>
                    {inference?.confidence > 0 && (
                      <Text style={s.confidence}>
                        {inference.confidence}% confidence from CBC analysis
                      </Text>
                    )}
                    <View style={[s.anemiaChip, {
                      backgroundColor: isAnemic ? '#FEE2E2' : '#D1FAE5'
                    }]}>
                      <MaterialCommunityIcons
                        name={isAnemic ? 'blood-bag' : 'check-circle-outline'}
                        size={16}
                        color={isAnemic ? '#DC2626' : '#059669'}
                      />
                      <Text style={[s.anemiaChipText,
                        { color: isAnemic ? '#DC2626' : '#059669' }]}>
                        {isAnemic ? 'Anaemia detected' : 'No anaemia detected'}
                      </Text>
                    </View>
                  </>
                )}

                {/* CBC values */}
                {!isQueued && report?.cbc && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>CBC VALUES</Text>
                    {CBC_DISPLAY.map(item => (
                      <CBCRow
                        key={item.key}
                        item={item}
                        cbcValues={report.cbc}
                        cbcFlags={report.cbcFlags}
                      />
                    ))}
                  </View>
                )}

                {/* Morphology flags */}
                {!isQueued && report?.morphology && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>MORPHOLOGY FLAGS</Text>
                    <View style={s.morphRow}>
                      {Object.entries(MORPH_LABELS).map(([key, label]) => (
                        <MorphFlag
                          key={key}
                          label={label}
                          value={report.morphology[key] ?? 0}
                        />
                      ))}
                    </View>
                    {!Object.values(report.morphology ?? {}).some(v => v > 0.5) && (
                      <Text style={s.noMorph}>No abnormal morphology flags</Text>
                    )}
                  </View>
                )}

                {/* Reasoning bullets (if anemic) */}
                {!isQueued && isAnemic && inference?.reasoning?.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>ANALYSIS REASONING</Text>
                    {inference.reasoning.map((r, i) => (
                      <View key={i} style={s.bulletRow}>
                        <View style={[s.bulletDot, { backgroundColor: sevStyle.dot }]} />
                        <Text style={s.bulletText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Caveats */}
                {!isQueued && inference?.caveats?.length > 0 && (
                  <View style={[s.caveatBox]}>
                    <MaterialIcons name="info-outline" size={16} color={COLORS.textSecondary} />
                    <View style={{ flex: 1 }}>
                      {inference.caveats.map((c, i) => (
                        <Text key={i} style={s.caveatText}>• {c}</Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* Action buttons */}
                <View style={s.step1Btns}>
                  {userConsented && !isQueued ? (
                    <>
                      <TouchableOpacity
                        style={s.primaryBtn}
                        onPress={() => {
                          setStep(2);
                          setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
                        }}
                        activeOpacity={0.85}
                      >
                        <MaterialIcons name="edit-note" size={20} color={COLORS.white} />
                        <Text style={s.primaryBtnText}>Add Clinical Notes</Text>
                        <MaterialIcons name="arrow-forward" size={18} color={COLORS.white} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.ghostBtn} onPress={onViewReports}>
                        <Text style={s.ghostBtnText}>View Reports without notes</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={s.primaryBtn} onPress={onViewReports}>
                      <MaterialIcons name="article" size={20} color={COLORS.white} />
                      <Text style={s.primaryBtnText}>View Full Report</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* ── STEP 2: CLINICAL NOTES ─────────────────────────────────── */}
            {step === 2 && (
              <View style={s.stepContent}>
                <Text style={s.notesTitle}>Your Clinical Observation</Text>
                <Text style={s.notesSub}>
                  This is saved to the patient record and helps with quality review.
                </Text>

                {/* AI suggestion card */}
                {inference?.type && inference.type !== 'unclassified' && (
                  <View style={[s.suggestionCard, { borderColor: sevStyle.dot }]}>
                    <View style={s.suggestionHeader}>
                      <MaterialCommunityIcons
                        name="robot-outline" size={18} color={COLORS.primaryDark}
                      />
                      <Text style={s.suggestionHeaderText}>AidePoint suggests</Text>
                    </View>
                    <Text style={s.suggestionCondition}>
                      {CONDITION_LABELS[inference.type] ?? inference.type}
                    </Text>
                    <Text style={s.suggestionNote}>
                      Based on CBC pattern analysis. This is a clinical decision support
                      suggestion — not a diagnosis.
                    </Text>
                  </View>
                )}

                {/* Notes input */}
                <Text style={s.inputLabel}>Your observation *</Text>
                <TextInput
                  style={s.notesInput}
                  placeholder="e.g. Patient presents with fatigue and pallor. CBC consistent with iron deficiency. Recommending iron studies and dietary review..."
                  placeholderTextColor={COLORS.textMuted}
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  textAlignVertical="top"
                  maxLength={600}
                  returnKeyType="done"
                  blurOnSubmit
                />
                <Text style={s.charCount}>{noteText.length}/600</Text>

                {/* Suspect / Confirm buttons */}
                <Text style={s.classifyLabel}>
                  Based on your assessment, this is:
                </Text>
                <View style={s.classifyRow}>
                  <TouchableOpacity
                    style={[
                      s.classifyBtn,
                      s.suspectBtn,
                      selected === 'suspect' && s.suspectBtnActive,
                    ]}
                    onPress={() => setSelected('suspect')}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name="help-circle-outline"
                      size={22}
                      color={selected === 'suspect' ? COLORS.white : '#7C3AED'}
                    />
                    <Text style={[
                      s.classifyBtnText,
                      { color: selected === 'suspect' ? COLORS.white : '#7C3AED' }
                    ]}>
                      Suspect
                    </Text>
                    <Text style={[
                      s.classifyBtnSub,
                      { color: selected === 'suspect' ? '#DDD6FE' : '#A78BFA' }
                    ]}>
                      Possible, needs more tests
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      s.classifyBtn,
                      s.confirmBtn,
                      selected === 'confirm' && s.confirmBtnActive,
                    ]}
                    onPress={() => setSelected('confirm')}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name="check-decagram-outline"
                      size={22}
                      color={selected === 'confirm' ? COLORS.white : '#059669'}
                    />
                    <Text style={[
                      s.classifyBtnText,
                      { color: selected === 'confirm' ? COLORS.white : '#059669' }
                    ]}>
                      Confirm
                    </Text>
                    <Text style={[
                      s.classifyBtnSub,
                      { color: selected === 'confirm' ? '#A7F3D0' : '#6EE7B7' }
                    ]}>
                      Clinically confirmed
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Save button */}
                <TouchableOpacity
                  style={[
                    s.saveBtn,
                    (!selected || !noteText.trim()) && s.saveBtnDisabled,
                  ]}
                  disabled={!selected || !noteText.trim() || saving}
                  onPress={() => handleSaveNotes(selected)}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <MaterialIcons name="save" size={20} color={COLORS.white} />
                  )}
                  <Text style={s.saveBtnText}>
                    {saving ? 'Saving...' : 'Save Note & View Report'}
                  </Text>
                </TouchableOpacity>

                {/* Navigation row */}
                <View style={s.notesNavRow}>
                  <TouchableOpacity
                    style={s.backLink}
                    onPress={() => { Keyboard.dismiss(); setStep(1); }}
                  >
                    <MaterialIcons name="arrow-back" size={16} color={COLORS.textSecondary} />
                    <Text style={s.backLinkText}>Back to results</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Skip clinical notes?',
                        'Your observation helps improve diagnostic quality for this patient. Are you sure you want to skip?',
                        [
                          { text: 'Go Back', style: 'cancel' },
                          {
                            text: 'Skip this time',
                            style: 'destructive',
                            onPress: onViewReports,
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={s.skipLink}>Skip for now</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.disclaimer}>
                  Your notes are stored securely and linked to this scan only. They
                  are never shared without your consent.
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kavWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius:  RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    ...SHADOWS.lg,
  },
  handleArea: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.pagePad,
    marginBottom: SPACING.md,
    gap: 6,
  },
  stepDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.divider,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepLine: {
    flex: 1, height: 2,
    backgroundColor: COLORS.divider,
  },
  stepLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  stepContent: {
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.sm,
  },

  // Results step
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resultTitle: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  resultSub: {
    fontSize: FONTS.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 21,
    marginBottom: SPACING.xl,
  },
  conditionLabel: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold,
    textAlign: 'center', marginBottom: 4,
  },
  confidence: {
    fontSize: FONTS.sm, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: SPACING.md,
  },
  anemiaChip: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, marginBottom: SPACING.xl,
  },
  anemiaChipText: { fontSize: FONTS.sm, fontWeight: FONTS.bold },

  section: { marginBottom: SPACING.xl },
  sectionTitle: {
    fontSize: FONTS.xs, fontWeight: FONTS.bold,
    color: COLORS.textMuted, letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  cbcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  cbcLabel: {
    fontSize: FONTS.sm, color: COLORS.textSecondary, flex: 1,
  },
  cbcBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.sm, gap: 4,
  },
  cbcValue: { fontSize: FONTS.sm, fontWeight: FONTS.semibold },
  cbcFlag:  { fontSize: FONTS.sm, fontWeight: FONTS.bold },

  morphRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  morphPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full, gap: 5,
  },
  morphDot: { width: 6, height: 6, borderRadius: 3 },
  morphText: { fontSize: FONTS.xs, color: COLORS.primaryDark, fontWeight: FONTS.semibold },
  noMorph:   { fontSize: FONTS.sm, color: COLORS.textMuted, fontStyle: 'italic' },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  bulletText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 19 },

  caveatBox: {
    flexDirection: 'row', gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  caveatText: {
    fontSize: FONTS.xs, color: COLORS.textSecondary,
    lineHeight: 17, marginBottom: 2,
  },

  step1Btns:   { gap: SPACING.sm, marginTop: SPACING.sm },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    ...SHADOWS.md,
  },
  primaryBtnText: {
    color: COLORS.white, fontSize: FONTS.md, fontWeight: FONTS.bold,
  },
  ghostBtn: {
    alignItems: 'center', paddingVertical: 10,
  },
  ghostBtnText: {
    fontSize: FONTS.sm, color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },

  // Notes step
  notesTitle: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, marginBottom: 4,
  },
  notesSub: {
    fontSize: FONTS.sm, color: COLORS.textSecondary,
    lineHeight: 20, marginBottom: SPACING.lg,
  },
  suggestionCard: {
    borderWidth: 1.5, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.lg,
    backgroundColor: COLORS.surfaceAlt,
  },
  suggestionHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 6,
  },
  suggestionHeaderText: {
    fontSize: FONTS.xs, fontWeight: FONTS.bold,
    color: COLORS.primaryDark, letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  suggestionCondition: {
    fontSize: FONTS.md, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, marginBottom: 4,
  },
  suggestionNote: {
    fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 17,
  },
  inputLabel: {
    fontSize: FONTS.sm, fontWeight: FONTS.semibold,
    color: COLORS.textPrimary, marginBottom: SPACING.sm,
  },
  notesInput: {
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.md,
    fontSize: FONTS.md, color: COLORS.textPrimary,
    minHeight: 110, maxHeight: 160,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FONTS.xs, color: COLORS.textMuted,
    textAlign: 'right', marginTop: 4, marginBottom: SPACING.lg,
  },
  classifyLabel: {
    fontSize: FONTS.sm, fontWeight: FONTS.semibold,
    color: COLORS.textPrimary, marginBottom: SPACING.md,
  },
  classifyRow: {
    flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl,
  },
  classifyBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 2, gap: 4,
  },
  suspectBtn:       { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  suspectBtnActive: { borderColor: '#7C3AED', backgroundColor: '#7C3AED' },
  confirmBtn:       { borderColor: '#059669', backgroundColor: '#F0FDF4' },
  confirmBtnActive: { borderColor: '#059669', backgroundColor: '#059669' },
  classifyBtnText:  { fontSize: FONTS.md, fontWeight: FONTS.bold },
  classifyBtnSub:   { fontSize: FONTS.xs, fontWeight: FONTS.medium, textAlign: 'center' },

  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    marginBottom: SPACING.md, ...SHADOWS.md,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText:     { color: COLORS.white, fontSize: FONTS.md, fontWeight: FONTS.bold },

  notesNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  backLink:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLinkText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  skipLink:     { fontSize: FONTS.sm, color: COLORS.textMuted, textDecorationLine: 'underline' },
  disclaimer:   {
    fontSize: FONTS.xs, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 17, marginBottom: SPACING.sm,
  },
});
