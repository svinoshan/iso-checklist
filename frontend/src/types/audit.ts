export type IsoScheme = '9001' | '14001' | '45001';

export type AuditType =
  | 'Initial Stage 01'
  | 'Initial Stage 02'
  | 'Surveillance'
  | 'Recertification';

export type AccreditedEntityCode = 'SLAB' | 'SWEDAC';

export type ClauseStatus =
  | 'Comply'
  | 'Observation'
  | 'Minor NC'
  | 'Major NC'
  | 'N/A';

export type NcResolutionStatus = 'Open' | 'Closed';

export type ClauseSheetId =
  | 'clause-4-5'
  | 'clause-6-7'
  | 'clause-8'
  | 'clause-9-10';

export type WizardStepId =
  | 'audit-details'
  | 'audit-introduction'
  | ClauseSheetId
  | 'findings-conclusion';

export interface SchemeOption {
  code: IsoScheme;
  shortLabel: string;
  standardCode: string;
  fullName: string;
}

export interface AccreditedEntityOption {
  code: AccreditedEntityCode;
  label: string;
  fullName: string;
}

export interface AuditConclusionItem {
  id: string;
  text: string;
  requiresDate?: boolean;
}

export interface RecommendationOption {
  id: string;
  label: string;
}

export interface AuditStaticContent {
  reportTitle: string;
  introductionText: string;
  organizationHeading: string;
  confidentialityStatement: string;
  disclaimerText: string;
  auditConclusionLead: string;
  auditorDeclarationText: string;
}

export interface AuditConfig {
  appVersion: string;
  templateRevision: string;
  auditTypes: AuditType[];
  schemes: SchemeOption[];
  accreditedEntities: AccreditedEntityOption[];
  staticContent: AuditStaticContent;
  conclusionItems: AuditConclusionItem[];
  recommendations: RecommendationOption[];
}

export interface ClauseDefinition {
  id: string;
  title: string;
  description: string;
  applicableSchemes: IsoScheme[];
  supportsNotApplicable?: boolean;
  parentClauseId?: string;
  outcomeA: string;
  outcomeB: string;
  outcomeC?: string;
}

export interface ClauseSheetDefinition {
  id: ClauseSheetId;
  sheetName: string;
  navLabel: string;
  clauses: ClauseDefinition[];
}

export interface ClauseEvaluation {
  status: ClauseStatus | null;
  ncStatus: NcResolutionStatus;
  remarks: string;
}

export interface AuditDetails {
  auditType: AuditType | '';
  companyName: string;
  schemes: IsoScheme[];
  auditStartDate: string;
  auditEndDate: string;
  cuProjectNumber: string;
  teamLeader: string;
  teamMembers: string;
  reportCompletedDate: string;
}

export interface AuditIntroduction {
  scopeOfCertification: string;
  accreditedLegalEntity: AccreditedEntityCode | '';
}

export interface AuditConclusionState {
  selectedConclusions: string[];
  correctiveActionDueDate: string;
  certificationRecommendation: string;
  auditorDeclarationAccepted: boolean;
  followUpRequired: 'Yes' | 'No' | '';
  followUpComment: string;
  nextAuditDate: string;
}

export interface AuditReport {
  schemaVersion: number;
  id: string;
  createdAt: string;
  updatedAt: string;
  details: AuditDetails;
  introduction: AuditIntroduction;
  evaluations: Record<string, ClauseEvaluation>;
  conclusion: AuditConclusionState;
}

export interface FindingsSummary {
  totalNcs: number;
  minorNcs: number;
  majorNcs: number;
  observations: number;
  openNcs: number;
  closedNcs: number;
  evaluatedCount: number;
  visibleCount: number;
}

export interface FindingRecord {
  findingNumber: number;
  sheetName: string;
  clauseId: string;
  clauseTitle: string;
  findingType: 'Major NC' | 'Minor NC' | 'Observation';
  ncStatus: NcResolutionStatus | '—';
  remarks: string;
}

export interface AuditDraftSummary {
  id: string;
  companyName: string;
  cuProjectNumber: string;
  auditType: AuditType | '';
  schemes: IsoScheme[];
  updatedAt: string;
}

export interface ValidationIssue {
  stepId: WizardStepId;
  message: string;
}
