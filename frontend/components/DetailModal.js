import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Image, useWindowDimensions, StyleSheet } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { ReportStyles as styles } from '../styles/ReportStyles';
import { CONDITION_CONFIG, updateReportNotes, computeSeverityBreakdown, severityToColor, filterDisplayableMorphologyFindings } from '../utils/ReportUtils';
import { exportReportAsPdf } from '../utils/ReportPDF';
import CellOverlay from './CellOverlay';
import { COLORS, SPACING, FONTS, RADIUS, scale, vScale } from '../assets/theme';

function getRecommendation(conditionKey, isUnreliable) {
  if (conditionKey === 'unknown' && isUnreliable) {
    return "This sample falls outside the pattern the model was trained to recognize. It should not be read as a negative result. Recommend manual microscopic review by a hematologist before ruling anemia in or out, and correlate with the patient's clinical presentation.";
  }
  if (conditionKey === 'unknown') {
    return 'Abnormal red cell morphology was flagged. Recommend manual smear review to characterize the finding, and refer the patient to a physician for follow-up.';
  }
  // See TransparencyTrail.jsx's getRecommendation for why isUnreliable is
  // now checked here too -- previously a poor-quality image (blurry/
  // overexposed/understained) that still resolved to a confident-sounding
  // anemic/healthy condition got this same full-confidence text with no
  // acknowledgment of the quality warning shown elsewhere in this same
  // report, directly contradicting it.
  if (conditionKey === 'anemic' && isUnreliable) {
    return 'This screening suggests a pattern consistent with anemia, but image quality issues were detected that may affect how reliable this result is. Treat this as provisional -- retake the photo if possible, and confirm with laboratory testing (e.g. full blood count, iron studies) and clinical evaluation regardless.';
  }
  if (conditionKey === 'anemic') {
    return 'This screening indicates a pattern consistent with anemia. Advise the patient to see a doctor for confirmatory blood tests (e.g. full blood count, iron studies) and clinical evaluation. This result is a screening aid, not a diagnosis.';
  }
  if (isUnreliable) {
    return 'No anemia pattern was detected, but image quality issues were detected that may affect how reliable this result is. Treat this as provisional -- retake the photo if possible, and re-screen if the patient becomes symptomatic rather than treating this as a confirmed negative.';
  }
  return 'No anemia pattern detected in this sample. No immediate action needed based on this screening alone; continue routine care and re-screen if the patient becomes symptomatic.';
}

function shouldShowProbabilityAndConfidence(conditionKey) {
  return conditionKey === 'anemic' || conditionKey === 'healthy';
}

// Same calibrated 0→1 gradient scale as TransparencyTrail.js, built from
// the same severityToColor function used by CellOverlay -- so the scale,
// the overlay dots on the image, and the bucket swatches all match.
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

function ReportImageWithOverlay({ imageUri, cellOverlay, showOverlay }) {
  const { width: screenWidth } = useWindowDimensions();
  const displaySize = screenWidth - SPACING['2xl'] * 2;

  if (!imageUri) return null;

  return (
    <View style={{ width: displaySize, height: displaySize, marginBottom: SPACING.sm }}>
      <Image
        source={{ uri: imageUri }}
        style={{ width: displaySize, height: displaySize, borderRadius: RADIUS.md }}
        resizeMode="cover"
      />
      {showOverlay && cellOverlay?.cells?.length > 0 && (
        <CellOverlay
          cellOverlay={cellOverlay}
          displayWidth={displaySize}
          displayHeight={displaySize}
          showAllCells
          minimumSeverityToDraw={0}
          maximumSeverityToDraw={1.001}
        />
      )}
    </View>
  );
}

export default function DetailModal({ report, visible, onClose, onNotesSaved, userId }) {
  const [exporting, setExporting] = useState(false);
  const [notesDraft, setNotesDraft] = useState(report?.labTechNotes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedSeverityBand, setSelectedSeverityBand] = useState(null);

  const [openedReportId, setOpenedReportId] = useState(report?.id ?? null);
  if (report && report.id !== openedReportId) {
    setOpenedReportId(report.id);
    setNotesDraft(report.labTechNotes ?? '');
    setNotesSavedAt(null);
    setSelectedSeverityBand(null);
  }

  if (!report) return null;

  const cfg = CONDITION_CONFIG[report.condition] ?? CONDITION_CONFIG.healthy;
  const showProbabilityConfidence = shouldShowProbabilityAndConfidence(report.condition);
  const confidencePct = typeof report.confidence === 'number'
    ? Math.round(report.confidence * 100) + '%'
    : (typeof report.confidence === 'string' ? report.confidence : '\u2014');

  const morphologyEntries = filterDisplayableMorphologyFindings(report.morphologyFindings);
  const cbcPatternEntries = Object.entries(report.cbcPatternSummary ?? {});

  // Backend zeroes morphology_findings whenever condition === 'unknown'
  // (see routers/predict.py) -- an empty morphologyEntries in that case
  // means "suppressed because unreliable", not "nothing was found", so
  // the section still renders with an explicit placeholder instead of
  // silently disappearing.
  const isMorphologyUnreliable = report.condition === 'unknown';

  const hasCellOverlay = report.cellOverlay?.cells?.length > 0;
  const severityBreakdown = hasCellOverlay ? computeSeverityBreakdown(report.cellOverlay.cells) : [];

  const recommendationText = getRecommendation(report.condition, report.isUnreliable);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const { shared } = await exportReportAsPdf(report);
      if (!shared) {
        Alert.alert('Sharing Unavailable', 'The PDF was generated, but sharing is not available on this device.');
      }
    } catch (err) {
      console.error('DetailModal export PDF:', err.message);
      Alert.alert('Export Failed', 'Could not generate the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function handleShareImage() {
    if (!report.imageUri) {
      Alert.alert('No Image', 'No scan image was saved with this report.');
      return;
    }
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(report.imageUri);
      } else {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      }
    } catch (err) {
      console.error('DetailModal share image:', err.message);
    }
  }

  async function handleSaveNotes() {
    if (!userId) {
      Alert.alert('Save Failed', 'Could not identify the current user. Please try logging in again.');
      return;
    }
    setSavingNotes(true);
    try {
      const updatedReports = await updateReportNotes(report.id, notesDraft, userId);
      setNotesSavedAt(new Date());
      if (onNotesSaved) onNotesSaved(updatedReports);
    } catch (err) {
      console.error('DetailModal save notes:', err.message);
      Alert.alert('Save Failed', 'Could not save your notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>

            <View style={styles.reportHeaderCard}>
              <View style={styles.reportBrandRow}>
                <View style={styles.reportBrandLogo}>
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
                        <Text style={styles.reportBrandSub}>AI-Assisted Blood Smear Report</Text>
                      </View>
              </View>
              <View style={styles.reportMetaRight}>
                <Text style={styles.reportMetaLabel}>Scan ID</Text>
                <Text style={styles.reportMetaValue}>{report.scanId ?? '\u2014'}</Text>
              </View>
            </View>

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetName}>{report.patientName}</Text>
                <Text style={styles.sheetId}>
                  {report.dateDisplay} - {report.timeDisplay}
                </Text>
              </View>
            </View>

            <View style={[styles.resultBanner, { backgroundColor: cfg.badgeBg }]}>
              <Text style={[styles.resultBannerLabel, { color: cfg.badgeText }]}>RESULT</Text>
              <Text style={[styles.resultBannerValue, { color: cfg.badgeText }]}>{cfg.label}</Text>
              <Text style={[styles.resultBannerMorphology, { color: cfg.badgeText }]}>{cfg.morphology}</Text>
            </View>

            {report.imageUri ? (
              <View style={{ alignItems: 'center', marginTop: SPACING.md }}>
                <ReportImageWithOverlay
                  imageUri={report.imageUri}
                  cellOverlay={report.cellOverlay}
                  showOverlay={showOverlay}
                />
                {hasCellOverlay && (
                  <TouchableOpacity
                    onPress={() => setShowOverlay((v) => !v)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm,
                      paddingHorizontal: SPACING.sm + 2, paddingVertical: 6, marginBottom: SPACING.sm,
                    }}
                  >
                    <MaterialIcons name={showOverlay ? 'visibility-off' : 'visibility'} size={16} color={COLORS.primary} />
                    <Text style={{ fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semibold }}>
                      {showOverlay ? 'Hide cell overlay' : 'Show cell overlay'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {hasCellOverlay ? (
              <View>
                <Text style={styles.sectionHeading}>Cell Shape Breakdown</Text>
                <Text style={{ fontSize: FONTS.xs, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: SPACING.xs }}>
                  {report.cellOverlay.cell_count} cells detected, {report.cellOverlay.flagged_count} flagged for unusual shape
                </Text>

                <SeverityScale cells={report.cellOverlay.cells} />

                {severityBreakdown.map(function (bucket) {
                  const isSelected = selectedSeverityBand === bucket.key;
                  return (
                    <TouchableOpacity
                      key={bucket.key}
                      style={{
                        flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
                        backgroundColor: isSelected ? COLORS.surfaceAlt : 'transparent',
                        borderRadius: RADIUS.sm,
                      }}
                      onPress={() => setSelectedSeverityBand(isSelected ? null : bucket.key)}
                      disabled={bucket.count === 0}
                    >
                      <View style={{ width: 14, height: 14, borderRadius: 4, marginRight: SPACING.sm, backgroundColor: bucket.color }} />
                      <Text style={{ flex: 1, fontSize: FONTS.sm, color: bucket.count === 0 ? COLORS.textMuted : COLORS.textPrimary }}>
                        {bucket.label}
                      </Text>
                      <Text style={{ fontSize: FONTS.xs, color: COLORS.textMuted, marginRight: SPACING.sm }}>
                        {bucket.min.toFixed(2)}–{Math.min(bucket.max, 1).toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: FONTS.sm, fontWeight: FONTS.semibold, color: COLORS.textSecondary }}>
                        {bucket.count} cell{bucket.count !== 1 ? 's' : ''} ({bucket.percent}%)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.sectionHeading}>AI Analysis</Text>
            {/* Probability is internal-only as of this change -- still
                present in the stored report data, just never rendered
                here. */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Urgency</Text>
              <Text style={[styles.detailValue, cfg.severity === 'red' && styles.detailValueFlagged]}>
                {cfg.urgency}
              </Text>
            </View>

            {(isMorphologyUnreliable || morphologyEntries.length > 0) ? (
              <View>
                <Text style={styles.sectionHeading}>Morphology Findings</Text>
                {isMorphologyUnreliable ? (
                  <Text style={{ fontSize: FONTS.xs, color: COLORS.textMuted, fontStyle: 'italic', marginTop: SPACING.xs }}>
                    Not shown — result unreliable.
                  </Text>
                ) : (
                  <>
                    {morphologyEntries.map(function (entry) {
                      const flagName = entry[0];
                      const finding = entry[1] ?? {};
                      const label = finding.display_label ?? flagName.replace(/_/g, ' ');
                      const isPossible = finding.tier === 'possible';
                      return (
                        <View key={flagName} style={styles.detailRow}>
                          <Text style={styles.detailLabel}>{label}</Text>
                          <Text style={styles.detailValue}>{isPossible ? 'Possible' : 'Flagged'}</Text>
                        </View>
                      );
                    })}
                    {morphologyEntries.some(function (entry) { return entry[1]?.tier === 'possible'; }) ? (
                      <Text style={{ fontSize: FONTS.xs, color: COLORS.textMuted, fontStyle: 'italic', marginTop: SPACING.xs }}>
                        "Possible" findings are patterns the model detects less reliably -- confirm with manual review.
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
            ) : null}

            {cbcPatternEntries.length > 0 ? (
              <View>
                <Text style={styles.sectionHeading}>Estimated Hematological Pattern</Text>
                <Text style={{ fontSize: FONTS.xs, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: SPACING.xs }}>
                  Image-based estimates, not laboratory measurements
                </Text>
                {cbcPatternEntries.map(function (entry) {
                  const fieldName = entry[0];
                  const fieldData = entry[1];
                  const direction = fieldData && fieldData.direction
                    ? fieldData.direction.replace(/_/g, ' ')
                    : '\u2014';
                  return (
                    <View key={fieldName} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{fieldName}</Text>
                      <Text style={styles.detailValue}>{direction}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.sectionHeading}>Patient Vitals</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Temperature</Text>
              <Text style={styles.detailValue}>{report.temperature ? report.temperature + ' \u00b0C' : '\u2014'}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Blood Pressure</Text>
              <Text style={styles.detailValue}>{report.bloodPressure ?? '\u2014'}</Text>
            </View>

            <Text style={styles.sectionHeading}>Technician Notes</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: RADIUS.md,
                padding: SPACING.md,
                fontSize: FONTS.sm,
                color: COLORS.textPrimary,
                minHeight: 80,
                textAlignVertical: 'top',
                backgroundColor: COLORS.surfaceAlt,
              }}
              multiline
              placeholder="Add any observations or context for this scan..."
              placeholderTextColor={COLORS.textMuted}
              value={notesDraft}
              onChangeText={setNotesDraft}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm, marginBottom: SPACING.md }}>
              <Text style={{ fontSize: FONTS.xs, color: COLORS.textMuted }}>
                {notesSavedAt ? ('Saved ' + notesSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : ' '}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: RADIUS.md,
                  paddingHorizontal: SPACING.lg,
                  paddingVertical: SPACING.sm,
                  opacity: savingNotes ? 0.6 : 1,
                }}
                onPress={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Text style={{ color: COLORS.white, fontWeight: FONTS.bold, fontSize: FONTS.sm }}>Save Notes</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lab Technician</Text>
              <Text style={styles.detailValue}>{report.labTechName ?? '\u2014'}</Text>
            </View>

            <View style={styles.exportRow}>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExportPdf} disabled={exporting}>
                {exporting
                  ? <ActivityIndicator size="small" color={COLORS.primaryDark} />
                  : <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.primaryDark} />}
                <Text style={styles.exportBtnText}>{exporting ? 'Generating...' : 'Export PDF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={handleShareImage}>
                <MaterialIcons name="ios-share" size={18} color={COLORS.primaryDark} />
                <Text style={styles.exportBtnText}>Share Image</Text>
              </TouchableOpacity>
            </View>

            {report.isUnreliable && (report.unreliableReasons ?? []).length > 0 ? (
              <View style={[styles.resultBanner, { backgroundColor: '#FEF3C7', marginTop: SPACING.md }]}>
                <Text style={[styles.resultBannerLabel, { color: '#92400E' }]}>REVIEW RECOMMENDED</Text>
                {report.unreliableReasons.map(function (reason, index) {
                  return (
                    <Text key={index} style={{ fontSize: FONTS.xs, color: '#92400E', marginTop: 2 }}>
                      {'\u2022 ' + reason}
                    </Text>
                  );
                })}
              </View>
            ) : null}

            <View style={[styles.resultBanner, { backgroundColor: cfg.badgeBg, marginTop: SPACING.sm }]}>
              <Text style={[styles.resultBannerLabel, { color: cfg.badgeText }]}>RECOMMENDATION</Text>
              <Text style={{ fontSize: FONTS.sm, color: cfg.badgeText, lineHeight: 20, marginTop: 4 }}>
                {recommendationText}
              </Text>
            </View>

            <Text style={styles.disclaimerNote}>
              This AI-assisted result is a screening aid only, it does not replace clinical
              judgement. Confirm with a qualified physician before treatment decisions.
            </Text>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

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
