// Single source of truth for all condition data and report persistence.
// Every screen that needs condition labels, colours, or storage reads from here.

import AsyncStorage from '@react-native-async-storage/async-storage';

// The backend performs a binary anemia screen (anemic vs not anemic) --
// it does not identify a specific disease type. An earlier version of
// this app had a second-stage classifier that predicted a specific
// condition (sickle cell, malaria, thalassemia, etc.), but that
// classifier was removed after its training data turned out to be
// threshold-derived rather than independently diagnosed, and because
// "Leukemia" had been included in that dataset as an anemia type, which
// it is not.
//
// Three buckets now, not two -- 'healthy' and 'other_condition' both
// mean "not anemic," but they're not the same result to hand a
// technician:
//   - healthy: not anemic, and nothing else was flagged either. A clean
//     result.
//   - other_condition: not anemic, but the scan surfaced something else
//     worth a second look -- a flagged morphology finding, or an
//     unreliable-result warning. Confirmed necessary from a real test:
//     a malaria-positive sample came back "not anemic," which is true,
//     but grouping it under "Healthy" implied a clean bill of health
//     the app never actually confirmed. See resolveConditionKey() below
//     for exactly how a result lands in one bucket versus the other.
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

// buildReport
// Shapes raw scan data into the structured report object used everywhere.
export const buildReport = ({
  patientName, patientId, condition, confidence,
  labTechName, imageUri, temperature, bloodPressure,
  doctorId, doctorName,
  morphologyFindings, cbcPatternSummary,
  isUnreliable, unreliableReasons, imageQuality,
  scanId,   // human-facing ID generated on the Scan screen (see Scan.jsx's
            // generateScanId()) -- the only ID ever shown in the UI.
            // `id` below stays as the internal/Supabase linkage key.
}) => {
  const now = new Date();

  const resolvedCondition = resolveConditionKey(
    condition === 'anemic',
    morphologyFindings,
    isUnreliable
  );

  const cfg = CONDITION_CONFIG[resolvedCondition] ?? CONDITION_CONFIG.healthy;

  return {
    //  Identity
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
    doctorId, doctorName,

    labTechNotes:    '',
    doctorVerified:  false,
    doctorNotes:     '',
    doctorSignature: null,
  };
};

// ── Report storage: scoped per-user ──
// Each technician gets their own storage bucket, keyed by their user id,
// so reports don't leak between accounts on a shared device (e.g. Tech
// A logs out, Tech B logs in on the same phone -- Tech B should only
// ever see their own reports, never Tech A's).
const REPORTS_STORAGE_PREFIX = 'aidepoint_reports_v1';

const getStorageKey = (userId) => `${REPORTS_STORAGE_PREFIX}:${userId}`;

//  saveReport 
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

//  loadReports 
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

// updateReportNotes
// Finds a saved report by id and persists a new labTechNotes value onto
// it. This is the actual mechanism behind "add notes instead of verify"
// -- without it, DetailModal's notes field would have nowhere to save
// to and would silently lose whatever the technician typed the moment
// the modal closed. Returns the updated reports array so the caller
// (ReportScreen) can refresh its in-memory list without a full re-fetch.
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
