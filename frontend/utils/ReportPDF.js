// utils/reportPdf.js
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { CONDITION_CONFIG } from './ReportUtils';

// The anemia-probability model only scores two outcomes: anemic vs
// healthy. 'unknown' is a derived bucket (flagged morphology or an
// unreliable-result warning), not a third class the model assigns a
// confidence score to -- so the exported PDF should not show a
// Confidence row for it, matching the in-app DetailModal/TransparencyTrail
// gating.
const shouldShowProbabilityAndConfidence = (conditionKey) =>
  conditionKey === 'anemic' || conditionKey === 'healthy';

// SECURITY: patientName, patientId, labTechName, labTechNotes,
// doctorName, temperature, and bloodPressure all originate from
// technician-entered form fields or free-text notes -- none of it is
// backend-controlled or validated against a fixed set of values.
// Interpolating any of it directly into this HTML template without
// escaping means a stray '<', '>', or '"' (accidental, or a technician
// pasting text copied from elsewhere) can corrupt the rendered PDF's
// layout or, worst case, inject markup that changes how the report
// displays -- a real data-integrity problem for a clinical document,
// even though expo-print's WebView sandbox means this isn't a
// code-execution risk. Every user-supplied field must go through this
// before being placed in the template. Fields sourced from
// CONDITION_CONFIG (cfg.label, cfg.urgency, cfg.morphology) do NOT need
// escaping -- they're fixed strings from our own config, not user input.
const escapeHtml = (value) => {
  if (value === undefined || value === null) return value;
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const row = (label, value) => {
  if (value === undefined || value === null || value === '') return '';
  return `
    <tr>
      <td class="label">${escapeHtml(label)}</td>
      <td class="value">${escapeHtml(value)}</td>
    </tr>`;
};

const buildMorphologySection = (morphologyFindings) => {
  const flaggedEntries = Object.entries(morphologyFindings ?? {})
    .filter(([, finding]) => finding?.flagged === true);

  if (flaggedEntries.length === 0) {
    return `
      <div class="section-bar">Morphology Findings</div>
      <div class="note-text">No abnormal morphology flags detected above the reporting threshold.</div>`;
  }

  // Flag names come from MORPHOLOGY_KEYS on the backend (a fixed list),
  // not user input -- no escaping needed here, but keeping the
  // replace(/_/g, ' ') formatting as-is.
  const items = flaggedEntries
    .map(([flagName]) => `<li>${flagName.replace(/_/g, ' ')}</li>`)
    .join('');

  return `
    <div class="section-bar">Morphology Findings</div>
    <ul class="finding-list">${items}</ul>`;
};

const buildCbcSection = (cbcPatternSummary) => {
  const entries = Object.entries(cbcPatternSummary ?? {});
  if (entries.length === 0) return '';

  // fieldName/display_text come from fixed backend config
  // (CBC_KEYS / cbc_uncertainty.py), not user input.
  const rows = entries
    .map(([fieldName, fieldData]) => row(
      fieldName.toUpperCase(),
      fieldData?.display_text ?? '—',
    ))
    .join('');

  return `
    <div class="section-bar">Estimated Hematological Pattern</div>
    <div class="note-text">
      Image-based estimates only, covering RBC / Haemoglobin / Haematocrit / MCV / MCH / MCHC --
      not a full laboratory CBC panel and not laboratory measurements. Confirm with laboratory CBC
      testing before relying on these values.
    </div>
    <table>${rows}</table>`;
};

const buildReliabilitySection = (isUnreliable, unreliableReasons, imageQuality) => {
  const reasons = [
    ...(unreliableReasons ?? []),
    ...(imageQuality?.failure_reasons ?? []),
  ];

  if (!isUnreliable && imageQuality?.quality_score !== 'poor') return '';

  // Reasons are backend-generated diagnostic strings (from
  // quality_checks.py / shape_screening.py), not user input -- no
  // escaping needed, but left defensively safe since these do get
  // embedded as list items.
  const items = reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('');

  return `
    <div class="reliability-banner">
      <div class="reliability-title">Review Recommended</div>
      <ul class="finding-list">${items}</ul>
    </div>`;
};

const buildTechnicianNotesSection = (report) => {
  // labTechName and labTechNotes are both technician-entered --
  // row() already escapes both label and value.
  const rows = [
    row('Lab Technician', report.labTechName),
    row('Notes', report.labTechNotes || 'No notes recorded'),
  ].join('');

  return `
    <div class="section-bar">Lab Technician's Notes</div>
    <table>${rows}</table>`;
};

const buildReportHtml = (report) => {
  const cfg = CONDITION_CONFIG[report.condition] ?? CONDITION_CONFIG.healthy;
  const showProbabilityConfidence = shouldShowProbabilityAndConfidence(report.condition);
  const confidencePct = typeof report.confidence === 'number'
    ? `${Math.round(report.confidence * 100)}%`
    : (report.confidence ?? '—');

  const printedAt = new Date();
  const printedAtDisplay = printedAt.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  // Pre-escape every user-supplied field once, up front, rather than
  // scattering escapeHtml(...) calls through the template below --
  // keeps the template itself readable and makes it obvious at a glance
  // which fields have been sanitized.
  const safePatientName = escapeHtml(report.patientName) ?? '—';
  const safePatientId = escapeHtml(report.patientId) ?? '—';
  const safeLabTechName = escapeHtml(report.labTechName) ?? '—';
  const safeTemperature = escapeHtml(report.temperature);
  const safeBloodPressure = escapeHtml(report.bloodPressure);
  const safeScanId = escapeHtml(report.scanId) ?? '—';
  const safeDateDisplay = escapeHtml(report.dateDisplay) ?? '—';
  const safeTimeDisplay = escapeHtml(report.timeDisplay) ?? '';

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, Helvetica, Arial, sans-serif;
          color: #1A2332;
          padding: 32px 40px;
          font-size: 13px;
        }
        .letterhead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #00CFE8;
          padding-bottom: 16px;
          margin-bottom: 18px;
        }
        .brand { display: flex; align-items: flex-start; gap: 10px; }
        .brand-logo {
          width: 36px; height: 36px; border-radius: 8px;
          background: #00CFE8; color: #fff; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0;
        }
        .brand-name { font-size: 17px; font-weight: 700; }
        .brand-sub { font-size: 10px; color: #6B7C93; margin-top: 1px; }
        .brand-contact { font-size: 9px; color: #9CA3AF; margin-top: 6px; line-height: 1.5; }
        .meta-right { text-align: right; font-size: 10px; color: #6B7C93; min-width: 180px; }
        .meta-right .meta-line { margin-bottom: 4px; }
        .meta-right .meta-line strong { color: #1A2332; font-weight: 600; }
        .info-bar-row { display: flex; gap: 2px; margin-bottom: 16px; }
        .info-bar {
          flex: 1; background: #00CFE8; color: #fff;
          padding: 7px 12px; font-size: 11px; font-weight: 600;
        }
        .info-bar span { font-weight: 400; opacity: 0.9; }
        .info-columns { display: flex; gap: 32px; margin-bottom: 18px; }
        .info-col { flex: 1; }
        .info-col-title {
          font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
          color: #6B7C93; text-transform: uppercase; margin-bottom: 6px;
        }
        .info-col-line { font-size: 12px; margin-bottom: 3px; }
        .info-col-line strong { font-weight: 600; }
        .divider { border-top: 1px solid #EDF2F7; margin: 16px 0; }
        .section-bar {
          background: #F1F9FB; color: #1A2332;
          border-left: 3px solid #00CFE8;
          padding: 6px 10px; font-size: 11px; font-weight: 700;
          letter-spacing: 0.4px; text-transform: uppercase;
          margin: 18px 0 8px;
        }
        table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        td.label { padding: 6px 0; color: #6B7C93; width: 45%; border-bottom: 1px solid #EDF2F7; }
        td.value { padding: 6px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #EDF2F7; }
        .result-statement { font-size: 13px; line-height: 1.6; margin-bottom: 10px; }
        .result-statement strong { color: #1A2332; }
        .note-text { font-size: 11px; color: #6B7C93; font-style: italic; margin-bottom: 8px; line-height: 1.4; }
        .finding-list { margin: 0 0 8px; padding-left: 18px; }
        .finding-list li { font-size: 12px; margin-bottom: 4px; text-transform: capitalize; }
        .reliability-banner {
          background: #FEF3C7; border-radius: 6px; padding: 14px 16px;
          margin: 16px 0;
        }
        .reliability-title {
          font-size: 11px; font-weight: 700; color: #92400E;
          text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;
        }
        .reliability-banner .finding-list li { color: #92400E; text-transform: none; }
        .recommendation-text { font-size: 12px; line-height: 1.6; margin-bottom: 4px; }
        .footer {
          margin-top: 20px; padding-top: 12px; border-top: 1px solid #EDF2F7;
          font-size: 9px; color: #9CA3AF; line-height: 1.6;
        }
        .end-of-report {
          text-align: center; font-size: 10px; font-weight: 600;
          color: #6B7C93; letter-spacing: 1px; text-transform: uppercase;
          margin-top: 22px;
        }
      </style>
    </head>
    <body>
      <div class="letterhead">
        <div class="brand">
          <div class="brand-logo">A</div>
          <div>
            <div class="brand-name">AidePoint</div>
            <div class="brand-sub">AI-Assisted Blood Smear Screening Report</div>
            <div class="brand-contact">
              AI screening tool for anemia risk from red blood cell imagery<br/>
              Generated by AidePoint · Not a substitute for laboratory testing
            </div>
          </div>
        </div>
        <div class="meta-right">
          <div class="meta-line">Report ID<br/><strong>${safeScanId}</strong></div>
          <div class="meta-line">Scan Date<br/><strong>${safeDateDisplay} ${safeTimeDisplay}</strong></div>
          <div class="meta-line">Report Printed<br/><strong>${printedAtDisplay}</strong></div>
        </div>
      </div>

      <div class="info-bar-row">
        <div class="info-bar">Scan ID <span>${safeScanId}</span></div>
        <div class="info-bar">Scan Date <span>${safeDateDisplay} ${safeTimeDisplay}</span></div>
      </div>

      <div class="info-columns">
        <div class="info-col">
          <div class="info-col-title">Lab Technician</div>
          <div class="info-col-line"><strong>${safeLabTechName}</strong></div>
        </div>
        <div class="info-col">
          <div class="info-col-title">Patient Information</div>
          <div class="info-col-line">Patient: <strong>${safePatientName}</strong></div>
          <div class="info-col-line">Patient ID: <strong>${safePatientId}</strong></div>
          ${safeTemperature ? `<div class="info-col-line">Temperature: <strong>${safeTemperature} °C</strong></div>` : ''}
          ${safeBloodPressure ? `<div class="info-col-line">Blood Pressure: <strong>${safeBloodPressure}</strong></div>` : ''}
        </div>
      </div>

      <div class="divider"></div>

      ${buildReliabilitySection(report.isUnreliable, report.unreliableReasons, report.imageQuality)}

      <div class="section-bar">AI Analysis Result</div>
      <div class="result-statement">
        Based on the blood smear analysis, the screening result is:
        <strong>${escapeHtml(cfg.label)}</strong>. ${escapeHtml(cfg.morphology)}
      </div>
      <table>
        ${showProbabilityConfidence ? row('Confidence', confidencePct) : ''}
        ${row('Urgency', cfg.urgency)}
      </table>

      ${buildMorphologySection(report.morphologyFindings)}

      ${buildCbcSection(report.cbcPatternSummary)}

      <div class="divider"></div>

      ${buildTechnicianNotesSection(report)}

      <div class="section-bar">Recommendation</div>
      <div class="recommendation-text">
        This is an AI-assisted screening result, not a laboratory diagnostic report. If the result is
        unexpected given the patient's symptoms or history, arrange confirmatory laboratory testing
        before making a final clinical decision.
      </div>

      <div class="footer">
        <strong>Important Note:</strong> This is an AI-assisted screening result, not a laboratory
        diagnostic report. It reflects anemia risk only, based on hemoglobin-related patterns in red
        blood cells -- it does not screen for malaria, sickle cell disease, or other blood conditions.
        Estimated hematological values above are rough, directional, image-based estimates and are not
        laboratory measurements. Like any diagnostic aid, this result should not be used alone to make a
        final diagnosis; all available clinical and laboratory information should be considered before
        reaching a conclusion.
      </div>

      <div class="end-of-report">End of Report</div>
    </body>
  </html>`;
};

const sanitizeFileName = (name) => {
  if (!name) return 'Unknown_Patient';
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\-_ ]/g, '')
    .replace(/\s+/g, '_');
};

export const exportReportAsPdf = async (report) => {
  const html = buildReportHtml(report);
  const { uri } = await Print.printToFileAsync({ html });

  const safeName = sanitizeFileName(report.patientName);
  const idPart = report.scanId ? `_${sanitizeFileName(String(report.scanId))}` : '';
  const fileName = `${safeName}${idPart}.pdf`;

  const newUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.copyAsync({ from: uri, to: newUri });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(newUri, {
      mimeType: 'application/pdf',
      dialogTitle: `AidePoint Report — ${report.patientName}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return newUri;
};