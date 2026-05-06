// reportUtils.js
// Shared helpers used by ScanScreen to build and save reports,
// and by ReportsScreen to read them.
//
// Import in ScanScreen:
//   import { buildReport, saveReport } from '../utils/reportUtils';
//
// Import in ReportsScreen (only needs STORAGE_KEY):
//   import { STORAGE_KEY } from '../utils/reportUtils';

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE KEY
// One key for the entire reports list. Both screens must use this exact string.
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEY = '@aidepoint_reports';

// ─────────────────────────────────────────────────────────────────────────────
// CONDITION CONFIG
// The AI model returns one of the four keys below.
// Each entry holds the display label, badge colours, urgency text,
// and auto-generated clinical note.
// ─────────────────────────────────────────────────────────────────────────────

export const CONDITIONS = {
  sickle: {
    label:     'Sickle Cell Detected',
    badgeBg:   '#FFF0F0',
    badgeText: '#C0392B',
    badgeDot:  '#E74C3C',
    iconBg:    '#FFF0F0',
    urgency:   'High — refer to haematologist',
    autoNote:  'Crescent-shaped red blood cells detected by AI analysis. Please confirm under microscopy and refer to a haematologist.',
  },
  malaria: {
    label:     'Malaria Detected',
    badgeBg:   '#FFF8EC',
    badgeText: '#B07D00',
    badgeDot:  '#F39C12',
    iconBg:    '#FFF8EC',
    urgency:   'High — commence anti-malarial treatment',
    autoNote:  'Plasmodium parasites detected within red blood cells. Commence treatment protocol and notify attending physician.',
  },
  anaemia: {
    label:     'Anaemia Detected',
    badgeBg:   '#F5F0FF',
    badgeText: '#6C3EC1',
    badgeDot:  '#8E44AD',
    iconBg:    '#F5F0FF',
    urgency:   'Moderate — iron panel recommended',
    autoNote:  'Pale, hypochromic red blood cells indicate possible iron deficiency anaemia. Iron panel and dietary assessment recommended.',
  },
  normal: {
    label:     'Normal Result',
    badgeBg:   '#EEFBF3',
    badgeText: '#1A7340',
    badgeDot:  '#27AE60',
    iconBg:    '#EEFBF3',
    urgency:   'None — routine follow-up only',
    autoNote:  'No abnormalities detected. Red blood cell morphology and distribution within normal parameters.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// buildReport
//
// Assembles a complete report object from scan inputs + AI prediction.
// Called in ScanScreen immediately after runAIAnalysis() returns.
//
// Parameters:
//   patientName   — from the patient name TextInput
//   patientId     — the auto-generated Scan ID (AP-YYYY-XXXX)
//   condition     — AI prediction key: 'sickle' | 'malaria' | 'anaemia' | 'normal'
//   confidence    — AI confidence score (0–100)
//   labTechName   — logged-in lab tech name (will come from auth later)
//   imageUri      — local file path from CameraView
//   temperature   — from the temperature TextInput
//   bloodPressure — from the blood pressure TextInput
//   doctorId      — id of the selected doctor
//   doctorName    — full name of the selected doctor
//   extraNotes    — any optional extra notes typed by the lab tech (default: '')
// ─────────────────────────────────────────────────────────────────────────────

export function buildReport({
  patientName,
  patientId,
  condition,
  confidence,
  labTechName,
  imageUri      = null,
  temperature   = '',
  bloodPressure = '',
  doctorId      = null,
  doctorName    = null,
  extraNotes    = '',
}) {
  const cfg      = CONDITIONS[condition] ?? CONDITIONS.normal;
  const baseNote = cfg.autoNote;
  const notes    = extraNotes.trim()
    ? `${baseNote} Additional notes: ${extraNotes.trim()}`
    : baseNote;

  return {
    // Unique ID combining timestamp + random suffix to prevent duplicates
    id:           `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    // Patient identifiers
    patientName:  patientName.trim(),
    patientId,

    // AI result
    condition,                       // 'sickle' | 'malaria' | 'anaemia' | 'normal'
    confidence:   Number(confidence),

    // Vital signs captured before scanning
    temperature:  temperature.trim(),
    bloodPressure: bloodPressure.trim(),

    // Who created the report
    labTechName:  labTechName.trim(),

    // Doctor the report is sent to
    doctorId,
    doctorName,

    // Auto-generated clinical notes
    notes,

    // Image
    imageUri,

    // Creation time — used for sorting and display
    timestamp:    new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Save a new report to the top of the stored list
export async function saveReport(report) {
  try {
    const raw      = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated  = [report, ...existing];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[Aidepoint] saveReport failed:', err);
    return null;
  }
}

// Get all stored reports
export async function getAllReports() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[Aidepoint] getAllReports failed:', err);
    return [];
  }
}

// Delete a specific report by its ID
export async function deleteReport(reportId) {
  try {
    const raw      = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((r) => r.id !== reportId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.warn('[Aidepoint] deleteReport failed:', err);
    return null;
  }
}

// Wipe all reports (useful for testing or logout)
export async function clearAllReports() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[Aidepoint] clearAllReports failed:', err);
  }
}
