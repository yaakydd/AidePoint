// Single source of truth for all condition data and report persistence.
// Every screen that needs condition labels, colours, or storage reads from here.

import AsyncStorage from '@react-native-async-storage/async-storage';

// One storage key used by BOTH this file and ReportScreen.
// Exporting it prevents the key-mismatch bug where two files use different keys.
export const REPORTS_STORAGE_KEY = 'aidepoint_reports_v1';

// The backend performs a binary anemia screen (anemic vs healthy) --
// it does not identify a specific disease type. An earlier version of
// this app had a second-stage classifier that predicted a specific
// condition (sickle cell, malaria, thalassemia, etc.), but that
// classifier was removed after its training data turned out to be
// threshold-derived rather than independently diagnosed, and because
// "Leukemia" had been included in that dataset as an anemia type, which
// it is not. Only these two keys are valid now; anything else falls
// back to the "healthy" config below.
export const CONDITION_CONFIG = {

  anemic: {
    label:      'Anemia Suspected',
    severity:   'red',
    badgeBg:    '#FFF0F0',
    badgeText:  '#B91C1C',
    badgeDot:   '#EF4444',
    urgency:    'Confirm with laboratory CBC testing and clinical evaluation',
    morphology: 'Abnormal red cell morphology detected -- see report for details',
  },

  healthy: {
    label:      'No Anemia Indicated',
    severity:   'green',
    badgeBg:    '#ECFDF5',
    badgeText:  '#065F46',
    badgeDot:   '#10B981',
    urgency:    'None -- routine follow-up recommended',
    morphology: 'No significant abnormal cell morphology detected',
  },
};

// buildReport
// Shapes raw scan data into the structured report object used everywhere.
export const buildReport = ({
  patientName, patientId, condition, confidence,
  labTechName, imageUri, temperature, bloodPressure,
  doctorId, doctorName,
  // Real per-scan data from the backend response, distinct from the
  // fixed config-level text above -- morphologyFindings and
  // cbcPatternSummary vary per scan, so they need to be stored on the
  // report itself, not derived from CONDITION_CONFIG at display time.
  morphologyFindings, cbcPatternSummary,
  isUnreliable, unreliableReasons, imageQuality,
}) => {
  const now = new Date();
  const cfg = CONDITION_CONFIG[condition] ?? CONDITION_CONFIG.healthy;

  return {
    //  Identity
    id:           patientId,
    createdAt:    now.toISOString(),   // ISO string -- used for sorting and date display
    dateDisplay:  now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeDisplay:  now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),

    // ── Patient vitals
    patientName, patientId,
    temperature, bloodPressure,

    // AI result : fixed config text (label/urgency/generic morphology
    // description) plus the real per-scan findings from this specific scan
    condition,
    conditionLabel: cfg.label,
    confidence,
    severity:       cfg.severity,
    morphology:     cfg.morphology,
    urgency:        cfg.urgency,
    morphologyFindings: morphologyFindings ?? {},
    cbcPatternSummary:  cbcPatternSummary ?? {},
    isUnreliable:       isUnreliable ?? false,
    unreliableReasons:  unreliableReasons ?? [],
    imageQuality:       imageQuality ?? null,

    //  Personnel
    labTechName, imageUri,
    doctorId, doctorName,

    //  Verification : updated when each party signs off
    labTechVerified: false,
    doctorVerified:  false,
    doctorNotes:     '',
    doctorSignature: null,
  };
};

//  saveReport 
export const saveReport = async (report) => {
  try {
    const raw      = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated  = [report, ...existing]; // newest first
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('[ReportUtils] saveReport failed:', error);
    return false;
  }
};

//  loadReports 
// Used by ReportScreen on mount instead of duplicating AsyncStorage logic.
export const loadReports = async () => {
  try {
    const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[ReportUtils] loadReports failed:', error);
    return [];
  }
};

export const clearReports = async () => {
  await AsyncStorage.removeItem(REPORTS_STORAGE_KEY);
};
