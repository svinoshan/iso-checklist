import {
  CURRENT_SCHEMA_VERSION,
  createAuditId,
  createEmptyAuditReport,
} from '../domain/auditRules';
import type {
  AccreditedEntityCode,
  AuditDraftSummary,
  AuditReport,
  AuditType,
  ClauseEvaluation,
  ClauseStatus,
  IsoScheme,
  NcResolutionStatus,
} from '../types/audit';

/**
 * Storage contract designed so Phase 2 can swap in an HTTP/Database-backed
 * implementation (e.g., ApiAuditRepository) with zero changes to UI or export logic.
 */
export interface AuditRepository {
  getActiveDraft(): Promise<AuditReport | null>;
  saveDraft(report: AuditReport): Promise<AuditReport>;
  listDrafts(): Promise<AuditDraftSummary[]>;
  getDraftById(id: string): Promise<AuditReport | null>;
  deleteDraft(id: string): Promise<void>;
}

const STORAGE_DRAFTS_KEY = 'cu_iso_audit_drafts_v1';
const STORAGE_ACTIVE_ID_KEY = 'cu_iso_audit_active_id_v1';

const VALID_SCHEMES: readonly IsoScheme[] = ['9001', '14001', '45001'];
const VALID_AUDIT_TYPES: readonly AuditType[] = [
  'Initial Stage 01',
  'Initial Stage 02',
  'Surveillance',
  'Recertification',
];
const VALID_ENTITIES: readonly AccreditedEntityCode[] = ['SLAB', 'SWEDAC'];
const VALID_CLAUSE_STATUSES: readonly ClauseStatus[] = [
  'Comply',
  'Observation',
  'Minor NC',
  'Major NC',
  'N/A',
];
const VALID_NC_STATUSES: readonly NcResolutionStatus[] = ['Open', 'Closed'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseSchemes(value: unknown): IsoScheme[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is IsoScheme =>
      typeof item === 'string' && VALID_SCHEMES.includes(item as IsoScheme),
  );
}

function parseEvaluations(value: unknown): Record<string, ClauseEvaluation> {
  if (!isRecord(value)) {
    return {};
  }
  const result: Record<string, ClauseEvaluation> = {};
  for (const [clauseId, rawEval] of Object.entries(value)) {
    if (!isRecord(rawEval)) {
      continue;
    }
    const rawStatus = rawEval['status'];
    const status: ClauseStatus | null =
      typeof rawStatus === 'string' &&
      VALID_CLAUSE_STATUSES.includes(rawStatus as ClauseStatus)
        ? (rawStatus as ClauseStatus)
        : null;

    const rawNcStatus = rawEval['ncStatus'];
    const ncStatus: NcResolutionStatus =
      typeof rawNcStatus === 'string' &&
      VALID_NC_STATUSES.includes(rawNcStatus as NcResolutionStatus)
        ? (rawNcStatus as NcResolutionStatus)
        : 'Open';

    result[clauseId] = {
      status,
      ncStatus,
      remarks: asString(rawEval['remarks']),
    };
  }
  return result;
}

export function parseAuditReportJson(raw: unknown): AuditReport {
  if (!isRecord(raw)) {
    throw new Error('Invalid draft file format: expected a JSON object.');
  }

  const base = createEmptyAuditReport();
  const detailsRaw = isRecord(raw['details']) ? raw['details'] : {};
  const introRaw = isRecord(raw['introduction']) ? raw['introduction'] : {};
  const conclusionRaw = isRecord(raw['conclusion']) ? raw['conclusion'] : {};

  const rawAuditType = detailsRaw['auditType'];
  const auditType: AuditType | '' =
    typeof rawAuditType === 'string' &&
    VALID_AUDIT_TYPES.includes(rawAuditType as AuditType)
      ? (rawAuditType as AuditType)
      : '';

  const rawEntity = introRaw['accreditedLegalEntity'];
  const accreditedLegalEntity: AccreditedEntityCode | '' =
    typeof rawEntity === 'string' &&
    VALID_ENTITIES.includes(rawEntity as AccreditedEntityCode)
      ? (rawEntity as AccreditedEntityCode)
      : '';

  const rawFollowUp = conclusionRaw['followUpRequired'];
  const followUpRequired: 'Yes' | 'No' | '' =
    rawFollowUp === 'Yes' || rawFollowUp === 'No' ? rawFollowUp : '';

  const selectedConclusions = Array.isArray(conclusionRaw['selectedConclusions'])
    ? conclusionRaw['selectedConclusions'].filter(
        (item): item is string => typeof item === 'string',
      )
    : [];

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: asString(raw['id']) || createAuditId(),
    createdAt: asString(raw['createdAt']) || base.createdAt,
    updatedAt: asString(raw['updatedAt']) || base.updatedAt,
    details: {
      auditType,
      companyName: asString(detailsRaw['companyName']),
      schemes: parseSchemes(detailsRaw['schemes']),
      auditStartDate: asString(detailsRaw['auditStartDate']),
      auditEndDate: asString(detailsRaw['auditEndDate']),
      cuProjectNumber: asString(detailsRaw['cuProjectNumber']),
      teamLeader: asString(detailsRaw['teamLeader']),
      teamMembers: asString(detailsRaw['teamMembers']),
      reportCompletedDate: asString(detailsRaw['reportCompletedDate']),
    },
    introduction: {
      scopeOfCertification: asString(introRaw['scopeOfCertification']),
      accreditedLegalEntity,
    },
    evaluations: parseEvaluations(raw['evaluations']),
    conclusion: {
      selectedConclusions,
      correctiveActionDueDate: asString(conclusionRaw['correctiveActionDueDate']),
      certificationRecommendation: asString(
        conclusionRaw['certificationRecommendation'],
      ),
      auditorDeclarationAccepted: asBoolean(
        conclusionRaw['auditorDeclarationAccepted'],
      ),
      followUpRequired,
      followUpComment: asString(conclusionRaw['followUpComment']),
      nextAuditDate: asString(conclusionRaw['nextAuditDate']),
    },
  };
}

export class LocalStorageAuditRepository implements AuditRepository {
  private readAll(): Record<string, AuditReport> {
    try {
      const raw = window.localStorage.getItem(STORAGE_DRAFTS_KEY);
      if (!raw) {
        return {};
      }
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) {
        return {};
      }
      const map: Record<string, AuditReport> = {};
      for (const [id, entry] of Object.entries(parsed)) {
        try {
          map[id] = parseAuditReportJson(entry);
        } catch {
          // Skip malformed entries without crashing the workspace
        }
      }
      return map;
    } catch {
      return {};
    }
  }

  private writeAll(map: Record<string, AuditReport>): void {
    window.localStorage.setItem(STORAGE_DRAFTS_KEY, JSON.stringify(map));
  }

  async getActiveDraft(): Promise<AuditReport | null> {
    const activeId = window.localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
    const map = this.readAll();
    const activeDraft = activeId ? map[activeId] : undefined;
    if (activeDraft) {
      return activeDraft;
    }
    const drafts = Object.values(map).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
    return drafts[0] ?? null;
  }

  async saveDraft(report: AuditReport): Promise<AuditReport> {
    const stamped: AuditReport = {
      ...report,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };
    const map = this.readAll();
    map[stamped.id] = stamped;
    this.writeAll(map);
    window.localStorage.setItem(STORAGE_ACTIVE_ID_KEY, stamped.id);
    return stamped;
  }

  async listDrafts(): Promise<AuditDraftSummary[]> {
    const map = this.readAll();
    return Object.values(map)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((draft) => ({
        id: draft.id,
        companyName: draft.details.companyName || 'Untitled Company',
        cuProjectNumber: draft.details.cuProjectNumber,
        auditType: draft.details.auditType,
        schemes: draft.details.schemes,
        updatedAt: draft.updatedAt,
      }));
  }

  async getDraftById(id: string): Promise<AuditReport | null> {
    const map = this.readAll();
    const found = map[id] ?? null;
    if (found) {
      window.localStorage.setItem(STORAGE_ACTIVE_ID_KEY, found.id);
    }
    return found;
  }

  async deleteDraft(id: string): Promise<void> {
    const map = this.readAll();
    delete map[id];
    this.writeAll(map);
    const activeId = window.localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
    if (activeId === id) {
      window.localStorage.removeItem(STORAGE_ACTIVE_ID_KEY);
    }
  }
}

export function downloadDraftJsonFile(report: AuditReport): void {
  const safeName = (report.details.companyName || 'audit-draft')
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const filename = `${safeName || 'audit-draft'}_${report.details.cuProjectNumber || 'draft'}.iso-audit.json`;
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function readDraftJsonFile(file: File): Promise<AuditReport> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  return parseAuditReportJson(parsed);
}

export const auditRepository: AuditRepository = new LocalStorageAuditRepository();
