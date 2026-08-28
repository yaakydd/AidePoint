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

// FALLBACK ONLY. The backend (services/condition.py's resolve_condition)
// is the single source of truth for this decision now -- /predict always
// returns a `condition` field, and every screen should pass that straight
// through rather than calling this. This exists only so a report can
// still get *a* reasonable condition if `condition` is ever genuinely
// missing (e.g. a report saved by an old app version, before the backend
// included this field, being reopened after an app update). Keep this in
// exact sync with resolve_condition()'s rule if that rule ever changes --
// mismatched logic here is exactly the bug class this fallback exists
// to avoid becoming.
export const resolveConditionKey = (isAnemic, morphologyFindings, isUnreliable) => {
  if (isUnreliable) return 'unknown';

  if (isAnemic) return 'anemic';

  const hasFlaggedMorphology = Object.entries(morphologyFindings ?? {}).some(
    ([flagName, finding]) => flagName !== 'normal_morphology' && finding?.flagged === true
  );

  if (hasFlaggedMorphology) return 'unknown';

  return 'healthy';
};


export const buildReport = ({
  patientName, patientId, condition, isAnemic, confidence,
  labTechName, imageUri, temperature, bloodPressure,
  morphologyFindings, cbcPatternSummary,
  isUnreliable, unreliableReasons, imageQuality,
  scanId,   // human-facing ID generated on the Scan screen (see Scan.jsx's
            // generateScanId()) -- the only ID ever shown in the UI.
            // `id` below stays as the internal/Supabase linkage key.
}) => {
  const now = new Date();
  // `condition` should always be present -- it comes straight from the
  // backend's /predict response via Scan.jsx/TransparencyTrail.jsx. The
  // fallback only fires for the legacy case described above, and needs
  // the real isAnemic (not a hardcoded false) to be correct in that case.
  const resolvedCondition = condition ?? resolveConditionKey(
    isAnemic ?? false,
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


// ─────────────────────────────────────────────────────────────
// Severity → color, single source of truth.
// Both the cell overlay drawn on the image (CellOverlay.js) and every
// legend/breakdown list (TransparencyTrail.js, DetailModal.js) must
// call THIS function -- never re-derive the RGB blend locally, or the
// dots on the photo and the legend swatches will silently drift apart.
// ─────────────────────────────────────────────────────────────
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

// Same three bands used everywhere a breakdown or scale is shown.
export const SEVERITY_BUCKETS = [
  { key: 'normal',  label: 'Normal shape',   min: 0.0,  max: 0.33 },
  { key: 'mild',    label: 'Mild variation', min: 0.33, max: 0.66 },
  { key: 'unusual', label: 'Unusual shape',  min: 0.66, max: 1.001 }, // 1.001: severity===1.0 falls in top bucket
];

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