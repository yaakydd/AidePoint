// utils/reportPdf.js
//
// Builds a clinical-style PDF (modelled on standard lab report layouts)
// for a single AidePoint scan report, then lets the user share/download it.
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
  const flaggedEntries = Object.entries(morphologyFindings ?? {})
    .filter(([, probability]) => probability >= 0.5);

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
    <div class="section-title">Estimated Hematological Patterns</div>
    <div class="note-text">Image-based estimates only -- not laboratory measurements. Confirm with laboratory CBC testing.</div>
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

const buildReportHtml = (report) => {
  const cfg = CONDITION_CONFIG[report.condition] ?? CONDITION_CONFIG.healthy;
  const confidencePct = typeof report.confidence === 'number'
    ? `${Math.round(report.confidence * 100)}%`
    : (report.confidence ?? '—');

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
          align-items: center;
          border-bottom: 3px solid #00CFE8;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-logo {
          width: 36px; height: 36px; border-radius: 8px;
          background: #00CFE8; color: #fff; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .brand-name { font-size: 16px; font-weight: 700; }
        .brand-sub { font-size: 10px; color: #6B7C93; }
        .meta-right { text-align: right; font-size: 11px; color: #6B7C93; }
        .meta-right strong { color: #1A2332; display: block; font-size: 12px; }

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

        .note-text { font-size: 11px; color: #6B7C93; font-style: italic; margin-bottom: 8px; }

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

        .footer {
          margin-top: 28px; padding-top: 12px; border-top: 1px solid #EDF2F7;
          font-size: 9px; color: #9CA3AF; line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="letterhead">
        <div class="brand">
          <div class="brand-logo">A</div>
          <div>
            <div class="brand-name">AidePoint</div>
            <div class="brand-sub">AI-Assisted Blood Smear Report</div>
          </div>
        </div>
        <div class="meta-right">
          Scan ID
          <strong>${report.id ?? '—'}</strong>
        </div>
      </div>

      <div class="section-title">Patient Information</div>
      <table>
        ${row('Patient Name', report.patientName)}
        ${row('Patient ID', report.patientId)}
        ${row('Date', report.dateDisplay)}
        ${row('Time', report.timeDisplay)}
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

      <div class="section-title">Verification</div>
      <table>
        ${row('Lab Technician', report.labTechName)}
        ${row('Lab Technician Verified', report.labTechVerified ? 'Yes' : 'Pending')}
        ${row('Reviewing Doctor', report.doctorName || 'Not yet assigned')}
        ${row('Doctor Verified', report.doctorVerified ? 'Yes' : 'Pending')}
        ${row('Doctor Notes', report.doctorNotes)}
      </table>

      <div class="footer">
        This AI-assisted result is a screening aid only and does not replace
        clinical judgement. CBC pattern estimates are derived from image
        analysis and are not laboratory measurements. All available clinical
        and laboratory information should be considered before reaching a
        diagnosis. Generated by AidePoint.
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
