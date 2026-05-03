/**
 * reportUtils.js — Aidepoint Medical App
 *
 * Shared constants and helpers used by BOTH the Scan screen
 * (to build a report after AI prediction) and the Reports screen
 * (to display and persist reports).
 *
 * Import in Scan screen:
 *   import { buildReport, STORAGE_KEY } from '../utils/reportUtils';
 *
 * Import in Reports screen:
 *   import { STORAGE_KEY, CONDITIONS } from '../utils/reportUtils';
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage Key ──────────────────────────────────────────────────────────────
// Single source of truth — both screens must use this exact key.

export const STORAGE_KEY = '@aidepoint_reports';

// ─── Condition Config ─────────────────────────────────────────────────────────
// The Scan screen's AI model returns one of these four keys.

export const CONDITIONS = {
  sickle: {
    label:    'Sickle Cell Detected',
    badgeBg:  '#FFF0F0',
    badgeText:'#C0392B',
    badgeDot: '#E74C3C',
    iconBg:   '#FFF0F0',
    urgency:  'High — refer to haematologist',
    autoNote: 'Crescent-shaped red blood cells detected by AI analysis. Please confirm under microscopy and refer to a haematologist.',
  },
  malaria: {
    label:    'Malaria Detected',
    badgeBg:  '#FFF8EC',
    badgeText:'#B07D00',
    badgeDot: '#F39C12',
    iconBg:   '#FFF8EC',
    urgency:  'High — commence anti-malarial treatment',
    autoNote: 'Plasmodium parasites detected within red blood cells. Commence treatment protocol and notify attending physician.',
  },
  anaemia: {
    label:    'Anaemia Detected',
    badgeBg:  '#F5F0FF',
    badgeText:'#6C3EC1',
    badgeDot: '#8E44AD',
    iconBg:   '#F5F0FF',
    urgency:  'Moderate — iron panel recommended',
    autoNote: 'Pale, hypochromic red blood cells indicate possible iron deficiency anaemia. Iron panel and dietary assessment recommended.',
  },
  normal: {
    label:    'Normal Result',
    badgeBg:  '#EEFBF3',
    badgeText:'#1A7340',
    badgeDot: '#27AE60',
    iconBg:   '#EEFBF3',
    urgency:  'None — routine follow-up only',
    autoNote: 'No abnormalities detected. Red blood cell morphology and distribution within normal parameters.',
  },
};

// ─── Patient ID Generator ─────────────────────────────────────────────────────
// Generates IDs in the format AP-YYYY-XXXX (e.g. AP-2025-4821)

export function generatePatientId() {
  const year   = new Date().getFullYear();
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `AP-${year}-${serial}`;
}

// ─── Report Builder ───────────────────────────────────────────────────────────
// Call this in the Scan screen once the AI model returns its prediction.
//
// Usage example in ScanScreen.js:
//
//   import { buildReport } from '../utils/reportUtils';
//
//   const report = buildReport({
//     patientName: formValues.name,        // from the form the lab tech fills
//     patientId:   formValues.id,          // typed in, or auto-generated
//     condition:   prediction.label,       // 'sickle' | 'malaria' | 'anaemia' | 'normal'
//     confidence:  prediction.confidence,  // e.g. 94.2
//     labTechName: currentUser.name,       // from auth context
//     imageUri:    capturedPhoto.uri,      // from expo-camera
//     extraNotes:  formValues.notes,       // optional notes from the lab tech
//   });
//
//   // Navigate to Reports screen — it will prepend this report to the list
//   navigation.navigate('Reports', { newReport: report });

export function buildReport({
  patientName,
  patientId,
  condition,
  confidence,
  labTechName,
  imageUri    = null,
  extraNotes  = '',
}) {
  const cfg      = CONDITIONS[condition] ?? CONDITIONS.normal;
  const autoNote = cfg.autoNote;
  const notes    = extraNotes
    ? `${autoNote} Additional notes: ${extraNotes}`
    : autoNote;

  return {
    id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    patientName: patientName.trim(),
    patientId:   patientId   || generatePatientId(),
    condition,                      // 'sickle' | 'malaria' | 'anaemia' | 'normal'
    confidence:  Number(confidence),
    timestamp:   new Date().toISOString(),
    labTechName: labTechName.trim(),
    notes,
    imageUri,
  };
}

// ─── Persistence Helpers ──────────────────────────────────────────────────────
// Optional: call these directly from ScanScreen if you want to save
// without navigating away first.

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

export async function getAllReports() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[Aidepoint] getAllReports failed:', err);
    return [];
  }
}

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

export async function clearAllReports() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[Aidepoint] clearAllReports failed:', err);
  }
}