// Single source of truth for all condition data and report persistence.
// Every screen that needs condition labels, colours, or storage reads from here.

import AsyncStorage from '@react-native-async-storage/async-storage';

// One storage key used by BOTH this file and ReportScreen.
// Exporting it prevents the key-mismatch bug where two files use different keys.
export const REPORTS_STORAGE_KEY = 'aidepoint_reports_v1';

// The backend performs a binary anemia screen (anemic vs not anemic) --
// it does not identify a specific disease type. An earlier version of
// this app had a second-stage classifier that predicted a specific
// condition (sickle cell, malaria, thalassemia, etc.), but that
// classifier was removed after its training data turned out to be
// threshold-derived rather than independently diagnosed, and because
// "Leukemia" had been included in that dataset as an anemia type, which
// it is not.
//
// Three buckets now, not two -- 'healthy' and 'no_anemia' both mean "not
// anemic," but they're not the same result to hand a technician:
//   - healthy: not anemic, and nothing else was flagged either. A clean
//     result.
//   - no_anemia: not anemic, but the scan surfaced something else worth
//     a second look -- a flagged morphology finding, or an unreliable-
//     result warning. Confirmed necessary from a real test: a malaria-
//     positive sample came back "not anemic," which is true, but
//     grouping it under "Healthy" implied a clean bill of health the
//     app never actually confirmed. See resolveConditionKey() below for
//     exactly how a result lands in one bucket versus the other.
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

  // Blue/"info" rather than red or green -- deliberately not an alarm
  // colour (this isn't a positive anemia result) and deliberately not
  // the same green as a genuinely clean result either. COLORS.info /
  // COLORS.infoBg from theme.js already exist for exactly this kind of
  // "notable, not urgent" signal, so this reuses the app's existing
  // semantic color rather than inventing a new one.
  no_anemia: {
    label:      'No Anemia Indicated',
    severity:   'blue',
    badgeBg:    '#EBF8FF',
    badgeText:  '#1D4ED8',
    badgeDot:   '#3182CE',
    urgency:    'Anemia not indicated, but other findings were noted -- clinical correlation advised',
    morphology: 'Non-anemia-related findings detected -- see report for details',
  },
};

// resolveConditionKey
// Decides which of the three CONDITION_CONFIG buckets a scan actually
// belongs in. Anemic results are never ambiguous -- is_anemic is the
// whole call there. Not-anemic results need one more check: did
// anything else get flagged on this scan? If so, this is a "no_anemia"
// result, not a plain "healthy" one.
//
// Exported so TransparencyTrail.js (the immediate post-scan result
// modal) can use the exact same resolution buildReport() uses below --
// without sharing this, the same scan could show "Healthy" in the
// modal the instant it completes, then "No Anemia Indicated" once
// saved and viewed again in Reports, which would look like a bug even
// though both are technically derived from the same data.
export const resolveConditionKey = (isAnemic, morphologyFindings, isUnreliable) => {
  if (isAnemic) return 'anemic';

  const hasFlaggedMorphology = Object.values(morphologyFindings ?? {}).some(
    (finding) => finding?.flagged === true
  );

  if (hasFlaggedMorphology || isUnreliable) return 'no_anemia';

  return 'healthy';
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
  // morphologyFindings and isUnreliable are also what resolveConditionKey
  // uses to decide between 'healthy' and 'no_anemia' below.
  morphologyFindings, cbcPatternSummary,
  isUnreliable, unreliableReasons, imageQuality,
}) => {
  const now = new Date();

  // `condition` is still accepted as the caller's is_anemic-derived
  // 'anemic' | 'healthy' guess (see Scan.js), but resolveConditionKey is
  // the actual source of truth for the final bucket -- this is what
  // upgrades a not-anemic-but-flagged result from 'healthy' to
  // 'no_anemia' before anything gets saved or displayed.
  const resolvedCondition = resolveConditionKey(
    condition === 'anemic',
    morphologyFindings,
    isUnreliable
  );

  const cfg = CONDITION_CONFIG[resolvedCondition] ?? CONDITION_CONFIG.healthy;

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

    //  Personnel
    labTechName, imageUri,
    doctorId, doctorName,

    // FIXED: labTechVerified/doctorVerified were a pending/approved
    // toggle the technician had no real reason to interact with --
    // replaced with labTechNotes, a free-text field the technician can
    // actually fill in. doctorVerified/doctorNotes/doctorSignature stay
    // as-is; only the technician side of the workflow changes here.
    labTechNotes:    '',
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

// updateReportNotes
// Finds a saved report by id and persists a new labTechNotes value onto
// it. This is the actual mechanism behind "add notes instead of verify"
// -- without it, DetailModal's notes field would have nowhere to save
// to and would silently lose whatever the technician typed the moment
// the modal closed. Returns the updated reports array so the caller
// (ReportScreen) can refresh its in-memory list without a full re-fetch.
export const updateReportNotes = async (reportId, notes) => {
  try {
    const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = existing.map((report) =>
      String(report.id) === String(reportId)
        ? { ...report, labTechNotes: notes }
        : report
    );
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('[ReportUtils] updateReportNotes failed:', error);
    throw error;
  }
};