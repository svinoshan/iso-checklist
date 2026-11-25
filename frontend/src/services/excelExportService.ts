import ExcelJS from 'exceljs';
import {
  calculateFindingsSummary,
  extractFindingsList,
  formatDisplayDate,
  getClauseEvaluation,
  getVisibleClausesForSheet,
  resolveOutcomeText,
} from '../domain/auditRules';
import type {
  AuditConfig,
  AuditReport,
  ClauseSheetDefinition,
  ClauseStatus,
  FindingRecord,
  FindingsSummary,
} from '../types/audit';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
};

const SUBHEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFEBF1F8' },
};

const ALT_ROW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const BASE_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 10,
  color: { argb: 'FF0F172A' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const SECTION_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FF1E3A5F' },
};

interface SheetRowRange {
  sheetName: string;
  lastRow: number;
}

interface ClauseRowLocation {
  sheetName: string;
  rowNumber: number;
}

function escapeExcelSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function buildCrossSheetStatusCountFormula(
  ranges: readonly SheetRowRange[],
  targetStatus: 'Minor NC' | 'Major NC' | 'Observation',
): string {
  if (ranges.length === 0) {
    return '0';
  }
  return ranges
    .map(
      ({ sheetName, lastRow }) =>
        `COUNTIF(${escapeExcelSheetName(sheetName)}!C2:C${lastRow},"${targetStatus}")`,
    )
    .join('+');
}

function getStatusFontColor(status: ClauseStatus | null): string {
  switch (status) {
    case 'Comply':
      return 'FF047857';
    case 'Observation':
      return 'FF1D4ED8';
    case 'Minor NC':
      return 'FFB45309';
    case 'Major NC':
      return 'FFB91C1C';
    case 'N/A':
      return 'FF475569';
    default:
      return 'FF64748B';
  }
}

function estimateRowHeight(
  texts: readonly { text: string; widthChars: number }[],
  lineHeight = 15,
  minHeight = 22,
): number {
  let maxLines = 1;
  for (const item of texts) {
    if (!item.text) {
      continue;
    }
    const paragraphs = item.text.split('\n');
    let lines = 0;
    const effectiveWidth = Math.max(item.widthChars - 2, 10);
    for (const para of paragraphs) {
      lines += Math.max(1, Math.ceil(para.length / effectiveWidth));
    }
    if (lines > maxLines) {
      maxLines = lines;
    }
  }
  return Math.max(minHeight, maxLines * lineHeight + 10);
}

function configurePrintLayout(ws: ExcelJS.Worksheet, landscape = false): void {
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: landscape ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
}

function buildAuditDetailsSheet(
  workbook: ExcelJS.Workbook,
  report: AuditReport,
  config: AuditConfig,
): void {
  const ws = workbook.addWorksheet('Audit Details');
  configurePrintLayout(ws, false);

  ws.columns = [
    { key: 'label', width: 32 },
    { key: 'value', width: 58 },
  ];

  const schemeLabels = report.details.schemes.map((code) => {
    const match = config.schemes.find((s) => s.code === code);
    return match ? `${match.standardCode} (${match.shortLabel}) - ${match.fullName}` : code;
  });

  const dateRange =
    report.details.auditStartDate && report.details.auditEndDate
      ? `${formatDisplayDate(report.details.auditStartDate)} to ${formatDisplayDate(report.details.auditEndDate)}`
      : formatDisplayDate(report.details.auditStartDate || report.details.auditEndDate);

  const rows: readonly [string, string][] = [
    ['Type of Audit', report.details.auditType],
    ['Company Name', report.details.companyName],
    ['Scheme/s', schemeLabels.join('\n')],
    ['Audit Start Date / End Date', dateRange],
    ['CU Project Number', report.details.cuProjectNumber],
    ['Team Leader', report.details.teamLeader],
    ['Team Members', report.details.teamMembers],
    ['Report Completed Date', formatDisplayDate(report.details.reportCompletedDate)],
  ];

  rows.forEach(([label, value], index) => {
    const row = ws.getRow(index + 1);
    const labelCell = row.getCell(1);
    const valueCell = row.getCell(2);

    labelCell.value = label;
    labelCell.font = { ...BASE_FONT, bold: true, color: { argb: 'FF1E3A5F' } };
    labelCell.fill = SUBHEADER_FILL;
    labelCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    labelCell.border = THIN_BORDER;

    valueCell.value = value;
    valueCell.font = BASE_FONT;
    valueCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    valueCell.border = THIN_BORDER;

    row.height = estimateRowHeight([
      { text: label, widthChars: 32 },
      { text: value, widthChars: 58 },
    ], 16, 24);
  });
}

function buildIntroductionSheet(
  workbook: ExcelJS.Workbook,
  report: AuditReport,
  config: AuditConfig,
): void {
  const ws = workbook.addWorksheet('Audit Introduction and CU');
  configurePrintLayout(ws, false);

  ws.columns = [{ key: 'content', width: 120 }];

  const entityMatch = config.accreditedEntities.find(
    (item) =>
      item.code === report.introduction.accreditedLegalEntity && !item.disabled,
  );
  const accreditationBodyDisplay = entityMatch ? entityMatch.fullName : '';
  const legalEntityDisplay = entityMatch
    ? [entityMatch.legalEntityName, entityMatch.legalEntityAddress]
        .filter(Boolean)
        .join('\n')
    : '';

  const blocks: readonly { heading: string; body: string }[] = [
    {
      heading: config.staticContent.reportTitle,
      body: config.staticContent.introductionText,
    },
    {
      heading: config.staticContent.organizationHeading,
      body: '',
    },
    {
      heading: 'Scope of Certification',
      body: report.introduction.scopeOfCertification.trim(),
    },
    {
      heading: 'Accreditation Body',
      body: accreditationBodyDisplay,
    },
    {
      heading: 'Accredited Legal Entity',
      body: legalEntityDisplay,
    },
    {
      heading: 'Confidentiality Statement',
      body: config.staticContent.confidentialityStatement,
    },
    {
      heading: 'Disclaimer',
      body: config.staticContent.disclaimerText,
    },
  ];

  let currentRow = 1;
  for (const block of blocks) {
    const headingRow = ws.getRow(currentRow);
    const headingCell = headingRow.getCell(1);
    headingCell.value = block.heading;
    headingCell.font = SECTION_FONT;
    headingCell.fill = SUBHEADER_FILL;
    headingCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    headingCell.border = THIN_BORDER;
    headingRow.height = 24;
    currentRow += 1;

    if (block.body) {
      const bodyRow = ws.getRow(currentRow);
      const bodyCell = bodyRow.getCell(1);
      bodyCell.value = block.body;
      bodyCell.font = BASE_FONT;
      bodyCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      bodyCell.border = THIN_BORDER;
      bodyRow.height = estimateRowHeight([{ text: block.body, widthChars: 118 }], 15, 24);
      currentRow += 1;
    }

    currentRow += 1; // clean spacer row between sections
  }
}

function buildFindingsAndConclusionSheet(
  workbook: ExcelJS.Workbook,
  report: AuditReport,
  config: AuditConfig,
  summary: FindingsSummary,
  clauseSheetRanges: readonly SheetRowRange[],
): void {
  const ws = workbook.addWorksheet('Audit findings & Conclusion');
  configurePrintLayout(ws, false);

  ws.columns = [
    { key: 'colA', width: 34 },
    { key: 'colB', width: 92 },
  ];

  const metricRows: readonly {
    label: string;
    formula?: string;
    result: number;
  }[] = [
    {
      label: 'Number of NCs:',
      formula: 'B2+B3',
      result: summary.totalNcs,
    },
    {
      label: 'Number of Minor NC:',
      formula: buildCrossSheetStatusCountFormula(clauseSheetRanges, 'Minor NC'),
      result: summary.minorNcs,
    },
    {
      label: 'Number of Major NC:',
      formula: buildCrossSheetStatusCountFormula(clauseSheetRanges, 'Major NC'),
      result: summary.majorNcs,
    },
    {
      label: 'Observations:',
      formula: buildCrossSheetStatusCountFormula(clauseSheetRanges, 'Observation'),
      result: summary.observations,
    },
    {
      label: 'Open NC:',
      result: summary.openNcs,
    },
  ];

  metricRows.forEach((metric, index) => {
    const row = ws.getRow(index + 1);
    const labelCell = row.getCell(1);
    const valueCell = row.getCell(2);

    labelCell.value = metric.label;
    labelCell.font = { ...BASE_FONT, bold: true, color: { argb: 'FF1E3A5F' } };
    labelCell.fill = SUBHEADER_FILL;
    labelCell.alignment = { vertical: 'middle', horizontal: 'left' };
    labelCell.border = THIN_BORDER;

    valueCell.value = metric.formula
      ? { formula: metric.formula, result: metric.result }
      : metric.result;
    valueCell.font = { ...BASE_FONT, bold: true };
    valueCell.alignment = { vertical: 'middle', horizontal: 'left' };
    valueCell.numFmt = '0';
    valueCell.border = THIN_BORDER;

    row.height = 22;
  });

  // Audit Conclusion section (starts at Row 7)
  let rowIndex = 7;

  ws.mergeCells(rowIndex, 1, rowIndex, 2);
  const conclusionHeader = ws.getRow(rowIndex);
  conclusionHeader.getCell(1).value = 'Audit Conclusion';
  conclusionHeader.getCell(1).font = HEADER_FONT;
  conclusionHeader.getCell(1).fill = HEADER_FILL;
  conclusionHeader.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  conclusionHeader.getCell(1).border = THIN_BORDER;
  conclusionHeader.getCell(2).border = THIN_BORDER;
  conclusionHeader.height = 24;
  rowIndex += 1;

  const conclusionLines = config.conclusionItems.map((item) => {
    const checked = report.conclusion.selectedConclusions.includes(item.id);
    const mark = checked ? '☑' : '☐';
    if (item.requiresDate) {
      const dateStr = report.conclusion.correctiveActionDueDate
        ? formatDisplayDate(report.conclusion.correctiveActionDueDate)
        : '____________';
      return `${mark} ${item.text} ${dateStr}.`;
    }
    return `${mark} ${item.text}`;
  });
  const conclusionBody = `${config.staticContent.auditConclusionLead}\n\n${conclusionLines.join('\n')}`;

  ws.mergeCells(rowIndex, 1, rowIndex, 2);
  const conclusionRow = ws.getRow(rowIndex);
  conclusionRow.getCell(1).value = conclusionBody;
  conclusionRow.getCell(1).font = BASE_FONT;
  conclusionRow.getCell(1).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  conclusionRow.getCell(1).border = THIN_BORDER;
  conclusionRow.getCell(2).border = THIN_BORDER;
  conclusionRow.height = estimateRowHeight([{ text: conclusionBody, widthChars: 122 }], 15, 180);
  rowIndex += 2;

  // Certification Recommendation
  ws.mergeCells(rowIndex, 1, rowIndex, 2);
  const recHeader = ws.getRow(rowIndex);
  recHeader.getCell(1).value = 'Certification Recommendation';
  recHeader.getCell(1).font = HEADER_FONT;
  recHeader.getCell(1).fill = HEADER_FILL;
  recHeader.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  recHeader.getCell(1).border = THIN_BORDER;
  recHeader.getCell(2).border = THIN_BORDER;
  recHeader.height = 24;
  rowIndex += 1;

  const recommendationBody = config.recommendations
    .map((option) => {
      const mark =
        report.conclusion.certificationRecommendation === option.id ? '☑' : '☐';
      return `${mark} ${option.label}`;
    })
    .join('\n');

  ws.mergeCells(rowIndex, 1, rowIndex, 2);
  const recRow = ws.getRow(rowIndex);
  recRow.getCell(1).value = recommendationBody;
  recRow.getCell(1).font = BASE_FONT;
  recRow.getCell(1).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  recRow.getCell(1).border = THIN_BORDER;
  recRow.getCell(2).border = THIN_BORDER;
  recRow.height = estimateRowHeight([{ text: recommendationBody, widthChars: 122 }], 16, 90);
  rowIndex += 2;

  // Auditor Declaration & Follow-up Requirements
  ws.mergeCells(rowIndex, 1, rowIndex, 2);
  const declHeader = ws.getRow(rowIndex);
  declHeader.getCell(1).value = 'Auditor Declaration & Follow-up Requirements';
  declHeader.getCell(1).font = HEADER_FONT;
  declHeader.getCell(1).fill = HEADER_FILL;
  declHeader.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  declHeader.getCell(1).border = THIN_BORDER;
  declHeader.getCell(2).border = THIN_BORDER;
  declHeader.height = 24;
  rowIndex += 1;

  const declMark = report.conclusion.auditorDeclarationAccepted ? '☑' : '☐';
  const followUpLine = `Follow-up / Verification Audit Required: ${report.conclusion.followUpRequired || 'Not Specified'}`;
  const followUpCommentLine =
    report.conclusion.followUpRequired === 'Yes' &&
    report.conclusion.followUpComment.trim()
      ? `\nFollow-up Comment: ${report.conclusion.followUpComment.trim()}`
      : '';

  const declBody = `${declMark} ${config.staticContent.auditorDeclarationText}\n\nFollow-up Requirements\n${followUpLine}${followUpCommentLine}`;

  ws.mergeCells(rowIndex, 1, rowIndex, 2);
  const declRow = ws.getRow(rowIndex);
  declRow.getCell(1).value = declBody;
  declRow.getCell(1).font = BASE_FONT;
  declRow.getCell(1).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  declRow.getCell(1).border = THIN_BORDER;
  declRow.getCell(2).border = THIN_BORDER;
  declRow.height = estimateRowHeight([{ text: declBody, widthChars: 122 }], 16, 80);
  rowIndex += 2;

  // Next Audit Date
  const nextDateRow = ws.getRow(rowIndex);
  nextDateRow.getCell(1).value = 'Next Audit Date:';
  nextDateRow.getCell(1).font = { ...BASE_FONT, bold: true, color: { argb: 'FF1E3A5F' } };
  nextDateRow.getCell(1).fill = SUBHEADER_FILL;
  nextDateRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  nextDateRow.getCell(1).border = THIN_BORDER;

  nextDateRow.getCell(2).value = formatDisplayDate(report.conclusion.nextAuditDate);
  nextDateRow.getCell(2).font = BASE_FONT;
  nextDateRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
  nextDateRow.getCell(2).border = THIN_BORDER;
  nextDateRow.height = 24;
}

function buildClauseSheet(
  workbook: ExcelJS.Workbook,
  sheet: ClauseSheetDefinition,
  report: AuditReport,
  clauseLocations: Map<string, ClauseRowLocation>,
): void {
  const ws = workbook.addWorksheet(sheet.sheetName);
  configurePrintLayout(ws, true);

  ws.columns = [
    { key: 'clause', width: 30 },
    { key: 'description', width: 42 },
    { key: 'status', width: 15 },
    { key: 'outcome', width: 58 },
    { key: 'remarks', width: 34 },
  ];

  const headerRow = ws.getRow(1);
  const headers = [
    'Clause',
    'Clause Description',
    'Audit Status',
    'Audit Outcome',
    'Auditor Remarks',
  ];
  headers.forEach((title, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = title;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx === 2 ? 'center' : 'left',
      wrapText: true,
    };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 26;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = 'A1:E1';

  const visibleClauses = getVisibleClausesForSheet(
    sheet,
    report.details.schemes,
    report.evaluations,
  );

  visibleClauses.forEach((clause, index) => {
    const evaluation = getClauseEvaluation(report.evaluations, clause.id);
    const statusText = evaluation.status ?? '';
    const outcomeText = resolveOutcomeText(clause, evaluation.status);
    const remarksText = evaluation.remarks.trim();
    const rowNumber = index + 2;

    clauseLocations.set(clause.id, {
      sheetName: sheet.sheetName,
      rowNumber,
    });

    const row = ws.getRow(rowNumber);
    const values = [
      clause.title,
      clause.description,
      statusText,
      outcomeText,
      remarksText,
    ];
    const isAlt = index % 2 === 1;

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      if (colIdx === 0) {
        cell.font = { ...BASE_FONT, bold: true };
      } else if (colIdx === 2) {
        cell.font = {
          ...BASE_FONT,
          bold: true,
          color: { argb: getStatusFontColor(evaluation.status) },
        };
      } else {
        cell.font = BASE_FONT;
      }
      cell.alignment = {
        vertical: 'top',
        horizontal: colIdx === 2 ? 'center' : 'left',
        wrapText: true,
      };
      cell.border = THIN_BORDER;
      if (isAlt) {
        cell.fill = ALT_ROW_FILL;
      }
    });

    row.height = estimateRowHeight(
      [
        { text: clause.title, widthChars: 30 },
        { text: clause.description, widthChars: 42 },
        { text: statusText, widthChars: 15 },
        { text: outcomeText, widthChars: 58 },
        { text: remarksText, widthChars: 34 },
      ],
      15,
      30,
    );
  });
}

function buildListOfFindingsSheet(
  workbook: ExcelJS.Workbook,
  findings: readonly FindingRecord[],
  clauseLocations: ReadonlyMap<string, ClauseRowLocation>,
): void {
  const ws = workbook.addWorksheet('List of Findings');
  configurePrintLayout(ws, true);

  ws.columns = [
    { key: 'num', width: 12 },
    { key: 'clause', width: 40 },
    { key: 'type', width: 16 },
    { key: 'remarks', width: 68 },
  ];

  const headerRow = ws.getRow(1);
  const headers = [
    'Finding #',
    'Clause',
    'Finding Type',
    'Auditor Remarks',
  ];
  headers.forEach((title, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = title;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx === 0 || idx === 2 ? 'center' : 'left',
      wrapText: true,
    };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 26;
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  if (findings.length === 0) {
    ws.mergeCells(2, 1, 2, 4);
    const emptyRow = ws.getRow(2);
    const cell = emptyRow.getCell(1);
    cell.value = 'No nonconformities or observations were recorded during this audit.';
    cell.font = { ...BASE_FONT, italic: true, color: { argb: 'FF475569' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    for (let col = 1; col <= 4; col += 1) {
      emptyRow.getCell(col).border = THIN_BORDER;
    }
    emptyRow.height = 24;
    return;
  }

  ws.autoFilter = 'A1:D1';

  findings.forEach((finding, index) => {
    const row = ws.getRow(index + 2);
    const location = clauseLocations.get(finding.clauseId);
    const sheetRef = location ? escapeExcelSheetName(location.sheetName) : null;
    const refRow = location?.rowNumber;
    const isAlt = index % 2 === 1;

    const numCell = row.getCell(1);
    numCell.value = finding.findingNumber;

    const clauseCell = row.getCell(2);
    clauseCell.value =
      sheetRef && refRow
        ? { formula: `${sheetRef}!A${refRow}`, result: finding.clauseTitle }
        : finding.clauseTitle;

    const typeCell = row.getCell(3);
    typeCell.value =
      sheetRef && refRow
        ? { formula: `${sheetRef}!C${refRow}`, result: finding.findingType }
        : finding.findingType;

    const remarksCell = row.getCell(4);
    remarksCell.value =
      sheetRef && refRow
        ? {
            formula: `IF(${sheetRef}!E${refRow}="","",${sheetRef}!E${refRow})`,
            result: finding.remarks,
          }
        : finding.remarks;

    [numCell, clauseCell, typeCell, remarksCell].forEach((cell, colIdx) => {
      cell.font =
        colIdx === 2
          ? {
              ...BASE_FONT,
              bold: true,
              color: { argb: getStatusFontColor(finding.findingType) },
            }
          : BASE_FONT;
      cell.alignment = {
        vertical: 'top',
        horizontal: colIdx === 0 || colIdx === 2 ? 'center' : 'left',
        wrapText: true,
      };
      cell.border = THIN_BORDER;
      if (isAlt) {
        cell.fill = ALT_ROW_FILL;
      }
    });

    row.height = estimateRowHeight(
      [
        { text: finding.clauseTitle, widthChars: 40 },
        { text: finding.remarks, widthChars: 68 },
      ],
      15,
      26,
    );
  });
}

export async function exportAuditReportToExcel(
  report: AuditReport,
  config: AuditConfig,
  sheets: readonly ClauseSheetDefinition[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = report.details.teamLeader || 'Control Union Auditor';
  workbook.created = new Date();
  workbook.modified = new Date();

  const summary = calculateFindingsSummary(
    sheets,
    report.details.schemes,
    report.evaluations,
  );
  const findings = extractFindingsList(
    sheets,
    report.details.schemes,
    report.evaluations,
  );

  const clauseSheetRanges: SheetRowRange[] = sheets.map((sheet) => {
    const visibleCount = getVisibleClausesForSheet(
      sheet,
      report.details.schemes,
      report.evaluations,
    ).length;
    return {
      sheetName: sheet.sheetName,
      lastRow: Math.max(visibleCount + 1, 2),
    };
  });

  const clauseLocations = new Map<string, ClauseRowLocation>();

  // Preserve the exact 7-sheet order from Audit Report Format-CU SLAB - Rev;01 1.xlsx
  // plus the 8th auto-generated List of Findings sheet.
  buildAuditDetailsSheet(workbook, report, config);
  buildIntroductionSheet(workbook, report, config);
  buildFindingsAndConclusionSheet(
    workbook,
    report,
    config,
    summary,
    clauseSheetRanges,
  );

  for (const sheet of sheets) {
    buildClauseSheet(workbook, sheet, report, clauseLocations);
  }

  buildListOfFindingsSheet(workbook, findings, clauseLocations);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const companySlug = (report.details.companyName || 'Audit_Report')
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const projectSlug = report.details.cuProjectNumber
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '_');
  const filename = projectSlug
    ? `Audit_Report_${companySlug}_${projectSlug}.xlsx`
    : `Audit_Report_${companySlug}.xlsx`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
