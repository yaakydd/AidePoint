// components/DetailModal.js

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { ReportStyles as styles } from '../styles/ReportStyles';
import { CONDITION_CONFIG, updateReportNotes } from '../utils/ReportUtils';
import { exportReportAsPdf } from '../utils/ReportPDF';
import { COLORS, SPACING, FONTS, RADIUS } from '../assets/theme';

// Same recommendation copy as components/TransparencyTrail.js -- kept in
// sync manually for now. Worth moving into ReportUtils.js as a shared
// export if it needs to change again, so the in-app modal and the
// exported PDF/report sheet can never drift apart.
function getRecommendation(conditionKey, isUnreliable) {
  if (conditionKey === 'unknown' && isUnreliable) {
    return "This sample falls outside the pattern the model was trained to recognize. It should not be read as a negative result. Recommend manual microscopic review by a hematologist before ruling anemia in or out, and correlate with the patient's clinical presentation.";
  }
  if (conditionKey === 'unknown') {
    return 'Abnormal red cell morphology was flagged. Recommend manual smear review to characterize the finding, and refer the patient to a physician for follow-up.';
  }
  if (conditionKey === 'anemic') {
    return 'This screening indicates a pattern consistent with anemia. Advise the patient to see a doctor for confirmatory blood tests (e.g. full blood count, iron studies) and clinical evaluation. This result is a screening aid, not a diagnosis.';
  }
  return 'No anemia pattern detected in this sample. No immediate action needed based on this screening alone; continue routine care and re-screen if the patient becomes symptomatic.';
}

export default function DetailModal({ report, visible, onClose, onNotesSaved, userId }) {
  const [exporting, setExporting] = useState(false);
  const [notesDraft, setNotesDraft] = useState(report?.labTechNotes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState(null);

  const [openedReportId, setOpenedReportId] = useState(report?.id ?? null);
  if (report && report.id !== openedReportId) {
    setOpenedReportId(report.id);
    setNotesDraft(report.labTechNotes ?? '');
    setNotesSavedAt(null);
  }

  if (!report) return null;

  const cfg = CONDITION_CONFIG[report.condition] ?? CONDITION_CONFIG.healthy;
  const showProbabilityConfidence = report.condition === 'anemic' || report.condition === 'healthy';
  const confidencePct = typeof report.confidence === 'number'
    ? Math.round(report.confidence * 100) + '%'
    : (typeof report.confidence === 'string' ? report.confidence : '\u2014');

  const morphologyEntries = Object.entries(report.morphologyFindings ?? {})
    .filter(function (entry) { return entry[1] && entry[1].flagged === true; });
  const cbcPatternEntries = Object.entries(report.cbcPatternSummary ?? {});

  const recommendationText = getRecommendation(report.condition, report.isUnreliable);

  async function handleExportPdf() {
    setExporting(true);
    try {
      await exportReportAsPdf(report);
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
                  <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 16 }}>A</Text>
                </View>
                <View>
                  <Text style={styles.reportBrandName}>AidePoint</Text>
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

            <Text style={styles.sectionHeading}>AI Analysis</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Confidence</Text>
              <Text style={styles.detailValue}>{confidencePct}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Urgency</Text>
              <Text style={[styles.detailValue, cfg.severity === 'red' && styles.detailValueFlagged]}>
                {cfg.urgency}
              </Text>
            </View>

            {morphologyEntries.length > 0 ? (
              <View>
                <Text style={styles.sectionHeading}>Morphology Findings</Text>
                {morphologyEntries.map(function (entry) {
                  const flagName = entry[0];
                  return (
                    <View key={flagName} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{flagName.replace(/_/g, ' ')}</Text>
                      <Text style={styles.detailValue}>Flagged</Text>
                    </View>
                  );
                })}
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
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Reviewing Doctor</Text>
              <Text style={styles.detailValue}>{report.doctorName ?? 'Not yet assigned'}</Text>
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
