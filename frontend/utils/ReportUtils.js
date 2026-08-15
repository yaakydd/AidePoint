import AsyncStorage from '@react-native-async-storage/async-storage';
import { updatePredictionNotes } from './api';
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
    label:      'Healthy',
    severity:   'green',
    badgeBg:    '#ECFDF5',
    badgeText:  '#065F46',
    badgeDot:   '#10B981',
    urgency:    'None -- routine follow-up recommended',
    morphology: 'No significant abnormal cell morphology detected',
  },

  unknown: {
    label:      'Unknown',
    severity:   'blue',
    badgeBg:    '#EBF8FF',
    badgeText:  '#1D4ED8',
    badgeDot:   '#3182CE',
    urgency:    'Anemia not indicated, but other findings were noted, clinical correlation advised',
    morphology: 'Non-anemia-related findings detected, see report for details',
  },
};

export const resolveConditionKey = (isAnemic, morphologyFindings, isUnreliable) => {
  if (isAnemic) return 'anemic';

  const hasFlaggedMorphology = Object.values(morphologyFindings ?? {}).some(
    (finding) => finding?.flagged === true
  );

  if (hasFlaggedMorphology || isUnreliable) return 'unknown';

  return 'healthy';
};


export const buildReport = ({
  patientName, patientId, condition, confidence,
  labTechName, imageUri, temperature, bloodPressure,
  morphologyFindings, cbcPatternSummary,
  isUnreliable, unreliableReasons, imageQuality,
  scanId,   // human-facing ID generated on the Scan screen (see Scan.jsx's
            // generateScanId()) -- the only ID ever shown in the UI.
            // `id` below stays as the internal/Supabase linkage key.
}) => {
  const now = new Date();
  const resolvedCondition = condition ?? resolveConditionKey(
    false, 
    morphologyFindings,
    isUnreliable
  );

  const cfg = CONDITION_CONFIG[resolvedCondition] ?? CONDITION_CONFIG.healthy;

  return {
    // ── Identity
    id:           patientId,   // placeholder until Scan.jsx overwrites this with scanRow.id post-insert; never displayed
    scanId:       scanId ?? null,   // short, human-facing scan identifier -- shown in DetailModal/TransparencyTrail headers
    createdAt:    now.toISOString(),
    dateDisplay:  now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeDisplay:  now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),

    // ── Patient vitals
    patientName, patientId,   // patientId retained for internal search/lookup only -- never displayed as an ID
    temperature, bloodPressure,

    condition:      resolvedCondition,
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

    labTechName, imageUri,

    labTechNotes: '',
  };
};

const REPORTS_STORAGE_PREFIX = 'aidepoint_reports_v1';

const getStorageKey = (userId) => `${REPORTS_STORAGE_PREFIX}:${userId}`;

export const saveReport = async (report, userId) => {
  try {
    const key = getStorageKey(userId);
    const raw = await AsyncStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [report, ...existing]; // newest first
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('[ReportUtils] saveReport failed:', error);
    return false;
  }
};

// ── loadReports ──
// Used by ReportScreen on mount instead of duplicating AsyncStorage logic.
export const loadReports = async (userId) => {
  try {
    const key = getStorageKey(userId);
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[ReportUtils] loadReports failed:', error);
    return [];
  }
};

export const clearReports = async (userId) => {
  await AsyncStorage.removeItem(getStorageKey(userId));
};


export const updateReportNotes = async (reportId, notes, userId) => {
  try {
    const key = getStorageKey(userId);
    const raw = await AsyncStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = existing.map((report) =>
      String(report.id) === String(reportId)
        ? { ...report, labTechNotes: notes }
        : report
    );
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('[ReportUtils] updateReportNotes failed:', error);
    throw error;
  }
};