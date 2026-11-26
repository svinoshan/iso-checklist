import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

type RgbColor = readonly [number, number, number];
type MutableRgb = [number, number, number];

function rgb(color: RgbColor): MutableRgb {
  return [color[0], color[1], color[2]];
}

// Official Control Union Brand Palette (from logo1.png & brand deck)
const CU_BLUE: RgbColor = [0, 144, 208]; // #0090D0
const CU_NAVY: RgbColor = [14, 59, 92]; // #0E3B5C
const CU_SLATE: RgbColor = [94, 116, 120]; // #5E7478
const CU_ICE: RgbColor = [214, 239, 250]; // #D6EFFA
const CU_WAVE_SOFT: RgbColor = [144, 209, 239]; // #90D1EF
const CU_SOFT_BG: RgbColor = [241, 248, 252]; // #F1F8FC
const TEXT_DARK: RgbColor = [15, 23, 42]; // #0F172A
const TEXT_MUTED: RgbColor = [71, 85, 105]; // #475569
const BORDER_LIGHT: RgbColor = [203, 213, 225]; // #CBD5E1
const ALT_ROW_BG: RgbColor = [248, 250, 252]; // #F8FAFC
const WHITE: RgbColor = [255, 255, 255];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 14;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const TOP_CONTENT_Y = 24;
const BOTTOM_LIMIT_Y = 278;

interface LoadedImageAsset {
  dataUrl: string;
  aspectRatio: number;
}

interface SampledEmblemMask {
  width: number;
  height: number;
  aspectRatio: number;
  data: Uint8ClampedArray;
  minX: number;
  minY: number;
  boxW: number;
  boxH: number;
}

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY?: number;
  };
}

function getLastTableFinalY(doc: jsPDF, fallbackY: number): number {
  const typedDoc = doc as JsPDFWithAutoTable;
  return typedDoc.lastAutoTable?.finalY ?? fallbackY;
}

function getStatusRgb(status: ClauseStatus | null): RgbColor {
  switch (status) {
    case 'Comply':
      return [4, 120, 87];
    case 'Observation':
      return [29, 78, 216];
    case 'Minor NC':
      return [180, 83, 9];
    case 'Major NC':
      return [185, 28, 28];
    case 'N/A':
      return [71, 85, 105];
    default:
      return [100, 116, 139];
  }
}

async function loadImageAsset(
  url: string,
  fallbackAspectRatio: number,
): Promise<LoadedImageAsset | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return null;
    }
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error(`Invalid image data URL for ${url}`));
        }
      };
      reader.onerror = () => reject(new Error(`Failed to read image blob for ${url}`));
      reader.readAsDataURL(blob);
    });

    const aspectRatio = await new Promise<number>((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(
          img.naturalHeight > 0
            ? img.naturalWidth / img.naturalHeight
            : fallbackAspectRatio,
        );
      };
      img.onerror = () => resolve(fallbackAspectRatio);
      img.src = dataUrl;
    });

    return { dataUrl, aspectRatio };
  } catch {
    return null;
  }
}

function drawControlUnionLogo(
  doc: jsPDF,
  logo: LoadedImageAsset | null,
  x: number,
  y: number,
  heightMm: number,
): void {
  if (logo) {
    const widthMm = heightMm * logo.aspectRatio;
    doc.addImage(logo.dataUrl, 'PNG', x, y, widthMm, heightMm);
    return;
  }

  // Crisp vector fallback matching Control Union wordmark if logo PNG is not yet placed in public/
  const iconR = heightMm * 0.45;
  const cx = x + iconR;
  const cy = y + heightMm * 0.5;
  doc.setFillColor(...CU_BLUE);
  doc.circle(cx, cy, iconR, 'F');
  doc.setFillColor(...WHITE);
  doc.setLineWidth(heightMm * 0.14);
  doc.setDrawColor(...WHITE);
  doc.line(cx - iconR * 0.7, cy + iconR * 0.25, cx + iconR * 0.7, cy - iconR * 0.25);

  const fontSize = Math.max(8, heightMm * 1.45);
  const textX = x + iconR * 2 + 2.5;
  const textY = y + heightMm * 0.68;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(...CU_SLATE);
  doc.text('CONTROL', textX, textY);
  const controlWidth = doc.getTextWidth('CONTROL');

  doc.setFont('helvetica', 'normal');
  doc.text('UNION', textX + controlWidth + 0.5, textY);
}

function lerpRgb(a: RgbColor, b: RgbColor, t: number): RgbColor {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * clamped),
    Math.round(a[1] + (b[1] - a[1]) * clamped),
    Math.round(a[2] + (b[2] - a[2]) * clamped),
  ];
}

function isCyanEmblemPixel(r: number, b: number, a: number): boolean {
  // Isolate Control Union's vivid cyan globe pixels while excluding white background
  // and neutral slate-grey CONTROLUNION wordmark (#5E7478 where b - r <= 30)
  return a > 80 && b - r >= 45 && b > 105;
}

async function sampleEmblemMaskFromAsset(
  asset: LoadedImageAsset,
  restrictToLeftFraction: number,
): Promise<SampledEmblemMask | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to decode emblem image'));
      el.src = asset.dataUrl;
    });

    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (width === 0 || height === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const maxScanX = Math.floor(width * restrictToLeftFraction);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < maxScanX; x += 1) {
        const idx = (y * width + x) * 4;
        const r = data[idx] ?? 255;
        const b = data[idx + 2] ?? 255;
        const a = data[idx + 3] ?? 0;

        if (isCyanEmblemPixel(r, b, a)) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX <= minX || maxY <= minY) {
      return null;
    }

    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;

    return {
      width,
      height,
      aspectRatio: boxW / boxH,
      data,
      minX,
      minY,
      boxW,
      boxH,
    };
  } catch {
    return null;
  }
}

function drawControlUnionDottedEmblem(
  doc: jsPDF,
  mask: SampledEmblemMask | null,
  rightEdgeX: number,
  centerY: number,
  targetW: number,
): void {
  if (mask) {
    const targetH = targetW / mask.aspectRatio;
    const startX = rightEdgeX - targetW;
    const startY = centerY - targetH / 2;

    const stepX = 2.4;
    const stepY = 2.1;
    let rowIdx = 0;

    for (let py = startY; py <= startY + targetH; py += stepY) {
      const xOffset = rowIdx % 2 === 1 ? stepX * 0.5 : 0;
      rowIdx += 1;

      for (let px = startX + xOffset; px <= startX + targetW; px += stepX) {
        const u = (px - startX) / targetW;
        const v = (py - startY) / targetH;
        if (u < 0 || u > 1 || v < 0 || v > 1) {
          continue;
        }

        const sampleCx = mask.minX + u * (mask.boxW - 1);
        const sampleCy = mask.minY + v * (mask.boxH - 1);

        // 3x3 neighborhood sample for smooth anti-aliased silhouette fidelity
        let hits = 0;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        const sampleStepX = Math.max(1, Math.round(mask.boxW / 80));
        const sampleStepY = Math.max(1, Math.round(mask.boxH / 80));

        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const sx = Math.max(
              0,
              Math.min(mask.width - 1, Math.round(sampleCx + ox * sampleStepX)),
            );
            const sy = Math.max(
              0,
              Math.min(mask.height - 1, Math.round(sampleCy + oy * sampleStepY)),
            );
            const idx = (sy * mask.width + sx) * 4;
            const r = mask.data[idx] ?? 255;
            const g = mask.data[idx + 1] ?? 255;
            const b = mask.data[idx + 2] ?? 255;
            const a = mask.data[idx + 3] ?? 0;

            if (isCyanEmblemPixel(r, b, a)) {
              hits += 1;
              rSum += r;
              gSum += g;
              bSum += b;
            }
          }
        }

        const coverage = hits / 9;
        if (coverage < 0.35) {
          continue;
        }

        const avgColor: RgbColor = [
          Math.round(rSum / hits),
          Math.round(gSum / hits),
          Math.round(bSum / hits),
        ];

        // Soften gently on the left side facing the title, blooming into vivid cyan on the right
        const tintStrength = 0.42 + u * 0.48;
        const dotColor = lerpRgb(WHITE, avgColor, tintStrength);
        const dotRadius = 0.34 + coverage * 0.42;

        doc.setFillColor(...dotColor);
        doc.circle(px, py, dotRadius, 'F');
      }
    }
    return;
  }

  // Vector math fallback if no Control Union logo PNG is available in public/
  const radius = targetW * 0.5;
  const cx = rightEdgeX - radius;
  const stepX = 2.6;
  const stepY = 2.25;
  let rowIdx = 0;

  for (let py = centerY - radius; py <= centerY + radius; py += stepY) {
    const xOffset = rowIdx % 2 === 1 ? stepX * 0.5 : 0;
    rowIdx += 1;

    for (let px = cx - radius + xOffset; px <= cx + radius; px += stepX) {
      const nx = (px - cx) / radius;
      const ny = (py - centerY) / radius;
      const dist = Math.hypot(nx, ny);
      if (dist > 0.98) {
        continue;
      }

      const channelCenterY = -0.24 * nx - 0.14 * Math.sin(nx * Math.PI);
      const channelHalfWidth = 0.21 - 0.04 * nx * nx;
      if (Math.abs(ny - channelCenterY) < channelHalfWidth) {
        continue;
      }

      const intensity = Math.max(0.2, Math.min(1, (nx + 0.85) / 1.7));
      const dotColor =
        intensity > 0.55
          ? lerpRgb(CU_WAVE_SOFT, CU_BLUE, (intensity - 0.55) / 0.45)
          : lerpRgb(CU_ICE, CU_WAVE_SOFT, intensity / 0.55);
      doc.setFillColor(...dotColor);
      doc.circle(px, py, 0.34 + intensity * 0.4, 'F');
    }
  }
}

function drawCoverPage(
  doc: jsPDF,
  report: AuditReport,
  config: AuditConfig,
  logo: LoadedImageAsset | null,
  emblemMask: SampledEmblemMask | null,
  footerImage: LoadedImageAsset | null,
): void {
  // Full-width Control Union cyan top accent strip
  doc.setFillColor(...CU_BLUE);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  // Top-left official Control Union logo
  drawControlUnionLogo(doc, logo, 18, 13.5, 11.5);

  // Top-right official Control Union tagline ("The proof to your promise")
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const promiseText = 'promise';
  const promiseWidth = doc.getTextWidth(promiseText);
  const taglineRightX = PAGE_W - 14;

  doc.setTextColor(...CU_BLUE);
  doc.text(promiseText, taglineRightX, 20.5, { align: 'right' });

  doc.setTextColor(...CU_NAVY);
  doc.text('The proof to your ', taglineRightX - promiseWidth, 20.5, {
    align: 'right',
  });

  // Subtle top header hairline
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.25);
  doc.line(18, 30, PAGE_W - 14, 30);

  // 1:1 Halftone Dotted Control Union Emblem in upper-right (aligned cleanly to right margin)
  drawControlUnionDottedEmblem(doc, emblemMask, PAGE_W - 14, 96, 86);

  // Hero Title Block (cleanly positioned on the left)
  let y = 78;

  // Short Control Union cyan accent dash
  doc.setFillColor(...CU_BLUE);
  doc.rect(18, y - 6, 18, 1.3, 'F');

  // Audit Type subtitle
  const auditTypeHeading = report.details.auditType
    ? `${report.details.auditType} Audit Report`
    : 'Management System Audit Report';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...CU_NAVY);
  doc.text(auditTypeHeading, 18, y);
  y += 11;

  // Company Name (Primary Display Title)
  const companyTitle = report.details.companyName.trim() || 'Audited Organization';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(23);
  doc.setTextColor(...CU_NAVY);
  const companyLines = doc.splitTextToSize(companyTitle, 112) as string[];
  doc.text(companyLines, 18, y);
  y += companyLines.length * 9.5 + 3.5;

  // Subtitle: Management System Certification
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...CU_NAVY);
  doc.text('Management System Certification', 18, y);
  y += 7.5;

  // Selected ISO Standards with Version Years (e.g. ISO 9001:2015)
  const orderedStandards = config.schemes
    .filter((scheme) => report.details.schemes.includes(scheme.code))
    .map((scheme) => scheme.standardVersion);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...CU_BLUE);
  if (orderedStandards.length > 0) {
    for (const standardLine of orderedStandards) {
      doc.text(standardLine, 18, y);
      y += 6;
    }
  } else {
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont('helvetica', 'italic');
    doc.text('No ISO scheme selected', 18, y);
  }

  // Compute footer height first so the Audit Details block can anchor cleanly above it
  const footerH = footerImage
    ? Math.min(PAGE_W / footerImage.aspectRatio, 42)
    : 3.5;

  const metaX = 94;
  const metaValueX = metaX + 43;
  const metaValueMaxW = PAGE_W - 14 - metaValueX;

  const dateRange =
    report.details.auditStartDate && report.details.auditEndDate
      ? `${formatDisplayDate(report.details.auditStartDate)} - ${formatDisplayDate(report.details.auditEndDate)}`
      : formatDisplayDate(
          report.details.auditStartDate || report.details.auditEndDate,
        ) || '-';

  const metaRows: readonly [string, string][] = [
    ['Audit Start - End Date', dateRange],
    ['CU Project Number', report.details.cuProjectNumber.trim() || '-'],
    ['Team Leader', report.details.teamLeader.trim() || '-'],
    ['Audit Team', report.details.teamMembers.trim() || '-'],
    [
      'Report Completed Date',
      formatDisplayDate(report.details.reportCompletedDate) || '-',
    ],
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const measuredRows = metaRows.map(([label, value]) => {
    const valLines = doc.splitTextToSize(value, metaValueMaxW) as string[];
    const rowH = Math.max(1, valLines.length) * 4.5 + 3.5;
    return { label, valLines, rowH };
  });

  const totalMetaRowsHeight = measuredRows.reduce((sum, r) => sum + r.rowH, 0);
  const footerClearance = footerImage ? 8 : 16;
  const bandTopY = Math.max(
    y + 18,
    PAGE_H - footerH - footerClearance - totalMetaRowsHeight - 2,
  );

  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.25);
  doc.line(metaX, bandTopY, PAGE_W - 14, bandTopY);

  let metaY = bandTopY + 8.5;
  doc.setFontSize(9);
  for (const row of measuredRows) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(row.label, metaX, metaY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CU_NAVY);
    doc.text(row.valLines, metaValueX, metaY);
    metaY += row.rowH;
  }

  // Panoramic Control Union Horizon Footer Artwork (docs/image.png -> public/control-union-footer.png)
  if (footerImage) {
    const footerW = footerH * footerImage.aspectRatio;
    const footerX = (PAGE_W - footerW) / 2;
    doc.addImage(
      footerImage.dataUrl,
      'PNG',
      footerX,
      PAGE_H - footerH,
      footerW,
      footerH,
    );
  } else {
    doc.setFillColor(...CU_BLUE);
    doc.rect(0, PAGE_H - 3.5, PAGE_W, 3.5, 'F');
  }
}

function drawSectionBanner(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...CU_NAVY);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, 8.5, 1.2, 1.2, 'F');
  doc.setFillColor(...CU_BLUE);
  doc.rect(MARGIN_X, y, 2.5, 8.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...WHITE);
  doc.text(title, MARGIN_X + 6, y + 5.7);
  return y + 12;
}

function ensurePageSpace(doc: jsPDF, currentY: number, neededHeight: number): number {
  if (currentY + neededHeight > BOTTOM_LIMIT_Y) {
    doc.addPage();
    return TOP_CONTENT_Y;
  }
  return currentY;
}

function drawTextCard(
  doc: jsPDF,
  heading: string,
  body: string,
  startY: number,
  options?: { accentLeft?: boolean; italicEmpty?: string },
): number {
  const displayBody = body.trim() || options?.italicEmpty || '-';
  const isItalic = !body.trim() && Boolean(options?.italicEmpty);
  doc.setFont('helvetica', isItalic ? 'italic' : 'normal');
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(displayBody, CONTENT_W - 8) as string[];
  const cardH = 8 + lines.length * 4.3 + 4;

  const y = ensurePageSpace(doc, startY, cardH + 3);

  doc.setFillColor(...(options?.accentLeft ? CU_SOFT_BG : WHITE));
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, cardH, 1.2, 1.2, 'FD');

  if (options?.accentLeft) {
    doc.setFillColor(...CU_BLUE);
    doc.rect(MARGIN_X, y, 2, cardH, 'F');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...CU_NAVY);
  doc.text(heading.toUpperCase(), MARGIN_X + 4.5, y + 5.5);

  doc.setFont('helvetica', isItalic ? 'italic' : 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...(isItalic ? TEXT_MUTED : TEXT_DARK));
  doc.text(lines, MARGIN_X + 4.5, y + 10.5);

  return y + cardH + 4;
}

function drawCheckbox(
  doc: jsPDF,
  x: number,
  y: number,
  checked: boolean,
): void {
  const size = 3.3;
  if (checked) {
    doc.setFillColor(...CU_BLUE);
    doc.setDrawColor(...CU_BLUE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, size, size, 0.5, 0.5, 'FD');

    doc.setDrawColor(...WHITE);
    doc.setLineWidth(0.55);
    doc.line(x + 0.7, y + 1.75, x + 1.4, y + 2.45);
    doc.line(x + 1.4, y + 2.45, x + 2.65, y + 0.9);
  } else {
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, y, size, size, 0.5, 0.5, 'FD');
  }
}

function drawRadioCircle(
  doc: jsPDF,
  cx: number,
  cy: number,
  selected: boolean,
): void {
  const r = 1.7;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...(selected ? CU_BLUE : BORDER_LIGHT));
  doc.setLineWidth(0.4);
  doc.circle(cx, cy, r, 'FD');
  if (selected) {
    doc.setFillColor(...CU_BLUE);
    doc.circle(cx, cy, 0.9, 'F');
  }
}

function drawIntroductionSection(
  doc: jsPDF,
  report: AuditReport,
  config: AuditConfig,
): void {
  doc.addPage();
  let y = TOP_CONTENT_Y;
  y = drawSectionBanner(doc, '1. Audit Introduction & Control Union', y);

  y = drawTextCard(
    doc,
    `${config.staticContent.organizationHeading} - Audit Introduction`,
    config.staticContent.introductionText,
    y,
  );

  y = drawTextCard(
    doc,
    'Scope of Certification',
    report.introduction.scopeOfCertification,
    y,
    { accentLeft: true, italicEmpty: 'Not specified' },
  );

  // Two-column row: Accreditation Body & Accredited Legal Entity
  const entityMatch = config.accreditedEntities.find(
    (item) =>
      item.code === report.introduction.accreditedLegalEntity && !item.disabled,
  );
  const bodyText = entityMatch ? entityMatch.fullName : 'Not selected';
  const legalEntityText = entityMatch
    ? [entityMatch.legalEntityName, entityMatch.legalEntityAddress]
        .filter(Boolean)
        .join('\n') || 'Not specified'
    : 'Not selected';

  const halfW = (CONTENT_W - 4) / 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const leftLines = doc.splitTextToSize(bodyText, halfW - 8) as string[];
  const rightLines = doc.splitTextToSize(legalEntityText, halfW - 8) as string[];
  const boxH = 8 + Math.max(leftLines.length, rightLines.length) * 4.3 + 4;

  y = ensurePageSpace(doc, y, boxH + 4);
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.25);

  // Left card: Accreditation Body
  doc.roundedRect(MARGIN_X, y, halfW, boxH, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...CU_NAVY);
  doc.text('ACCREDITATION BODY', MARGIN_X + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.text(leftLines, MARGIN_X + 4, y + 10.5);

  // Right card: Accredited Legal Entity (reset fill/stroke explicitly because PDF text color shares fill state)
  const rightX = MARGIN_X + halfW + 4;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.25);
  doc.roundedRect(rightX, y, halfW, boxH, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...CU_NAVY);
  doc.text('ACCREDITED LEGAL ENTITY', rightX + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.text(rightLines, rightX + 4, y + 10.5);

  y += boxH + 4;

  y = drawTextCard(
    doc,
    'Confidentiality Statement',
    config.staticContent.confidentialityStatement,
    y,
  );

  drawTextCard(doc, 'Disclaimer', config.staticContent.disclaimerText, y);
}

function drawFindingsAndConclusionSection(
  doc: jsPDF,
  report: AuditReport,
  config: AuditConfig,
  summary: FindingsSummary,
  findings: readonly FindingRecord[],
): void {
  doc.addPage();
  let y = TOP_CONTENT_Y;
  y = drawSectionBanner(doc, '2. Audit Findings & Conclusion', y);

  // 5 KPI Summary Tiles
  const kpis: readonly { label: string; value: number; accent: RgbColor }[] = [
    { label: 'Number of NCs', value: summary.totalNcs, accent: CU_NAVY },
    { label: 'Minor NC', value: summary.minorNcs, accent: [180, 83, 9] },
    { label: 'Major NC', value: summary.majorNcs, accent: [185, 28, 28] },
    { label: 'Observations', value: summary.observations, accent: [29, 78, 216] },
    { label: 'Open NC', value: summary.openNcs, accent: CU_BLUE },
  ];

  const gap = 3;
  const tileW = (CONTENT_W - gap * (kpis.length - 1)) / kpis.length;
  const tileH = 16;

  kpis.forEach((kpi, idx) => {
    const tx = MARGIN_X + idx * (tileW + gap);
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.25);
    doc.roundedRect(tx, y, tileW, tileH, 1.2, 1.2, 'FD');

    doc.setFillColor(...kpi.accent);
    doc.rect(tx, y, tileW, 1.4, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(kpi.label, tx + tileW / 2, y + 6.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...kpi.accent);
    doc.text(String(kpi.value), tx + tileW / 2, y + 13.2, { align: 'center' });
  });

  y += tileH + 6;

  // List of Findings Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CU_NAVY);
  doc.text(`List of Findings (${findings.length})`, MARGIN_X, y);
  y += 3;

  if (findings.length === 0) {
    y = drawTextCard(
      doc,
      'Findings Summary',
      '',
      y,
      {
        italicEmpty:
          'No nonconformities or observations were recorded during this audit.',
      },
    );
  } else {
    autoTable(doc, {
      startY: y,
      rowPageBreak: 'avoid',
      margin: { left: MARGIN_X, right: MARGIN_X, top: TOP_CONTENT_Y, bottom: 18 },
      head: [['#', 'Clause', 'Finding Type', 'Auditor Remarks']],
      body: findings.map((f) => [
        String(f.findingNumber),
        f.clauseTitle,
        f.findingType,
        f.remarks || '-',
      ]),
      styles: {
        font: 'helvetica',
        fontSize: 8.2,
        cellPadding: 2.2,
        textColor: rgb(TEXT_DARK),
        lineColor: rgb(BORDER_LIGHT),
        lineWidth: 0.2,
        valign: 'top',
      },
      headStyles: {
        fillColor: rgb(CU_NAVY),
        textColor: rgb(WHITE),
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: rgb(ALT_ROW_BG),
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 54, fontStyle: 'bold' },
        2: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: CONTENT_W - 90 },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 2) {
          const raw = String(data.cell.raw ?? '') as ClauseStatus;
          data.cell.styles.textColor = rgb(getStatusRgb(raw));
        }
      },
    });
    y = getLastTableFinalY(doc, y + 12) + 6;
  }

  // Audit Conclusion Checklist
  y = ensurePageSpace(doc, y, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CU_NAVY);
  doc.text('Audit Conclusion', MARGIN_X, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  const leadLines = doc.splitTextToSize(
    config.staticContent.auditConclusionLead,
    CONTENT_W,
  ) as string[];
  doc.text(leadLines, MARGIN_X, y);
  y += leadLines.length * 4 + 3;

  for (const item of config.conclusionItems) {
    const checked = report.conclusion.selectedConclusions.includes(item.id);
    const labelText = item.requiresDate
      ? `${item.text} ${
          report.conclusion.correctiveActionDueDate
            ? formatDisplayDate(report.conclusion.correctiveActionDueDate)
            : '____________'
        }.`
      : item.text;

    doc.setFont('helvetica', checked ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(labelText, CONTENT_W - 7) as string[];
    const rowH = Math.max(5.2, lines.length * 4 + 1.5);

    y = ensurePageSpace(doc, y, rowH);
    drawCheckbox(doc, MARGIN_X, y - 2.7, checked);
    doc.setTextColor(...(checked ? TEXT_DARK : TEXT_MUTED));
    doc.text(lines, MARGIN_X + 5.5, y);
    y += rowH;
  }

  y += 4;

  // Certification Recommendation
  y = ensurePageSpace(doc, y, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CU_NAVY);
  doc.text('Certification Recommendation', MARGIN_X, y);
  y += 5;

  for (const option of config.recommendations) {
    const selected = report.conclusion.certificationRecommendation === option.id;
    doc.setFont('helvetica', selected ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(option.label, CONTENT_W - 7) as string[];
    const rowH = Math.max(5.4, lines.length * 4 + 1.5);

    y = ensurePageSpace(doc, y, rowH);
    drawRadioCircle(doc, MARGIN_X + 1.8, y - 1.1, selected);
    doc.setTextColor(...(selected ? CU_NAVY : TEXT_MUTED));
    doc.text(lines, MARGIN_X + 5.5, y);
    y += rowH;
  }

  y += 4;

  // Auditor Declaration & Follow-up Box
  const declText = config.staticContent.auditorDeclarationText;
  const followUpStatus = report.conclusion.followUpRequired || 'Not Specified';
  const followUpComment =
    report.conclusion.followUpRequired === 'Yes'
      ? report.conclusion.followUpComment.trim()
      : '';
  const nextAuditText = formatDisplayDate(report.conclusion.nextAuditDate) || '-';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const declLines = doc.splitTextToSize(declText, CONTENT_W - 14) as string[];
  const commentLines = followUpComment
    ? (doc.splitTextToSize(`Comment: ${followUpComment}`, CONTENT_W - 8) as string[])
    : [];
  const boxHeight =
    9 +
    declLines.length * 4 +
    8 +
    (commentLines.length > 0 ? commentLines.length * 4 + 2 : 0) +
    7;

  y = ensurePageSpace(doc, y, boxHeight + 4);
  doc.setFillColor(...CU_SOFT_BG);
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, boxHeight, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...CU_NAVY);
  doc.text('AUDITOR DECLARATION & FOLLOW-UP REQUIREMENTS', MARGIN_X + 4, y + 5.5);

  let innerY = y + 11;
  drawCheckbox(doc, MARGIN_X + 4, innerY - 2.7, report.conclusion.auditorDeclarationAccepted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(declLines, MARGIN_X + 9.5, innerY);
  innerY += declLines.length * 4 + 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...CU_NAVY);
  doc.text(`Follow-up / Verification Audit Required: ${followUpStatus}`, MARGIN_X + 4, innerY);

  doc.text(`Next Audit Date: ${nextAuditText}`, MARGIN_X + CONTENT_W - 4, innerY, {
    align: 'right',
  });
  innerY += 5;

  if (commentLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    doc.text(commentLines, MARGIN_X + 4, innerY);
  }
}

function estimateClauseRowHeight(
  doc: jsPDF,
  row: readonly [string, string, string, string, string],
): number {
  const colWidths: readonly number[] = [26, 34, 16, 54, 32];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);

  let maxLines = 1;
  row.forEach((cellText, idx) => {
    const width = colWidths[idx] ?? 30;
    const lines = doc.splitTextToSize(cellText, width) as string[];
    if (lines.length > maxLines) {
      maxLines = lines.length;
    }
  });

  // 3.4mm per line at 7.6pt + 5mm top/bottom padding & safety buffer
  return maxLines * 3.4 + 5;
}

function drawClauseEvaluationSections(
  doc: jsPDF,
  report: AuditReport,
  sheets: readonly ClauseSheetDefinition[],
): void {
  doc.addPage();
  let y = TOP_CONTENT_Y;
  y = drawSectionBanner(doc, '3. Clause-by-Clause Audit Evaluation', y);

  for (const sheet of sheets) {
    const visibleClauses = getVisibleClausesForSheet(
      sheet,
      report.details.schemes,
      report.evaluations,
    );

    if (visibleClauses.length === 0) {
      continue;
    }

    const bodyRows: [string, string, string, string, string][] =
      visibleClauses.map((clause) => {
        const evaluation = getClauseEvaluation(report.evaluations, clause.id);
        return [
          clause.title,
          clause.description,
          evaluation.status ?? '-',
          resolveOutcomeText(clause, evaluation.status) || '-',
          evaluation.remarks.trim() || '-',
        ];
      });

    const firstRow = bodyRows[0];
    const firstRowHeight = firstRow ? estimateClauseRowHeight(doc, firstRow) : 20;
    // Reserve space for subheader (8mm) + table header (12mm) + at least the 1st clause row
    y = ensurePageSpace(doc, y, 20 + firstRowHeight);

    doc.setFillColor(...CU_SOFT_BG);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN_X, y, CONTENT_W, 6.8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(...CU_NAVY);
    doc.text(sheet.sheetName, MARGIN_X + 3, y + 4.7);
    y += 8;

    autoTable(doc, {
      startY: y,
      rowPageBreak: 'avoid',
      margin: { left: MARGIN_X, right: MARGIN_X, top: TOP_CONTENT_Y, bottom: 18 },
      head: [
        [
          'Clause',
          'Clause Description',
          'Audit Status',
          'Audit Outcome',
          'Auditor Remarks',
        ],
      ],
      body: bodyRows,
      styles: {
        font: 'helvetica',
        fontSize: 7.6,
        cellPadding: 2,
        textColor: rgb(TEXT_DARK),
        lineColor: rgb(BORDER_LIGHT),
        lineWidth: 0.2,
        valign: 'top',
      },
      headStyles: {
        fillColor: rgb(CU_NAVY),
        textColor: rgb(WHITE),
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: rgb(ALT_ROW_BG),
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 58 },
        4: { cellWidth: 36 },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 2) {
          const val = String(data.cell.raw ?? '');
          const status = val === '-' ? null : (val as ClauseStatus);
          data.cell.styles.textColor = rgb(getStatusRgb(status));
        }
      },
    });

    y = getLastTableFinalY(doc, y + 14) + 7;
  }
}

function drawRunningHeadersAndFooters(
  doc: jsPDF,
  report: AuditReport,
  logo: LoadedImageAsset | null,
): void {
  const totalPages = doc.getNumberOfPages();
  const headerRight = [
    report.details.companyName.trim() || 'Audit Report',
    report.details.cuProjectNumber.trim(),
  ]
    .filter(Boolean)
    .join('  ·  ');

  for (let page = 2; page <= totalPages; page += 1) {
    doc.setPage(page);

    // Running Header
    drawControlUnionLogo(doc, logo, MARGIN_X, 7.5, 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(headerRight, PAGE_W - MARGIN_X, 12.2, { align: 'right' });

    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.25);
    doc.line(MARGIN_X, 16, PAGE_W - MARGIN_X, 16);

    // Running Footer
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.25);
    doc.line(MARGIN_X, PAGE_H - 13, PAGE_W - MARGIN_X, PAGE_H - 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...CU_SLATE);
    doc.text('Confidential | Control Union Certification Audit Report', MARGIN_X, PAGE_H - 8.5);

    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Page ${page} of ${totalPages}`, PAGE_W - MARGIN_X, PAGE_H - 8.5, {
      align: 'right',
    });
  }
}

export async function exportAuditReportToPdf(
  report: AuditReport,
  config: AuditConfig,
  sheets: readonly ClauseSheetDefinition[],
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const [logo, markImage, footerImage] = await Promise.all([
    loadImageAsset('/control-union-logo.png', 3.9),
    loadImageAsset('/control-union-mark.png', 1.15),
    loadImageAsset('/control-union-footer.png', 6.2),
  ]);

  const emblemMask = markImage
    ? await sampleEmblemMaskFromAsset(markImage, 1)
    : logo
      ? await sampleEmblemMaskFromAsset(logo, 0.35)
      : null;

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

  drawCoverPage(doc, report, config, logo, emblemMask, footerImage);
  drawIntroductionSection(doc, report, config);
  drawFindingsAndConclusionSection(doc, report, config, summary, findings);
  drawClauseEvaluationSections(doc, report, sheets);
  drawRunningHeadersAndFooters(doc, report, logo);

  const companySlug = (report.details.companyName || 'Audit_Report')
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const projectSlug = report.details.cuProjectNumber
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '_');
  const filename = projectSlug
    ? `Audit_Report_${companySlug}_${projectSlug}.pdf`
    : `Audit_Report_${companySlug}.pdf`;

  doc.save(filename);
}
