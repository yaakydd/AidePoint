// utils/ReportUtils.js
//
// Two responsibilities:
//  1. buildReport()  — takes raw scan data and shapes it into a
//                      structured report object every screen can read.
//  2. saveReport()   — persists the report to the device using AsyncStorage.
//  3. loadReports()  — retrieves all stored reports (used by ReportScreen).
//
// We keep this in a separate utils file so ScanScreen, ReportScreen, and
// any future screens all work with the SAME data shape. If we ever change
// the report structure, we change it here and nowhere else.

import AsyncStorage from '@react-native-async-storage/async-storage';

// The AsyncStorage key where all reports are stored as a JSON array.
const REPORTS_STORAGE_KEY = 'aidepoint_reports_v1';

// Maps the short condition keys returned by the AI model to
// the full clinical names shown in the UI and on reports.
const CONDITION_MAP = {
  sickle:  'Sickle Cell Anaemia',
  malaria: 'Malarial Anaemia',
  anaemia: 'Iron Deficiency Anaemia',
  normal:  'No Condition Detected',
  // Add more as the model is trained on additional conditions:
  // thalassemia:  'Thalassemia',
  // aplastic:     'Aplastic Anaemia',
};

// Maps condition keys to a severity level used for colour-coding in the UI.
const SEVERITY_MAP = {
  sickle:  'red',
  malaria: 'red',
  anaemia: 'yellow',
  normal:  'green',
};

// ─── buildReport ─────────────────────────────────────────────────────────────
// Takes the raw inputs from ScanScreen and produces the structured report
// object used everywhere in the app.
//
// Usage:
//   const report = buildReport({ patientName, condition, confidence, ... });
//
export function buildReport({
  patientName,
  patientId,
  condition,
  confidence,
  labTechName,
  imageUri,
  temperature,
  bloodPressure,
  doctorId,
  doctorName,
}) {
  const now = new Date();

  return {
    // ── Identity
    id:           patientId,
    createdAt:    now.toISOString(),    // full timestamp for sorting
    // Human-readable date/time shown in the report header
    dateDisplay:  now.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    timeDisplay:  now.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
    }),

    // ── Patient
    patientName,
    patientId,
    temperature,
    bloodPressure,

    // ── AI result
    condition,                                        // short key: 'sickle', 'normal', etc.
    conditionLabel: CONDITION_MAP[condition] ?? condition, // full display name
    confidence,                                       // percentage: 85–99
    severity: SEVERITY_MAP[condition] ?? 'yellow',   // used for colour badges

    // ── Provenance
    labTechName,
    imageUri,
    doctorId,
    doctorName,

    // ── Verification (updated when lab tech / doctor sign off)
    labTechVerified: false,
    doctorVerified:  false,
    doctorNotes:     '',
    doctorSignature: null,
  };
}

// ─── saveReport ──────────────────────────────────────────────────────────────
// Persists a report to AsyncStorage.
// The reports array is stored as a JSON string under REPORTS_STORAGE_KEY.
// New reports are prepended so the most recent always comes first.
//
export async function saveReport(report) {
  try {
    // Read the existing reports array, or start fresh if nothing is stored
    const raw      = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];

    // Add the new report at the FRONT of the array (newest first)
    const updated  = [report, ...existing];

    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('[ReportUtils] saveReport failed:', error);
    return false;
  }
}

// ─── loadReports ─────────────────────────────────────────────────────────────
// Retrieves all saved reports. Called by ReportScreen on mount.
//
export async function loadReports() {
  try {
    const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[ReportUtils] loadReports failed:', error);
    return [];
  }
}

// ─── clearReports ────────────────────────────────────────────────────────────
// Dev/test helper. Not exposed to the user.
//
export async function clearReports() {
  await AsyncStorage.removeItem(REPORTS_STORAGE_KEY);
}
