import type {
  AuditReport,
  ClauseDefinition,
  ClauseEvaluation,
  ClauseSheetDefinition,
  ClauseStatus,
  FindingRecord,
  FindingsSummary,
  IsoScheme,
  ValidationIssue,
} from '../types/audit';

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_EVALUATION: ClauseEvaluation = {
  status: null,
  ncStatus: 'Open',
  remarks: '',
};

export function createAuditId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyAuditReport(): AuditReport {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: createAuditId(),
    createdAt: now,
    updatedAt: now,
    details: {
      auditType: '',
      companyName: '',
      schemes: [],
      auditStartDate: '',
      auditEndDate: '',
      cuProjectNumber: '',
      teamLeader: '',
      teamMembers: '',
      reportCompletedDate: '',
    },
    introduction: {
      scopeOfCertification: '',
      accreditedLegalEntity: '',
    },
    evaluations: {},
    conclusion: {
      selectedConclusions: [],
      correctiveActionDueDate: '',
      certificationRecommendation: '',
      auditorDeclarationAccepted: false,
      followUpRequired: '',
      followUpComment: '',
      nextAuditDate: '',
    },
  };
}

export function isNcStatus(status: ClauseStatus | null): status is 'Minor NC' | 'Major NC' {
  return status === 'Minor NC' || status === 'Major NC';
}

export function isFindingStatus(
  status: ClauseStatus | null,
): status is 'Major NC' | 'Minor NC' | 'Observation' {
  return status === 'Major NC' || status === 'Minor NC' || status === 'Observation';
}

export function isClauseVisible(
  clause: ClauseDefinition,
  selectedSchemes: readonly IsoScheme[],
  evaluations: Readonly<Record<string, ClauseEvaluation>>,
): boolean {
  if (selectedSchemes.length === 0) {
    return false;
  }

  const matchesScheme = clause.applicableSchemes.some((scheme) =>
    selectedSchemes.includes(scheme),
  );
  if (!matchesScheme) {
    return false;
  }

  if (clause.parentClauseId) {
    const parentEval = evaluations[clause.parentClauseId];
    if (parentEval?.status === 'N/A') {
      return false;
    }
  }

  return true;
}

export function getVisibleClausesForSheet(
  sheet: ClauseSheetDefinition,
  selectedSchemes: readonly IsoScheme[],
  evaluations: Readonly<Record<string, ClauseEvaluation>>,
): ClauseDefinition[] {
  return sheet.clauses.filter((clause) =>
    isClauseVisible(clause, selectedSchemes, evaluations),
  );
}

export function getClauseEvaluation(
  evaluations: Readonly<Record<string, ClauseEvaluation>>,
  clauseId: string,
): ClauseEvaluation {
  return evaluations[clauseId] ?? DEFAULT_EVALUATION;
}

export function resolveOutcomeText(
  clause: ClauseDefinition,
  status: ClauseStatus | null,
): string {
  if (status === 'Comply' || status === 'Observation') {
    return clause.outcomeA;
  }
  if (status === 'Minor NC' || status === 'Major NC') {
    return clause.outcomeB;
  }
  if (status === 'N/A' && clause.outcomeC) {
    return clause.outcomeC;
  }
  return '';
}

export function calculateFindingsSummary(
  sheets: readonly ClauseSheetDefinition[],
  selectedSchemes: readonly IsoScheme[],
  evaluations: Readonly<Record<string, ClauseEvaluation>>,
): FindingsSummary {
  let minorNcs = 0;
  let majorNcs = 0;
  let observations = 0;
  let openNcs = 0;
  let closedNcs = 0;
  let evaluatedCount = 0;
  let visibleCount = 0;

  for (const sheet of sheets) {
    const visibleClauses = getVisibleClausesForSheet(sheet, selectedSchemes, evaluations);
    visibleCount += visibleClauses.length;

    for (const clause of visibleClauses) {
      const evaluation = evaluations[clause.id];
      if (!evaluation || evaluation.status === null) {
        continue;
      }

      evaluatedCount += 1;

      if (evaluation.status === 'Observation') {
        observations += 1;
      } else if (evaluation.status === 'Minor NC') {
        minorNcs += 1;
        if (evaluation.ncStatus === 'Closed') {
          closedNcs += 1;
        } else {
          openNcs += 1;
        }
      } else if (evaluation.status === 'Major NC') {
        majorNcs += 1;
        if (evaluation.ncStatus === 'Closed') {
          closedNcs += 1;
        } else {
          openNcs += 1;
        }
      }
    }
  }

  return {
    totalNcs: minorNcs + majorNcs,
    minorNcs,
    majorNcs,
    observations,
    openNcs,
    closedNcs,
    evaluatedCount,
    visibleCount,
  };
}

export function extractFindingsList(
  sheets: readonly ClauseSheetDefinition[],
  selectedSchemes: readonly IsoScheme[],
  evaluations: Readonly<Record<string, ClauseEvaluation>>,
): FindingRecord[] {
  const findings: FindingRecord[] = [];
  let findingNumber = 1;

  for (const sheet of sheets) {
    const visibleClauses = getVisibleClausesForSheet(sheet, selectedSchemes, evaluations);

    for (const clause of visibleClauses) {
      const evaluation = evaluations[clause.id];
      if (!evaluation || !isFindingStatus(evaluation.status)) {
        continue;
      }

      findings.push({
        findingNumber,
        sheetName: sheet.sheetName,
        clauseId: clause.id,
        clauseTitle: clause.title,
        findingType: evaluation.status,
        ncStatus: isNcStatus(evaluation.status) ? evaluation.ncStatus : '—',
        remarks: evaluation.remarks.trim(),
      });
      findingNumber += 1;
    }
  }

  return findings;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) {
    return '';
  }
  const parts = isoDate.split('-');
  if (parts.length !== 3) {
    return isoDate;
  }
  const [year, month, day] = parts;
  if (!year || !month || !day) {
    return isoDate;
  }
  return `${day}/${month}/${year}`;
}

export function validateAuditReportForExport(
  report: AuditReport,
  sheets: readonly ClauseSheetDefinition[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!report.details.auditType) {
    issues.push({ stepId: 'audit-details', message: 'Audit Type is not selected.' });
  }
  if (!report.details.companyName.trim()) {
    issues.push({ stepId: 'audit-details', message: 'Company Name is empty.' });
  }
  if (report.details.schemes.length === 0) {
    issues.push({
      stepId: 'audit-details',
      message: 'At least one ISO Scheme (9001, 14001, or 45001) must be selected.',
    });
  }
  if (!report.details.cuProjectNumber.trim()) {
    issues.push({ stepId: 'audit-details', message: 'CU Project Number is empty.' });
  }
  if (!report.details.teamLeader.trim()) {
    issues.push({ stepId: 'audit-details', message: 'Team Leader is empty.' });
  }

  if (!report.introduction.scopeOfCertification.trim()) {
    issues.push({
      stepId: 'audit-introduction',
      message: 'Scope of Certification is empty.',
    });
  }
  if (!report.introduction.accreditedLegalEntity) {
    issues.push({
      stepId: 'audit-introduction',
      message: 'Accreditation Body is not selected.',
    });
  }

  for (const sheet of sheets) {
    const visibleClauses = getVisibleClausesForSheet(
      sheet,
      report.details.schemes,
      report.evaluations,
    );
    const unevaluatedCount = visibleClauses.filter(
      (clause) => getClauseEvaluation(report.evaluations, clause.id).status === null,
    ).length;

    if (unevaluatedCount > 0) {
      issues.push({
        stepId: sheet.id,
        message: `${sheet.sheetName}: ${unevaluatedCount} of ${visibleClauses.length} applicable clause(s) not yet evaluated.`,
      });
    }
  }

  if (
    report.conclusion.selectedConclusions.includes('corrective_actions_due') &&
    !report.conclusion.correctiveActionDueDate
  ) {
    issues.push({
      stepId: 'findings-conclusion',
      message: 'Corrective actions due date is checked in Audit Conclusion but no date is entered.',
    });
  }
  if (!report.conclusion.certificationRecommendation) {
    issues.push({
      stepId: 'findings-conclusion',
      message: 'Certification Recommendation is not selected.',
    });
  }
  if (!report.conclusion.auditorDeclarationAccepted) {
    issues.push({
      stepId: 'findings-conclusion',
      message: 'Auditor Declaration checkbox is not checked.',
    });
  }
  if (!report.conclusion.followUpRequired) {
    issues.push({
      stepId: 'findings-conclusion',
      message: 'Follow-up Requirements (Yes / No) is not selected.',
    });
  }
  if (
    report.conclusion.followUpRequired === 'Yes' &&
    !report.conclusion.followUpComment.trim()
  ) {
    issues.push({
      stepId: 'findings-conclusion',
      message: 'Follow-up audit is marked Yes, but no follow-up comment is provided.',
    });
  }

  return issues;
}
