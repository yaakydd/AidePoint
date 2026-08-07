import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  Image, StyleSheet, useWindowDimensions, TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import CellOverlay from './CellOverlay';
import { CONDITION_CONFIG, resolveConditionKey, updateReportNotes } from '../utils/ReportUtils';
import { ReportStyles } from '../styles/ReportStyles';
import { COLORS, FONTS, SPACING, RADIUS, scale } from '../assets/theme';

const SEVERITY_COLORS = {
  red:    { bg: '#FEE2E2', text: '#B91C1C', icon: 'alert-circle' },
  yellow: { bg: '#FEF3C7', text: '#92400E', icon: 'alert' },
  green:  { bg: '#D1FAE5', text: '#065F46', icon: 'check-circle' },
  blue:   { bg: '#EBF8FF', text: '#1D4ED8', icon: 'information' },
};

const CONFIDENCE_LABELS = {
  high:     { text: 'High confidence',     color: COLORS.success ?? '#065F46' },
  moderate: { text: 'Moderate confidence', color: '#92400E' },
  low:      { text: 'Low confidence',      color: '#B91C1C' },
};

const getRecommendation = (conditionKey, isUnreliable, imageQualityWarning) => {
  if (conditionKey === 'unknown' && isUnreliable) {
    return {
      icon: 'account-search-outline',
      text:
        "This sample falls outside the pattern the model was trained to recognize. It should not be read as a negative result. Recommend manual microscopic review by a hematologist before ruling anemia in or out, and correlate with the patient's clinical presentation.",
    };
  }

  if (conditionKey === 'unknown') {
    return {
      icon: 'magnify-scan',
      text:
        'Abnormal red cell morphology was flagged. Recommend manual smear review to characterize the finding, and refer the patient to a physician for follow-up.',
    };
  }

  if (conditionKey === 'anemic') {
    return {
      icon: 'doctor',
      text:
        'This screening indicates a pattern consistent with anemia. Advise the patient to see a doctor for confirmatory blood tests (e.g. full blood count, iron studies) and clinical evaluation. This result is a screening aid, not a diagnosis.',
    };
  }

  return {
    icon: 'check-decagram-outline',
    text:
      'No anemia pattern detected in this sample. No immediate action needed based on this screening alone; continue routine care and re-screen if the patient becomes symptomatic.',
  };
};

const getQualityCaveat = (imageQualityWarning) =>
  imageQualityWarning
    ? 'Image quality issues were detected during analysis (see warning above). If this result is borderline or unexpected, consider re-scanning with better lighting and focus before acting on it.'
    : null;

function ImageWithOverlay({ imageBase64, cellOverlay, showOverlay, isShowingAnalyzedCrop }) {
  const { width: screenWidth } = useWindowDimensions();
  const displaySize = screenWidth - SPACING['2xl'] * 2;

  if (!imageBase64) return null;

  const canShowOverlay = showOverlay && cellOverlay && isShowingAnalyzedCrop;

  return (
    <View style={{ width: displaySize, height: displaySize }}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
        style={{ width: displaySize, height: displaySize, borderRadius: RADIUS.md }}
        resizeMode="cover"
      />
      {canShowOverlay && (
        <CellOverlay
          cellOverlay={cellOverlay}
          displayWidth={displaySize}
          displayHeight={displaySize}
        />
      )}
    </View>
  );
}

const  TransparencyTrail = ({ data, onClose, onViewReport, userId }) => {
  const { prediction, report, bonusJustGranted, bonusRemaining, remaining } = data;
  const [showBeforeCrop, setShowBeforeCrop] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [notes, setNotes] = useState(report?.labTechNotes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const conditionKey = resolveConditionKey(
    prediction.is_anemic,
    prediction.morphology_findings,
    prediction.is_unreliable
  );
  const cfg = CONDITION_CONFIG[conditionKey] ?? CONDITION_CONFIG.healthy;
  const sevStyle = SEVERITY_COLORS[cfg.severity] ?? SEVERITY_COLORS.yellow;

  const confidenceInfo =
    CONFIDENCE_LABELS[prediction.explanation?.confidence]
    ?? CONFIDENCE_LABELS.moderate;

  const displayedImageBase64 = showBeforeCrop && prediction.was_cropped
    ? prediction.original_preview_base64
    : prediction.cropped_preview_base64;

  const cbcPatternEntries = Object.entries(prediction.cbc_pattern_summary ?? {});
  const morphologyEntries = Object.entries(prediction.morphology_findings ?? {})
    .filter(([, probability]) => probability >= 0.5);

  const imageQuality = prediction.image_quality ?? {};
  const isUnreliable = prediction.is_unreliable ?? false;
  const imageQualityWarning = prediction.image_quality_warning ?? false;

  const recommendation = getRecommendation(conditionKey, isUnreliable, imageQualityWarning);
  const qualityCaveat = getQualityCaveat(imageQualityWarning);

  const handleSaveNotes = async () => {
    if (!report?.id || !userId) return;
    setSavingNotes(true);
    try {
      await updateReportNotes(report.id, notes, userId);
      setNotesSaved(true);
    } catch (err) {
      console.error('TransparencyTrail handleSaveNotes:', err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>

            {/* Branded header -- matches DetailModal.js's letterhead so
                the post-scan result screen and the saved-report screen
                read as the same product. Reuses ReportStyles directly
                rather than duplicating styling, so both stay in sync if
                the letterhead design changes. Shows scanId (the short,
                human-facing ID generated on the Scan screen), never
                report.id (the internal Supabase key). */}
            <View style={ReportStyles.reportHeaderCard}>
              <View style={ReportStyles.reportBrandRow}>
                <View style={ReportStyles.reportBrandLogo}>
                  <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 16 }}>A</Text>
                </View>
                <View>
                  <Text style={ReportStyles.reportBrandName}>AidePoint</Text>
                  <Text style={ReportStyles.reportBrandSub}>AI-Assisted Blood Smear Report</Text>
                </View>
              </View>
              <View style={ReportStyles.reportMetaRight}>
                <Text style={ReportStyles.reportMetaLabel}>Scan ID</Text>
                <Text style={ReportStyles.reportMetaValue}>{report?.scanId ?? '\u2014'}</Text>
              </View>
            </View>

            <View style={[styles.iconCircle, { backgroundColor: sevStyle.bg }]}>
              <MaterialCommunityIcons name={sevStyle.icon} size={38} color={sevStyle.text} />
            </View>

            <Text style={styles.title}>Analysis Complete</Text>
            <Text style={[styles.conditionLabel, { color: sevStyle.text }]}>
              {cfg.label}
            </Text>
            <Text style={styles.probabilityText}>
              {(prediction.anemia_probability * 100).toFixed(0)}% probability
            </Text>
            <Text style={[styles.confidenceText, { color: confidenceInfo.color }]}>
              {confidenceInfo.text}
            </Text>

            <View style={styles.imageSection}>
              <ImageWithOverlay
                imageBase64={displayedImageBase64}
                cellOverlay={prediction.cell_overlay}
                showOverlay={showOverlay}
                isShowingAnalyzedCrop={!showBeforeCrop}
              />
              <View style={styles.imageControls}>
                {prediction.was_cropped && (
                  <TouchableOpacity
                    style={styles.toggleChip}
                    onPress={() => setShowBeforeCrop(v => !v)}
                  >
                    <MaterialIcons name="compare" size={16} color={COLORS.primary} />
                    <Text style={styles.toggleChipText}>
                      {showBeforeCrop ? 'Show analyzed crop' : 'Show original photo'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.toggleChip}
                  onPress={() => setShowOverlay(v => !v)}
                  disabled={showBeforeCrop}
                >
                  <MaterialIcons name={showOverlay ? 'visibility-off' : 'visibility'} size={16} color={showBeforeCrop ? COLORS.textMuted : COLORS.primary} />
                  <Text style={[styles.toggleChipText, showBeforeCrop && { color: COLORS.textMuted }]}>
                    {showOverlay ? 'Hide cell overlay' : 'Show cell overlay'}
                  </Text>
                </TouchableOpacity>
              </View>
              {prediction.cell_overlay && (
                <Text style={styles.overlayCaption}>
                  {showBeforeCrop
                    ? 'Cell overlay is only available on the analyzed crop'
                    : `${prediction.cell_overlay.cell_count} cells detected, ${prediction.cell_overlay.flagged_count} flagged for unusual shape`}
                </Text>
              )}

{prediction.cell_overlay && showOverlay && !showBeforeCrop && (
  <View style={{ width: '100%' }}>
    <Text style={styles.legendCaption}>
      Each flagged cell is colored by how abnormal its shape looks. Green cells are
      close to normal, red cells show the most unusual shape. Colors in between (like yellow and 
      orange) fall between the two nearest categories which is normal and abnormal.
    </Text>
    <View style={styles.legendRow}>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16A34A' }]} />
        <Text style={styles.legendText}>Normal shape</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EAB308' }]} />
        <Text style={styles.legendText}>Mild variation</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' }]} />
        <Text style={styles.legendText}>Unusual shape</Text>
      </View>
    </View>
  </View>
)}
            </View>

            {morphologyEntries.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>Morphology findings</Text>
                {morphologyEntries.map(([flagName]) => (
                  <View key={flagName} style={styles.findingRow}>
                    <MaterialCommunityIcons name="circle-medium" size={18} color={COLORS.primary} />
                    <Text style={styles.findingText}>
                      {flagName.replace(/_/g, ' ')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {cbcPatternEntries.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>Estimated hematological patterns</Text>
                <Text style={styles.sectionSubcaption}>
                  Image-based estimates, not laboratory measurements
                </Text>
                {cbcPatternEntries.map(([fieldName, fieldData]) => (
                  <View key={fieldName} style={styles.cbcRow}>
                    <Text style={styles.cbcFieldName}>{fieldName}</Text>
                    <Text style={styles.cbcFieldText}>{fieldData.display_text}</Text>
                  </View>
                ))}
              </View>
            )}

            {prediction.explanation?.reasoning_summary && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>Why this result</Text>
                <Text style={styles.explanationText}>
                  {prediction.explanation.reasoning_summary}
                </Text>
              </View>
            )}

            {prediction.scope_disclaimer && (
              <Text style={styles.disclaimerText}>{prediction.scope_disclaimer}</Text>
            )}

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>Lab Technician Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add any observations for this sample…"
                placeholderTextColor={COLORS.textMuted}
                value={notes}
                onChangeText={(t) => { setNotes(t); setNotesSaved(false); }}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.saveNotesBtn}
                onPress={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <MaterialIcons
                    name={notesSaved ? 'check' : 'save'}
                    size={16}
                    color={COLORS.primary}
                  />
                )}
                <Text style={styles.saveNotesBtnText}>
                  {notesSaved ? 'Saved' : 'Save Note'}
                </Text>
              </TouchableOpacity>
            </View>

            {(isUnreliable || imageQuality.quality_score === 'poor') && (
              <View style={[styles.warningBanner, { marginBottom: SPACING.sm }]}>
                <MaterialCommunityIcons name="alert-outline" size={20} color="#92400E" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Review recommended</Text>
                  {(prediction.unreliable_reasons ?? []).map((reason, index) => (
                    <Text key={index} style={styles.warningText}>• {reason}</Text>
                  ))}
                  {(imageQuality.failure_reasons ?? []).map((reason, index) => (
                    <Text key={`q-${index}`} style={styles.warningText}>• {reason}</Text>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.sectionBlock, styles.recommendationBlock, { backgroundColor: sevStyle.bg }]}>
              <View style={styles.recommendationHeader}>
                <MaterialCommunityIcons name={recommendation.icon} size={20} color={sevStyle.text} />
                <Text style={[styles.sectionHeading, { color: sevStyle.text, marginBottom: 0 }]}>
                  Recommendation
                </Text>
              </View>
              <Text style={[styles.recommendationText, { color: sevStyle.text }]}>
                {recommendation.text}
              </Text>
              {qualityCaveat && (
                <Text style={[styles.recommendationText, styles.recommendationCaveat, { color: sevStyle.text }]}>
                  {qualityCaveat}
                </Text>
              )}
            </View>

            {bonusJustGranted && (
              <View style={styles.bonusBanner}>
                <MaterialCommunityIcons name="gift-outline" size={18} color={COLORS.primaryDark} />
                <Text style={styles.bonusText}>
                  You've saved 5 images today! {bonusRemaining} bonus scan{bonusRemaining !== 1 ? 's' : ''} unlocked.
                </Text>
              </View>
            )}

            <Text style={styles.remainingNote}>
              {remaining === Infinity
                ? 'Unlimited scans remaining today'
                : `${remaining} scan${remaining !== 1 ? 's' : ''} remaining today`}
            </Text>
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>New Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={onViewReport}>
              <MaterialIcons name="article" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>View Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
export default TransparencyTrail;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING['2xl'], paddingTop: SPACING.md, paddingBottom: SPACING.xl,
    alignItems: 'center', maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.md },

  warningBanner: {
    flexDirection: 'row', gap: SPACING.sm, backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.sm + 2, padding: SPACING.md, marginBottom: SPACING.md, width: '100%',
  },
  warningTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: '#92400E', marginBottom: 2 },
  warningText: { fontSize: FONTS.xs, color: '#92400E', lineHeight: 16 },

  iconCircle: { width: scale(64), height: scale(64), borderRadius: scale(32), justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md, alignSelf: 'center' },
  title: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, textAlign: 'center' },
  conditionLabel: { fontSize: FONTS.lg, fontWeight: FONTS.bold, textAlign: 'center', marginTop: 2 },
  probabilityText: { fontSize: FONTS.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  confidenceText: { fontSize: FONTS.xs, fontWeight: FONTS.semibold, textAlign: 'center', marginTop: 2, marginBottom: SPACING.md },

  imageSection: { width: '100%', alignItems: 'center', marginBottom: SPACING.md },
  imageControls: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, flexWrap: 'wrap', justifyContent: 'center' },
  toggleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm + 2, paddingVertical: 6,
  },
  toggleChipText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semibold },
overlayCaption: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.xs },

  legendCaption: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: 6, fontStyle: 'italic', lineHeight: 16 },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
  },

  sectionBlock: { width: '100%', marginBottom: SPACING.md },
  sectionHeading: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 4 },
  sectionSubcaption: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.xs, fontStyle: 'italic' },
  findingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  findingText: { fontSize: FONTS.sm, color: COLORS.textSecondary, textTransform: 'capitalize' },
  cbcRow: { marginBottom: SPACING.xs },
  cbcFieldName: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textMuted, textTransform: 'uppercase' },
  cbcFieldText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  explanationText: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },
  disclaimerText: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.md, lineHeight: 16 },

  notesInput: {
    width: '100%', minHeight: scale(72), backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm + 2, padding: SPACING.sm + 2, fontSize: FONTS.sm,
    color: COLORS.textPrimary, marginBottom: SPACING.sm,
  },
  saveNotesBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm + 2, paddingVertical: 6,
  },
  saveNotesBtnText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semibold },

  recommendationBlock: { borderRadius: RADIUS.sm + 2, padding: SPACING.md },
  recommendationHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  recommendationText: { fontSize: FONTS.sm, lineHeight: 20 },
  recommendationCaveat: { marginTop: SPACING.xs, fontStyle: 'italic', opacity: 0.9 },

  bonusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm + 2, paddingHorizontal: SPACING.md + 2, paddingVertical: SPACING.sm + 2, marginBottom: SPACING.md, width: '100%',
  },
  bonusText: { flex: 1, fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.semibold },
  remainingNote: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.md },

  btnRow: { flexDirection: 'row', gap: SPACING.md, width: '100%', paddingTop: SPACING.sm },
  btnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs + 2,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: SPACING.md + 2,
  },
  btnPrimaryText: { color: COLORS.white, fontSize: FONTS.md, fontWeight: FONTS.bold },
  btnSecondary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingVertical: SPACING.md + 2,
  },
  btnSecondaryText: { fontSize: FONTS.md, fontWeight: FONTS.semibold, color: COLORS.textPrimary },
});
