// components/DetailModal.js

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { ReportStyles as styles } from '../styles/ReportStyles';
import { CONDITION_CONFIG } from '../utils/ReportUtils';
import { exportReportAsPdf } from '../utils/ReportPDF';
import { COLORS } from '../assets/theme';

export default function DetailModal({ report, visible, onClose }) {
  const [exporting, setExporting] = useState(false);

  if (!report) return null;

  const cfg = CONDITION_CONFIG[report.condition] ?? CONDITION_CONFIG.normal;
  const confidencePct = typeof report.confidence === 'number'
    ? `${Math.round(report.confidence * 100)}%`
    : '—';

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* ── AidePoint letterhead ── */}
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
                <Text style={styles.reportMetaValue}>{report.id ?? '—'}</Text>
              </View>
            </View>

            {/* ── Patient header ── */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetName}>{report.patientName}</Text>
                <Text style={styles.sheetId}>
                  #{report.patientId} · {report.dateDisplay} · {report.timeDisplay}
                </Text>
              </View>
            </View>

            {/* ── Result banner ── */}
            <View style={[styles.resultBanner, { backgroundColor: cfg.badgeBg }]}>
              <Text style={[styles.resultBannerLabel, { color: cfg.badgeText }]}>
                CONDITION DETECTED
              </Text>
              <Text style={[styles.resultBannerValue, { color: cfg.badgeText }]}>
                {cfg.label}
              </Text>
              <Text style={[styles.resultBannerMorphology, { color: cfg.badgeText }]}>
                {cfg.morphology}
              </Text>
            </View>

            <Text style={styles.sectionHeading}>AI Analysis</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Confidence</Text>
              <Text style={styles.detailValue}>{confidencePct}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Urgency</Text>
              <Text style={[
                styles.detailValue,
                cfg.severity === 'red' && styles.detailValueFlagged,
              ]}>
                {cfg.urgency}
              </Text>
            </View>

            <Text style={styles.sectionHeading}>Patient Vitals</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Temperature</Text>
              <Text style={styles.detailValue}>{report.temperature ? `${report.temperature} °C` : '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Blood Pressure</Text>
              <Text style={styles.detailValue}>{report.bloodPressure ?? '—'}</Text>
            </View>

            <Text style={styles.sectionHeading}>Verification</Text>
            <View style={styles.verifyCard}>
              <View style={styles.verifyBadge}>
                <View style={[styles.verifyDot, { width: 9, height: 9, backgroundColor: report.labTechVerified ? COLORS.success : COLORS.border }]} />
                <View>
                  <Text style={styles.verifyBadgeLabel}>Lab Technician</Text>
                  <Text style={[styles.verifyBadgeStatus, { color: report.labTechVerified ? COLORS.success : COLORS.textMuted }]}>
                    {report.labTechVerified ? 'Verified' : 'Pending'}
                  </Text>
                </View>
              </View>
              <View style={styles.verifyBadge}>
                <View style={[styles.verifyDot, { width: 9, height: 9, backgroundColor: report.doctorVerified ? COLORS.success : COLORS.border }]} />
                <View>
                  <Text style={styles.verifyBadgeLabel}>Doctor</Text>
                  <Text style={[styles.verifyBadgeStatus, { color: report.doctorVerified ? COLORS.success : COLORS.textMuted }]}>
                    {report.doctorVerified ? 'Verified' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lab Technician</Text>
              <Text style={styles.detailValue}>{report.labTechName ?? '—'}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Reviewing Doctor</Text>
              <Text style={styles.detailValue}>{report.doctorName ?? 'Not yet assigned'}</Text>
            </View>

            {/* ── Export / Download ── */}
            <View style={styles.exportRow}>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExportPdf} disabled={exporting}>
                {exporting
                  ? <ActivityIndicator size="small" color={COLORS.primaryDark} />
                  : <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.primaryDark} />}
                <Text style={styles.exportBtnText}>{exporting ? 'Generating…' : 'Export PDF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={handleShareImage}>
                <MaterialIcons name="ios-share" size={18} color={COLORS.primaryDark} />
                <Text style={styles.exportBtnText}>Share Image</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.disclaimerNote}>
              This AI-assisted result is a screening aid only — it does not replace clinical
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
