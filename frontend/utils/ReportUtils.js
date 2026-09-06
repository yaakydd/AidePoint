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

// Filters a raw morphology_findings dict down to the flags that should
// actually be shown in a report. Plain `flagged === true` isn't enough on
// its own: normal_morphology is itself a flag that can be true at the same
// time as real abnormal flags (independent per-flag sigmoids, no
// mutual-exclusivity constraint between them), which previously rendered
// self-contradictory lists like "Hypochromic, Microcytic, Elliptocyte,
// Normal Morphology" together. normal_morphology is only suppressed when
// at least one other flag also fired -- if it's the ONLY flag flagged, it
// still shows, since that's the legitimate "no abnormalities found" case
// (deliberately not a blanket exclusion, see the project's prior decision
// to keep normal_morphology visible as a standalone finding).
export const filterDisplayableMorphologyFindings = (morphologyFindings) => {
  const entries = Object.entries(morphologyFindings ?? {}).filter(
    ([, finding]) => finding?.flagged === true
  );
  const hasOtherFlaggedFinding = entries.some(([flagName]) => flagName !== 'normal_morphology');
  if (!hasOtherFlaggedFinding) return entries;
  return entries.filter(([flagName]) => flagName !== 'normal_morphology');
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

// Must match ECCENTRICITY_LIMIT / CIRCULARITY_FLOOR in
// backend/services/shape_screening.py exactly -- this is the same
// AND-based test that backend's flagged_count and needs_review use, so
// the "Unusual shape" bucket count below always agrees with the
// headline "X flagged for unusual shape" caption and with "Review
// recommended". Keep in sync if those backend constants ever change.
const ECCENTRICITY_LIMIT = 0.55;
const CIRCULARITY_FLOOR = 0.55;

const isFlaggedCell = (cell) =>
  cell.eccentricity > ECCENTRICITY_LIMIT && cell.circularity < CIRCULARITY_FLOOR;

// CHANGED: the "Unusual shape" bucket used to be assigned purely by
// severity >= 0.66 -- but severity is max(eccentricity_component,
// circularity_component), i.e. a cell lands in "unusual" if EITHER
// metric alone crosses its limit. That's OR logic, while flagged_count
// (the headline "X flagged for unusual shape" caption) and
// needs_review/"Review recommended" both use AND (both metrics must
// cross). The two numbers could disagree on the same image -- the same
// contradiction this whole fix was meant to eliminate, just relocated
// from the caption itself into this breakdown list sitting right below
// it.
//
// Fix: decide "unusual" membership with the SAME AND test flagged_count
// uses (isFlaggedCell, above), so this bucket's count always matches
// the headline number exactly. "Normal" vs "mild" for the remaining,
// non-flagged cells is still a matter of degree, not a pass/fail
// signal shown elsewhere, so those two keep using the continuous
// severity score and its existing 0/0.33 split.
export const computeSeverityBreakdown = (cells) => {
  const total = cells.length;
  return SEVERITY_BUCKETS.map((bucket) => {
    // NOTE: 'unusual' membership is AND-based (isFlaggedCell) rather than
    // severity-based, but severity itself is OR-based (max of the two
    // components) -- so a non-flagged cell can still have severity >=
    // 0.66 (one metric alone crossed its limit). Such a cell must NOT
    // fall through to nowhere: it isn't flagged, so it can't be
    // 'unusual', and it has no severity upper bound left to exclude it
    // from 'mild'. So 'mild' is everything non-flagged with severity >=
    // 0.33, with no upper cutoff -- every cell lands in exactly one of
    // the three buckets, and the three counts always sum to `total`.
    const count = cells.filter((cell) => {
      if (isFlaggedCell(cell)) return bucket.key === 'unusual';
      if (bucket.key === 'unusual') return false;
      if (bucket.key === 'mild') return cell.severity >= 0.33;
      return cell.severity < 0.33; // 'normal'
    }).length;
    const midpoint = (bucket.min + Math.min(bucket.max, 1)) / 2;
    return {
      ...bucket,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
      color: severityToColor(midpoint),
    };
  });
};
