import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  Image, StyleSheet, useWindowDimensions, TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import CellOverlay from './CellOverlay';
import {
  CONDITION_CONFIG,
  resolveConditionKey,
  updateReportNotes,
  severityToColor,
  SEVERITY_BUCKETS,
  computeSeverityBreakdown,
  filterDisplayableMorphologyFindings,
} from '../utils/ReportUtils';
import { ReportStyles } from '../styles/ReportStyles';
import { COLORS, FONTS, SPACING, RADIUS, scale, vScale } from '../assets/theme';


const SEVERITY_COLORS = {
  red:    { bg: '#FEE2E2', text: '#B91C1C', icon: 'alert-circle' },
  yellow: { bg: '#FEF3C7', text: '#92400E', icon: 'alert' },
  green:  { bg: '#D1FAE5', text: '#065F46', icon: 'check-circle' },
  blue:   { bg: '#EBF8FF', text: '#1D4ED8', icon: 'information' },
};

// CHANGED: was labeled "X image quality", but explanation.confidence
// (backend classify_confidence()) is fundamentally a model-confidence
// value -- how far anemia_probability sits from the decision threshold
// -- NOT a statement about the photo. It's only capped to "low" in the
// specific case where is_unreliable is true (a deliberate backend
// safeguard so a badly-segmented image can't claim false high
// confidence), but most of the time a "low" here just means the
// prediction is borderline on a perfectly fine photo. Labeling every
// value "image quality" made that borderline-but-fine case display a
// false claim about the image itself -- the same "two signals, one
// label" problem this app already fixed once, just re-introduced in
// the other direction. Actual image-quality problems are is_unreliable
// / unreliable_reasons, surfaced separately via "Review recommended",
// which already reads directly from is_unreliable and is unaffected by
// this rename.
const CONFIDENCE_LABELS = {
  high:     { text: 'High confidence',     icon: 'check-decagram',     color: COLORS.success ?? '#065F46' },
  moderate: { text: 'Moderate confidence', icon: 'alert-decagram-outline', color: '#92400E' },
  low:      { text: 'Low confidence',      icon: 'alert-decagram',     color: '#B91C1C' },
};

const shouldShowProbabilityAndConfidence = (conditionKey, anemiaProbability) =>
  (conditionKey === 'anemic' || conditionKey === 'healthy') &&
  typeof anemiaProbability === 'number';

const getRecommendation = (conditionKey, isUnreliable) => {
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

  // Previously conditionKey === 'anemic' / the final fallback (healthy)
  // branches below never looked at isUnreliable at all -- a poor-quality
  // image (blurry/overexposed/understained, see the "Review recommended"
  // warning driven by the same isUnreliable flag) could still resolve to
  // a confident-sounding anemic/healthy condition and get the exact same
  // full-confidence clinical directive as a good-quality scan, directly
  // contradicting the quality warning shown just above it. These two
  // branches now hedge instead of asserting the same confidence a clean
  // image would get.
  if (conditionKey === 'anemic' && isUnreliable) {
    return {
      icon: 'doctor',
      text:
        'This screening suggests a pattern consistent with anemia, but image quality issues were detected (see Review recommended above) that may affect how reliable this result is. Treat this as provisional -- retake the photo if possible, and confirm with laboratory testing (e.g. full blood count, iron studies) and clinical evaluation regardless.',
    };
  }

  if (conditionKey === 'anemic') {
    return {
      icon: 'doctor',
      text:
        'This screening indicates a pattern consistent with anemia. Advise the patient to see a doctor for confirmatory blood tests (e.g. full blood count, iron studies) and clinical evaluation. This result is a screening aid, not a diagnosis.',
    };
  }

  if (isUnreliable) {
    return {
      icon: 'check-decagram-outline',
      text:
        'No anemia pattern was detected, but image quality issues were detected (see Review recommended above) that may affect how reliable this result is. Treat this as provisional -- retake the photo if possible, and re-screen if the patient becomes symptomatic rather than treating this as a confirmed negative.',
    };
  }

  return {
    icon: 'check-decagram-outline',
    text:
      'No anemia pattern detected in this sample. No immediate action needed based on this screening alone; continue routine care and re-screen if the patient becomes symptomatic.',
  };
};

// Continuous 0→1 gradient bar, calibrated with tick labels. Uses the same
// severityToColor function as CellOverlay and the bucket breakdown below,
// so the bar, the dots on the photo, and the swatches all agree.
function SeverityScale({ cells }) {
  const GRADIENT_STEPS = 24;

  return (
    <View style={{ width: '100%', marginTop: SPACING.sm, marginBottom: SPACING.md }}>
      <View style={scaleStyles.gradientBar}>
        {Array.from({ length: GRADIENT_STEPS }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: severityToColor(i / (GRADIENT_STEPS - 1)),
            }}
          />
        ))}
      </View>
      <View style={scaleStyles.tickRow}>
        <Text style={scaleStyles.tickText}>0.0</Text>
        <Text style={scaleStyles.tickText}>Normal</Text>
        <Text style={scaleStyles.tickText}>0.5</Text>
        <Text style={scaleStyles.tickText}>Unusual</Text>
        <Text style={scaleStyles.tickText}>1.0</Text>
      </View>
    </View>
  );
}

function ImageWithOverlay({ imageBase64, cellOverlay, showOverlay, isShowingAnalyzedCrop, selectedSeverityBand }) {
  const { width: screenWidth } = useWindowDimensions();
  const displaySize = screenWidth - SPACING['2xl'] * 2;

  if (!imageBase64) return null;

  const canShowOverlay = showOverlay && cellOverlay && isShowingAnalyzedCrop;
  const bucket = selectedSeverityBand
    ? SEVERITY_BUCKETS.find((b) => b.key === selectedSeverityBand)
    : null;

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
          showAllCells={!bucket}
          minimumSeverityToDraw={bucket ? bucket.min : 0}
          maximumSeverityToDraw={bucket ? bucket.max : 1.001}
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
  const [selectedSeverityBand, setSelectedSeverityBand] = useState(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // The backend is the single source of truth for this decision (see
  // services/condition.py) -- prediction.condition is trusted directly.
  // resolveConditionKey is only a fallback for the (should-never-happen
  // on a current backend) case where the field is missing.
  const conditionKey = prediction.condition ?? resolveConditionKey(
    prediction.is_anemic,
    prediction.morphology_findings,
    prediction.is_unreliable
  );
  const cfg = CONDITION_CONFIG[conditionKey] ?? CONDITION_CONFIG.healthy;
  const sevStyle = SEVERITY_COLORS[cfg.severity] ?? SEVERITY_COLORS.yellow;
  const showProbabilityConfidence = shouldShowProbabilityAndConfidence(
    conditionKey,
    prediction.anemia_probability
  );

  const confidenceInfo =
    CONFIDENCE_LABELS[prediction.explanation?.confidence]
    ?? CONFIDENCE_LABELS.moderate;

  const displayedImageBase64 = showBeforeCrop && prediction.was_cropped
    ? prediction.original_preview_base64
    : prediction.cropped_preview_base64;

  const cbcPatternEntries = Object.entries(prediction.cbc_pattern_summary ?? {});
  const morphologyEntries = filterDisplayableMorphologyFindings(prediction.morphology_findings);

  // Backend zeroes morphology_findings whenever condition === 'unknown'
  // (see routers/predict.py) -- an empty morphologyEntries in that case
  // means "suppressed because unreliable", not "nothing was found", so
  // the section still renders with an explicit placeholder instead of
  // silently disappearing.
  const isMorphologyUnreliable = conditionKey === 'unknown';

  const isUnreliable = prediction.is_unreliable ?? false;
  const unreliableReasons = prediction.unreliable_reasons ?? [];

  const recommendation = getRecommendation(conditionKey, isUnreliable);

  const dateTimeDisplay = [report?.dateDisplay, report?.timeDisplay]
    .filter(Boolean)
    .join('  \u2022  ');

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
            <View style={ReportStyles.reportHeaderCard}>
              <View style={ReportStyles.reportBrandRow}>
                <View style={ReportStyles.reportBrandLogo}>
                  <Image
                    source={require('../assets/brand/icon-white.png')}
                    style={{ width: 20, height: 20 }}
                    resizeMode="contain"
                  />
                </View>
               <View>
                <Image
                source={require('../assets/brand/wordmark-teal.png')}
                style={{ height: vScale(16), width: scale(90), marginBottom: 2 }}
                resizeMode="contain"
                />
                <Text style={ReportStyles.reportBrandSub}>AI-Assisted Blood Smear Report</Text>
              </View>
              </View>
              <View style={ReportStyles.reportMetaRight}>
                <Text style={ReportStyles.reportMetaLabel}>Scan ID</Text>
                <Text style={ReportStyles.reportMetaValue}>{report?.scanId ?? '\u2014'}</Text>
              </View>
            </View>

            <View style={styles.patientMetaRow}>
              <Text style={styles.patientName} numberOfLines={1} ellipsizeMode="tail">
                {report?.patientName ?? 'Unnamed Patient'}
              </Text>
              {!!dateTimeDisplay && (
                <Text style={styles.patientDateTime} numberOfLines={1}>
                  {dateTimeDisplay}
                </Text>
              )}
            </View>

            <View style={[styles.iconCircle, { backgroundColor: sevStyle.bg }]}>
              <MaterialCommunityIcons name={sevStyle.icon} size={38} color={sevStyle.text} />
            </View>

            <Text style={styles.title}>Analysis Complete</Text>
            <Text style={[styles.conditionLabel, { color: sevStyle.text }]}>
              {cfg.label}
            </Text>
            {showProbabilityConfidence ? (
              <>
                <Text style={styles.probabilityText}>
                  {(prediction.anemia_probability * 100).toFixed(0)}% probability
                </Text>
                <View style={styles.confidenceRow}>
                  <MaterialCommunityIcons
                    name={confidenceInfo.icon}
                    size={FONTS.xs}
                    color={confidenceInfo.color}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.confidenceText, { color: confidenceInfo.color, marginTop: 0, marginBottom: 0 }]}>
                    {confidenceInfo.text}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ marginBottom: SPACING.md }} />
            )}

            <View style={styles.imageSection}>
              <ImageWithOverlay
                imageBase64={displayedImageBase64}
                cellOverlay={prediction.cell_overlay}
                showOverlay={showOverlay}
                isShowingAnalyzedCrop={!showBeforeCrop}
                selectedSeverityBand={selectedSeverityBand}
              />
              <View style={styles.imageControls}>
                {prediction.was_cropped && (
                  <TouchableOpacity
                  style={styles.toggleChip}
                  onPress={() => {
                    setShowOverlay(v => !v);
                    setSelectedSeverityBand(null);
                  }}
                  disabled={showBeforeCrop}
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
                    Each detected cell is scored on how far its shape departs from a
                    normal round cell. The scale below shows the full range, with a
                    marker at this sample's average:
                  </Text>

                  <SeverityScale cells={prediction.cell_overlay.cells} />

                  {computeSeverityBreakdown(prediction.cell_overlay.cells).map((bucket) => {
                    const isSelected = selectedSeverityBand === bucket.key;
                    return (
                      <TouchableOpacity
                        key={bucket.key}
                        style={[styles.breakdownRow, isSelected && styles.breakdownRowSelected]}
                        onPress={() =>
                          setSelectedSeverityBand(isSelected ? null : bucket.key)
                        }
                        disabled={bucket.count === 0}
                      >
                        <View style={[styles.breakdownSwatch, { backgroundColor: bucket.color }]} />
                        <Text style={[styles.breakdownLabel, bucket.count === 0 && styles.breakdownLabelEmpty]}>
                          {bucket.label}
                        </Text>
                        <Text style={styles.breakdownRange}>
                          {bucket.min.toFixed(2)}–{Math.min(bucket.max, 1).toFixed(2)}
                        </Text>
                        <Text style={styles.breakdownCount}>
                          {bucket.count} cell{bucket.count !== 1 ? 's' : ''} ({bucket.percent}%)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
          
            </View>

             {(isMorphologyUnreliable || morphologyEntries.length > 0) && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>Morphology Findings</Text>
                {isMorphologyUnreliable ? (
                  <Text style={styles.sectionSubcaption}>Not shown — result unreliable.</Text>
                ) : (
                  <>
                    {morphologyEntries.map(([flagName, finding]) => (
                      <View key={flagName} style={styles.findingRow}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={14} color={COLORS.textSecondary} style={{ marginTop: 2 }} />
                        <Text style={styles.findingText}>
                          {finding?.display_label ?? flagName.replace(/_/g, ' ')}
                          {finding?.tier === 'possible' ? '  (possible)' : ''}
                        </Text>
                      </View>
                    ))}
                    {morphologyEntries.some(([, finding]) => finding?.tier === 'possible') && (
                      <Text style={styles.sectionSubcaption}>
                        "Possible" findings are patterns the model detects less reliably -- confirm with manual review.
                      </Text>
                    )}
                  </>
                )}
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

            {isUnreliable && (
              <View style={[styles.warningBanner, { marginBottom: SPACING.sm }]}>
                <MaterialCommunityIcons name="alert-outline" size={20} color="#92400E" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Review recommended</Text>
                  <Text style={styles.warningText}>
                    This result should be manually reviewed before acting on it. Here's why, and what to do:
                  </Text>
                  {unreliableReasons.map((reason, index) => (
                    <Text key={index} style={styles.warningText}>• {reason}</Text>
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

            {/* Disclaimer now renders last, after every other section,
                matching DetailModal.js's disclaimerNote placement right
                before its Close button. */}
            {prediction.scope_disclaimer && (
              <Text style={styles.disclaimerText}>{prediction.scope_disclaimer}</Text>
            )}
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

const scaleStyles = StyleSheet.create({
  gradientBar: {
    flexDirection: 'row',
    width: '100%',
    height: scale(16),
    borderRadius: RADIUS.xs,
    overflow: 'visible',
    position: 'relative',
  },
  tickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
  },
  tickText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING['2xl'], paddingTop: SPACING.md, paddingBottom: SPACING.xl,
    alignItems: 'center', maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.md },

  patientMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    marginBottom: SPACING.md,
  },
  patientName: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    flexShrink: 1,
    marginRight: SPACING.sm,
  },
  patientDateTime: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    textAlign: 'right',
    flexShrink: 0,
  },

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
  confidenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2, marginBottom: SPACING.md },

  imageSection: { width: '100%', alignItems: 'center', marginBottom: SPACING.md },
  imageControls: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, flexWrap: 'wrap', justifyContent: 'center' },
  toggleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm + 2, paddingVertical: 6,
  },
  toggleChipText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semibold },
  overlayCaption: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.xs },

  legendCaption: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  sectionBlock: { width: '100%', marginBottom: SPACING.md },
  sectionHeading: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 4 },
  sectionSubcaption: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.xs, fontStyle: 'italic' },

  findingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  findingText: { fontSize: FONTS.sm, color: COLORS.textSecondary, textTransform: 'capitalize', flexShrink: 1 },

  cbcRow: { marginBottom: SPACING.xs, flexDirection: 'row', flexWrap: 'wrap' },
  cbcFieldName: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textMuted, textTransform: 'uppercase', flexShrink: 1 },
  cbcFieldText: { fontSize: FONTS.sm, color: COLORS.textSecondary, flexShrink: 1 },

  explanationText: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },
  disclaimerText: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.sm, lineHeight: 16 },

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
  remainingNote: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.sm },

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
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
  },
  breakdownRange: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginRight: SPACING.sm,
  },
  breakdownCount: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
  },
  breakdownRowSelected: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
  },
  breakdownLabelEmpty: {
    color: COLORS.textMuted,
  },
});
