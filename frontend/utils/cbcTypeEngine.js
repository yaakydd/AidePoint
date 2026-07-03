// utils/cbcTypeEngine.js
//
// Rule-based anemia type inference from predicted CBC + morphology values.
// Implements the Wintrobe MCV classification system with secondary refinements.
//
// This runs CLIENT-SIDE on the phone after the model returns CBC predictions.
// No network call needed — pure clinical logic.
//
// Returns a suggestion shown to the lab technician in the notes modal.
// The technician then confirms, suspects, or disagrees with their own notes.

const SENTINEL = -1.0;

// ── Clinical labels shown in the UI ─────────────────────────────────────────
export const CONDITION_LABELS = {
  iron_deficiency: 'Iron Deficiency Anaemia',
  thalassemia:     'Thalassemia',
  megaloblastic:   'Megaloblastic Anaemia',
  pernicious:      'Pernicious Anaemia (B12 Deficiency)',
  aplastic:        'Aplastic Anaemia',
  hemolytic:       'Haemolytic Anaemia',
  sickle_cell:     'Sickle Cell Anaemia',
  malaria:         'Malarial Anaemia',
  normal:          'No Anaemia Detected',
  unclassified:    'Anaemia — Type Undetermined',
};

// ── Severity for UI colouring ────────────────────────────────────────────────
export const CONDITION_SEVERITY = {
  aplastic:        'critical',
  sickle_cell:     'high',
  malaria:         'high',
  hemolytic:       'high',
  thalassemia:     'moderate',
  iron_deficiency: 'moderate',
  megaloblastic:   'moderate',
  pernicious:      'moderate',
  normal:          'none',
  unclassified:    'moderate',
};

// ── Helper ───────────────────────────────────────────────────────────────────
function get(cbcValues, key, fallback = SENTINEL) {
  const v = cbcValues?.[key];
  return (v !== undefined && v !== SENTINEL) ? v : fallback;
}

function morphPresent(morphFlags, key) {
  const v = morphFlags?.[key];
  return typeof v === 'number' ? v > 0.5 : v === true;
}

// ── Main inference function ──────────────────────────────────────────────────
/**
 * Infers likely anemia type from CBC predictions and morphology flags.
 *
 * @param {object} cbcValues     — denormalized CBC values from model
 * @param {object} cbcFlags      — 'LOW' | 'HIGH' | 'NORMAL' per CBC key
 * @param {object} morphFlags    — probability per morphology key (0-1)
 * @param {number} anemiaProb    — binary head output (0-1)
 * @returns {object}
 *   {
 *     type:       string,   — condition key
 *     label:      string,   — human-readable label
 *     confidence: number,   — 0-1
 *     severity:   string,
 *     reasoning:  string[],  — bullet points shown to technician
 *     caveats:    string[],  — limitations / what to rule out
 *   }
 */
export function inferAnemiaType(cbcValues, cbcFlags, morphFlags, anemiaProb) {
  const reasoning = [];
  const caveats   = [];

  // ── Step 0: Not anemic ────────────────────────────────────────────────────
  if (anemiaProb < 0.40) {
    return {
      type:       'normal',
      label:      CONDITION_LABELS.normal,
      confidence: Math.round((1 - anemiaProb) * 100),
      severity:   'none',
      reasoning:  ['Haemoglobin within acceptable range',
                   'No significant anaemia pattern detected in CBC values'],
      caveats:    ['Clinical correlation recommended if patient is symptomatic'],
    };
  }

  // Pull key CBC values
  const hb   = get(cbcValues, 'HAEMOGLOBIN');
  const mcv  = get(cbcValues, 'MCV');
  const mch  = get(cbcValues, 'MCH');
  const mchc = get(cbcValues, 'MCHC');
  const rdw  = get(cbcValues, 'RDW_CV');
  const wbc  = get(cbcValues, 'WBC');
  const plt  = get(cbcValues, 'PLATELETS');
  const rbc  = get(cbcValues, 'RBC');
  const neut = get(cbcValues, 'NEUTROPHILS');
  const lymp = get(cbcValues, 'LYMPHOCYTES');

  // Morphology flags
  const hypochromia  = morphPresent(morphFlags, 'hypochromia');
  const microcytosis = morphPresent(morphFlags, 'microcytosis');
  const macrocytosis = morphPresent(morphFlags, 'macrocytosis');
  const anisocytosis = morphPresent(morphFlags, 'anisocytosis');
  const poikilocytosis = morphPresent(morphFlags, 'poikilocytosis');
  const target_cells = morphPresent(morphFlags, 'target_cells');
  const dimorphic    = morphPresent(morphFlags, 'dimorphic_picture');

  // Valid MCV check
  const hasMCV = mcv !== SENTINEL;

  // ── Step 1: APLASTIC — check first (most critical, needs urgent action) ────
  // Pancytopenia: all three cell lines suppressed
  if (hb !== SENTINEL && wbc !== SENTINEL && plt !== SENTINEL) {
    const hb_very_low  = hb < 8.0;
    const wbc_low      = wbc < 3.5;
    const plt_low      = plt < 80;
    const rbc_low      = rbc !== SENTINEL && rbc < 2.5;

    if (hb_very_low && (wbc_low && plt_low)) {
      reasoning.push(`Severe anaemia (Hb ${hb} g/dL)`);
      reasoning.push(`Low WBC (${wbc} × 10⁹/L) — neutropenia`);
      reasoning.push(`Thrombocytopenia (Platelets ${plt} × 10⁹/L)`);
      if (rbc_low) reasoning.push(`Very low RBC (${rbc} × 10¹²/L)`);
      reasoning.push('Pattern consistent with pancytopenia');
      caveats.push('Bone marrow biopsy required to confirm');
      caveats.push('Rule out: severe B12 deficiency, haematological malignancy');
      return {
        type: 'aplastic', label: CONDITION_LABELS.aplastic,
        confidence: 82, severity: 'critical', reasoning, caveats,
      };
    }
  }

  // ── Step 2: MACROCYTIC (MCV > 95) ─────────────────────────────────────────
  if (hasMCV && mcv > 95) {
    reasoning.push(`Macrocytosis — MCV ${mcv} fL (ref 77–95)`);

    if (mcv > 110) {
      reasoning.push(`MCV markedly elevated — strongly suggests severe B12 or folate deficiency`);
    }
    if (macrocytosis) reasoning.push('Macrocytosis confirmed on morphology');
    if (anisocytosis) reasoning.push('Anisocytosis present');

    if (mch !== SENTINEL && mch > 33) {
      reasoning.push(`High MCH (${mch} pg) — hypersegmented neutrophils likely`);
      caveats.push('Request serum B12 and intrinsic factor antibodies');
      caveats.push('Rule out: folate deficiency, liver disease, hypothyroidism');
      return {
        type: 'pernicious', label: CONDITION_LABELS.pernicious,
        confidence: 70, severity: 'moderate', reasoning, caveats,
      };
    }

    caveats.push('Request serum B12 and folate levels');
    caveats.push('Rule out: pernicious anaemia, liver disease, alcohol use');
    return {
      type: 'megaloblastic', label: CONDITION_LABELS.megaloblastic,
      confidence: 67, severity: 'moderate', reasoning, caveats,
    };
  }

  // ── Step 3: MICROCYTIC (MCV < 77) ─────────────────────────────────────────
  if (hasMCV && mcv < 77) {
    reasoning.push(`Microcytosis — MCV ${mcv} fL (ref 77–95)`);
    if (microcytosis) reasoning.push('Microcytosis confirmed on morphology');
    if (hypochromia)  reasoning.push('Hypochromia present');

    const rdw_high  = rdw !== SENTINEL && rdw > 14.0;
    const mchc_low  = mchc !== SENTINEL && mchc < 31;
    const mch_low   = mch  !== SENTINEL && mch  < 25;

    // Thalassemia: VERY low MCV, NORMAL MCHC, NORMAL RDW
    // Key differentiator from IDA: RDW is usually normal in thalassemia trait
    if (mcv < 72 && !rdw_high && mchc !== SENTINEL && mchc >= 31) {
      reasoning.push(`Very low MCV (${mcv}) with normal MCHC — thalassaemia pattern`);
      if (target_cells) reasoning.push('Target cells present — supportive of thalassaemia');
      if (rdw !== SENTINEL) reasoning.push(`Normal RDW-CV (${rdw}) — helps distinguish from IDA`);
      caveats.push('Haemoglobin electrophoresis required to confirm');
      caveats.push('Genetic counselling recommended if confirmed');
      caveats.push('Rule out: iron deficiency (request serum ferritin)');
      return {
        type: 'thalassemia', label: CONDITION_LABELS.thalassemia,
        confidence: 68, severity: 'moderate', reasoning, caveats,
      };
    }

    // Iron Deficiency: low MCV + low MCH + low MCHC + high RDW
    if (mchc_low || (rdw_high && mch_low)) {
      if (rdw_high)   reasoning.push(`Elevated RDW (${rdw}) — anisocytosis`);
      if (mchc_low)   reasoning.push(`Low MCHC (${mchc} g/dL) — hypochromic cells`);
      if (mch_low)    reasoning.push(`Low MCH (${mch} pg)`);
      if (dimorphic)  reasoning.push('Dimorphic picture — suggests mixed deficiency');
      const conf = (rdw_high && mchc_low && mch_low) ? 80 :
                   (rdw_high && mch_low) ? 72 : 63;
      caveats.push('Confirm with serum ferritin, iron studies, TIBC');
      caveats.push('Consider dietary assessment and GI blood loss evaluation');
      if (dimorphic) caveats.push('Dimorphic picture — also check serum B12/folate');
      return {
        type: 'iron_deficiency', label: CONDITION_LABELS.iron_deficiency,
        confidence: conf, severity: 'moderate', reasoning, caveats,
      };
    }

    // Borderline microcytic — lean towards IDA
    caveats.push('Borderline microcytosis — iron studies and ferritin recommended');
    return {
      type: 'iron_deficiency', label: CONDITION_LABELS.iron_deficiency,
      confidence: 55, severity: 'moderate', reasoning, caveats,
    };
  }

  // ── Step 4: NORMOCYTIC (MCV 77–95 or MCV not available) ───────────────────
  if (hasMCV) reasoning.push(`Normocytic — MCV ${mcv} fL (ref 77–95)`);

  // Haemolytic: high RDW + severe normocytic anaemia + possible morphology clues
  if (rdw !== SENTINEL && rdw > 16 && hb !== SENTINEL && hb < 10) {
    reasoning.push(`Elevated RDW (${rdw}) with normocytic severe anaemia`);
    if (anisocytosis)   reasoning.push('Anisocytosis present');
    if (poikilocytosis) reasoning.push('Poikilocytosis — fragmented/abnormal cells');
    const hasSickleSignal = rdw !== SENTINEL && rdw > 18 && hb < 8;
    if (hasSickleSignal) {
      reasoning.push(`Very high RDW (${rdw}) with severe anaemia (Hb ${hb})`);
      caveats.push('HPLC / haemoglobin electrophoresis required');
      caveats.push('Rule out: haemolytic anaemia, thalassaemia major');
      return {
        type: 'sickle_cell', label: CONDITION_LABELS.sickle_cell,
        confidence: 52, severity: 'high', reasoning, caveats,
      };
    }
    caveats.push('Request reticulocyte count, bilirubin, LDH, haptoglobin');
    caveats.push('Direct Coombs test to differentiate immune vs non-immune');
    return {
      type: 'hemolytic', label: CONDITION_LABELS.hemolytic,
      confidence: 58, severity: 'high', reasoning, caveats,
    };
  }

  // Sickle cell: severe normocytic anaemia with very high RDW
  if (rdw !== SENTINEL && rdw > 18 && hb !== SENTINEL && hb < 8) {
    reasoning.push(`Severe anaemia (Hb ${hb}) with markedly elevated RDW (${rdw})`);
    if (anisocytosis) reasoning.push('Anisocytosis present');
    caveats.push('Haemoglobin electrophoresis or HPLC required to confirm');
    return {
      type: 'sickle_cell', label: CONDITION_LABELS.sickle_cell,
      confidence: 55, severity: 'high', reasoning, caveats,
    };
  }

  // Cannot classify confidently
  reasoning.push(hb !== SENTINEL ? `Anaemia present (Hb ${hb} g/dL)` : 'Anaemia detected by image analysis');
  reasoning.push('CBC pattern does not match a single clear diagnostic category');
  caveats.push('Full iron studies, reticulocyte count, and peripheral smear review recommended');
  caveats.push('Consider: anaemia of chronic disease, mixed deficiency, early-stage condition');
  return {
    type: 'unclassified', label: CONDITION_LABELS.unclassified,
    confidence: 0, severity: 'moderate', reasoning, caveats,
  };
}
