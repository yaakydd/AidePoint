// utils/ReportUtils.js
// Single source of truth for all condition data and report persistence.
// Every screen that needs condition labels, colours, or storage reads from here.

import AsyncStorage from '@react-native-async-storage/async-storage';

// One storage key used by BOTH this file and ReportScreen.
// Exporting it prevents the key-mismatch bug where two files use different keys.
export const REPORTS_STORAGE_KEY = 'aidepoint_reports_v1';

// ─── ALL 8 CONDITIONS + NORMAL ────────────────────────────────────────────────
// Keys are short snake_case identifiers.
// The AI model returns these keys; everything else is derived from this table.
export const CONDITION_CONFIG = {

  sickle_cell: {
    label:      'Sickle Cell Anaemia',
    severity:   'red',
    badgeBg:    '#FFF0F0',
    badgeText:  '#B91C1C',
    badgeDot:   '#EF4444',
    urgency:    'High — urgent haematology referral required',
    // Morphology note shown in the report detail
    morphology: 'Crescent/sickle-shaped erythrocytes visible on peripheral smear',
  },

  iron_deficiency: {
    label:      'Iron Deficiency Anaemia',
    severity:   'yellow',
    badgeBg:    '#FFFBEB',
    badgeText:  '#92400E',
    badgeDot:   '#D97706',
    urgency:    'Moderate — iron panel and dietary review recommended',
    morphology: 'Hypochromic microcytic cells with increased central pallor',
  },

  malaria: {
    label:      'Malarial Anaemia',
    severity:   'red',
    badgeBg:    '#FEF9C3',
    badgeText:  '#854D0E',
    badgeDot:   '#CA8A04',
    urgency:    'High — commence anti-malarial treatment immediately',
    morphology: 'Ring-form intraerythrocytic parasites identified',
  },

  thalassemia: {
    label:      'Thalassemia',
    severity:   'yellow',
    badgeBg:    '#EFF6FF',
    badgeText:  '#1D4ED8',
    badgeDot:   '#3B82F6',
    urgency:    'Moderate-High — genetic counselling and specialist review advised',
    morphology: 'Target cells (codocytes) with microcytic hypochromic pattern',
  },

  pernicious: {
    label:      'Pernicious Anaemia',
    severity:   'yellow',
    badgeBg:    '#F5F3FF',
    badgeText:  '#6D28D9',
    badgeDot:   '#7C3AED',
    urgency:    'Moderate — vitamin B12 replacement therapy required',
    morphology: 'Macro-ovalocytes and hypersegmented neutrophils present',
  },

  megaloblastic: {
    label:      'Megaloblastic Anaemia',
    severity:   'yellow',
    badgeBg:    '#F0FDFA',
    badgeText:  '#0F766E',
    badgeDot:   '#0D9488',
    urgency:    'Moderate — folate/B12 deficiency workup required',
    morphology: 'Giant erythroid precursors with multilobed neutrophil nuclei',
  },

  aplastic: {
    label:      'Aplastic Anaemia',
    severity:   'red',
    badgeBg:    '#FFF5F5',
    badgeText:  '#991B1B',
    badgeDot:   '#DC2626',
    urgency:    'Critical — immediate bone marrow evaluation required',
    morphology: 'Severe pancytopenia; hypocellular marrow pattern indicated',
  },

  hemolytic: {
    label:      'Haemolytic Anaemia',
    severity:   'red',
    badgeBg:    '#FFF7ED',
    badgeText:  '#9A3412',
    badgeDot:   '#EA580C',
    urgency:    'High — Coombs test and haematology referral required',
    morphology: 'Schistocytes and helmet cells consistent with haemolysis',
  },

  normal: {
    label:      'Normal Result',
    severity:   'green',
    badgeBg:    '#ECFDF5',
    badgeText:  '#065F46',
    badgeDot:   '#10B981',
    urgency:    'None — routine follow-up recommended',
    morphology: 'No pathological cell morphology detected',
  },
};

// ─── buildReport ─────────────────────────────────────────────────────────────
// Shapes raw scan data into the structured report object used everywhere.
export function buildReport({
  patientName, patientId, condition, confidence,
  labTechName, imageUri, temperature, bloodPressure,
  doctorId, doctorName,
}) {
  const now = new Date();
  const cfg = CONDITION_CONFIG[condition] ?? CONDITION_CONFIG.normal;

  return {
    // ── Identity
    id:           patientId,
    createdAt:    now.toISOString(),   // ISO string — used for sorting and date display
    dateDisplay:  now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeDisplay:  now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),

    // ── Patient vitals
    patientName, patientId,
    temperature, bloodPressure,

    // ── AI result
    condition,
    conditionLabel: cfg.label,
    confidence,
    severity:       cfg.severity,
    morphology:     cfg.morphology,
    urgency:        cfg.urgency,

    // ── Personnel
    labTechName, imageUri,
    doctorId, doctorName,

    // ── Verification — updated when each party signs off
    labTechVerified: false,
    doctorVerified:  false,
    doctorNotes:     '',
    doctorSignature: null,
  };
}

// ─── saveReport ──────────────────────────────────────────────────────────────
export async function saveReport(report) {
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
}

// ─── loadReports ─────────────────────────────────────────────────────────────
// Used by ReportScreen on mount instead of duplicating AsyncStorage logic.
export async function loadReports() {
  try {
    const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[ReportUtils] loadReports failed:', error);
    return [];
  }
}

export async function clearReports() {
  await AsyncStorage.removeItem(REPORTS_STORAGE_KEY);
}
