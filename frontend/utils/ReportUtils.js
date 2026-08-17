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

// ── Cell shape severity buckets ──
// Single source of truth for bucketing/coloring cell_overlay.cells by
// severity, shared between TransparencyTrail.jsx (right after a scan)
// and DetailModal.js (viewing a saved report later) so both screens
// always agree on what "Normal / Mild / Unusual" means and never drift
// out of sync with each other.
export const SEVERITY_BUCKETS = [
  { key: 'normal',  label: 'Normal shape',   min: 0.0,  max: 0.33 },
  { key: 'mild',    label: 'Mild variation', min: 0.33, max: 0.66 },
  { key: 'unusual', label: 'Unusual shape',  min: 0.66, max: 1.001 }, // 1.001: severity===1.0 falls in top bucket
];

// Mirrors the gradient math in shape_screening.py's compute_severity_color()
// and (previously) TransparencyTrail.jsx's local severityToColor() -- kept
// here now as the one copy, so a saved report's breakdown swatches always
// match the colors actually drawn on the overlay.
export const severityToColor = (severityScore) => {
  let redValue, greenValue, blueValue;
  if (severityScore < 0.5) {
    const blendRatio = severityScore / 0.5;
    redValue   = Math.round(0x16 + (0xEA - 0x16) * blendRatio);
    greenValue = Math.round(0xA3 + (0xB3 - 0xA3) * blendRatio);
    blueValue  = Math.round(0x4A + (0x08 - 0x4A) * blendRatio);
  } else {
    const blendRatio = (severityScore - 0.5) / 0.5;
    redValue   = Math.round(0xEA + (0xDC - 0xEA) * blendRatio);
    greenValue = Math.round(0xB3 + (0x26 - 0xB3) * blendRatio);
    blueValue  = Math.round(0x08 + (0x26 - 0x08) * blendRatio);
  }
  const toHex = (n) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(redValue)}${toHex(greenValue)}${toHex(blueValue)}`;
};

export const computeSeverityBreakdown = (cells) => {
  const total = cells.length;
  return SEVERITY_BUCKETS.map((bucket) => {
    const count = cells.filter(
      (cell) => cell.severity >= bucket.min && cell.severity < bucket.max
    ).length;
    const midpoint = (bucket.min + Math.min(bucket.max, 1)) / 2;
    return {
      ...bucket,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
      color: severityToColor(midpoint),
    };
  });
};

export const buildReport = ({
  patientName, patientId, condition, confidence,
  confidenceLabel,   // 'high' | 'moderate' | 'low' -- explanation.confidence tier,
                      // kept alongside the raw numeric `confidence` (anemia_probability)
                      // rather than instead of it, so DetailModal/ReportPDF can show
                      // both the percentage and the human-readable tier.
  labTechName, imageUri, temperature, bloodPressure,
  morphologyFindings, cbcPatternSummary,
  isUnreliable, unreliableReasons, imageQuality,
  cellOverlay,   // full cell_overlay object from the prediction response
                 // ({ cells, cell_count, flagged_count }) -- stored in full so
                 // DetailModal can redraw the shape overlay on the saved image
                 // later, not just show summary counts.
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
    confidence,             // numeric 0-1 anemia_probability, or undefined/null when condition is 'unknown'
    confidenceLabel: confidenceLabel ?? null,   // 'high' | 'moderate' | 'low'
    severity:       cfg.severity,
    morphology:     cfg.morphology,
    urgency:        cfg.urgency,
    morphologyFindings: morphologyFindings ?? {},
    cbcPatternSummary:  cbcPatternSummary ?? {},
    isUnreliable:       isUnreliable ?? false,
    unreliableReasons:  unreliableReasons ?? [],
    imageQuality:       imageQuality ?? null,
    cellOverlay:        cellOverlay ?? null,

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
