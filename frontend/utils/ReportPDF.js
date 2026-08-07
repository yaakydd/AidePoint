// utils/ReportPDF.js
//
// Builds a clinical-style PDF for a single AidePoint scan report, then
// lets the user share/download it.
//
// Deliberately does NOT include a full lab-style CBC panel (WBC,
// platelets, differential counts) the way a real hematology analyzer
// report does -- a static smear photo has no way to see white cells or
// count platelets reliably, which is exactly why model.py only outputs
// 6 CBC pattern fields in the first place. Adding those extra rows here
// would mean putting fabricated numbers on a document formatted to look
// like a real lab report, which is a genuinely dangerous thing to do on
// something meant for real clinical use.
//
// Requires: npx expo install expo-print expo-sharing

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CONDITION_CONFIG } from './ReportUtils';

const row = (label, value) => {
  if (value === undefined || value === null || value === '') return '';
  return `
    <tr>
      <td class="label">${label}</td>
      <td class="value">${value}</td>
    </tr>`;
};

const buildMorphologySection = (morphologyFindings) => {
  // FIXED: was comparing `probability >= 0.5` against entries shaped
  // like { probability, flagged }, the shape morphology_findings
  // actually has (see model.py / main.py's /predict response) -- this
  // reads the `flagged` boolean the backend already computed, rather
  // than re-deriving a threshold check against the wrong field.
  const flaggedEntries = Object.entries(morphologyFindings ?? {})
    .filter(([, finding]) => finding?.flagged === true);

  if (flaggedEntries.length === 0) {
    return `
      <div class="section-title">Morphology Findings</div>
      <div class="note-text">No abnormal morphology flags detected above the reporting threshold.</div>`;
  }

  const items = flaggedEntries
    .map(([flagName]) => `<li>${flagName.replace(/_/g, ' ')}</li>`)
    .join('');

  return `
    <div class="section-title">Morphology Findings</div>
    <ul class="finding-list">${items}</ul>`;
};

const buildCbcSection = (cbcPatternSummary) => {
  const entries = Object.entries(cbcPatternSummary ?? {});
  if (entries.length === 0) return '';

  const rows = entries
    .map(([fieldName, fieldData]) => row(
      fieldName.toUpperCase(),
      fieldData?.display_text ?? '—',
    ))
    .join('');

  return `
    <div class="section-title">Estimated Hematological Pattern</div>
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

  const items = reasons.map((reason) => `<li>${reason}</li>`).join('');

  return `
    <div class="reliability-banner">
      <div class="reliability-title">Review Recommended</div>
      <ul class="finding-list">${items}</ul>
    </div>`;
};

// FIXED: was reading report.labTechVerified/report.doctorVerified --
// the technician side of that workflow was replaced with free-text
// notes (see DetailModal.js / ReportUtils.js's labTechNotes field), so
// this now shows whatever the technician actually wrote instead of a
// stale Yes/Pending toggle that no longer exists on the report object.
const buildVerificationSection = (report) => {
  const rows = [
    row('Lab Technician', report.labTechName),
    row('Technician Notes', report.labTechNotes || 'No notes recorded'),
  ].join('');

  return `
    <div class="section-title">Review</div>
    <table>${rows}</table>`;
};

const buildReportHtml = (report) => {
  const cfg = CONDITION_CONFIG[report.condition] ?? CONDITION_CONFIG.healthy;
  const confidencePct = typeof report.confidence === 'number'
    ? `${Math.round(report.confidence * 100)}%`
    : (report.confidence ?? '—');

  const printedAt = new Date();
  const printedAtDisplay = printedAt.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

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

        /* Letterhead
           Modelled on a standard clinical lab report letterhead: brand
           block on the left, facility contact details underneath, a
           requisition-style meta panel on the right giving this report
           a document-of-record identity (report/scan ID, print
           timestamp) the same way a real lab report always states
           who printed what, and when. */
        .letterhead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #00CFE8;
          padding-bottom: 16px;
          margin-bottom: 20px;
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

        .section-title {
          font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
          color: #6B7C93; text-transform: uppercase;
          margin: 18px 0 8px;
        }

        table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        td.label { padding: 6px 0; color: #6B7C93; width: 45%; border-bottom: 1px solid #EDF2F7; }
        td.value { padding: 6px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #EDF2F7; }

        .result-banner {
          background: ${cfg.badgeBg}; border-radius: 10px; padding: 16px;
          margin: 14px 0;
        }
        .result-label { font-size: 10px; font-weight: 700; color: ${cfg.badgeText}; letter-spacing: 0.6px; }
        .result-value { font-size: 20px; font-weight: 700; color: ${cfg.badgeText}; margin-top: 2px; }
        .result-note { font-size: 12px; color: ${cfg.badgeText}; margin-top: 8px; opacity: 0.9; }

        .note-text { font-size: 11px; color: #6B7C93; font-style: italic; margin-bottom: 8px; line-height: 1.4; }

        .finding-list { margin: 0 0 8px; padding-left: 18px; }
        .finding-list li { font-size: 12px; margin-bottom: 4px; text-transform: capitalize; }

        .reliability-banner {
          background: #FEF3C7; border-radius: 10px; padding: 14px 16px;
          margin: 16px 0;
        }
        .reliability-title {
          font-size: 11px; font-weight: 700; color: #92400E;
          text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;
        }
        .reliability-banner .finding-list li { color: #92400E; text-transform: none; }

        /* Footer 
           Deliberately styled after a standard lab report's closing
           disclaimer block, the same honest-limits language the app
           shows elsewhere (scope_disclaimer / cbc_scope_disclaimer),
           just in report form.
           NOTE: intentionally not using CSS @page page-number counters
           here -- expo-print renders through different underlying
           engines on iOS vs Android, and live page-counter support in
           that print pipeline isn't reliable across both, so a
           counter that silently fails on one platform is worse than
           just not promising page numbers at all. */
        .footer {
          margin-top: 28px; padding-top: 12px; border-top: 1px solid #EDF2F7;
          font-size: 9px; color: #9CA3AF; line-height: 1.6;
        }
        .footer .end-of-report {
          text-align: center; font-size: 10px; font-weight: 600;
          color: #6B7C93; letter-spacing: 1px; text-transform: uppercase;
          margin-top: 14px;
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
          <div class="meta-line">Report ID<br/><strong>${report.scanId ?? '—'}</strong></div>
          <div class="meta-line">Scan Date<br/><strong>${report.dateDisplay ?? '—'} ${report.timeDisplay ?? ''}</strong></div>
          <div class="meta-line">Report Printed<br/><strong>${printedAtDisplay}</strong></div>
        </div>
      </div>

      <div class="section-title">Patient Information</div>
      <table>
        ${row('Patient Name', report.patientName)}
        ${row('Patient ID', report.patientId)}
        ${row('Temperature', report.temperature ? `${report.temperature} °C` : null)}
        ${row('Blood Pressure', report.bloodPressure)}
      </table>

      ${buildReliabilitySection(report.isUnreliable, report.unreliableReasons, report.imageQuality)}

      <div class="section-title">AI Analysis Result</div>
      <div class="result-banner">
        <div class="result-label">SCREENING RESULT</div>
        <div class="result-value">${cfg.label}</div>
        <div class="result-note">${cfg.morphology}</div>
      </div>
      <table>
        ${row('Confidence', confidencePct)}
        ${row('Urgency', cfg.urgency)}
      </table>

      ${buildMorphologySection(report.morphologyFindings)}

      ${buildCbcSection(report.cbcPatternSummary)}

      ${buildVerificationSection(report)}

      <div class="footer">
        <strong>Important Note:</strong> This is an AI-assisted screening result, not a laboratory
        diagnostic report. It reflects anemia risk only, based on hemoglobin-related patterns in red
        blood cells -- it does not screen for malaria, sickle cell disease, or other blood conditions.
        Estimated hematological values above are rough, directional, image-based estimates and are not
        laboratory measurements. Like any diagnostic aid, this result should not be used alone to make a
        final diagnosis; all available clinical and laboratory information should be considered before
        reaching a conclusion. If a patient's symptoms or history seem to contradict this result, arrange
        confirmatory laboratory testing.
        <div class="end-of-report">End of Report</div>
      </div>
    </body>
  </html>`;
};

/**
 * Generates the PDF and opens the native share/save sheet.
 * @param {object} report - the report object from ReportUtils.buildReport()
 */
export const exportReportAsPdf = async (report) => {
  const html = buildReportHtml(report);
  const { uri } = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `AidePoint Report — ${report.patientName}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
};
