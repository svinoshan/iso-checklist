import { AlertCircle, Info } from 'lucide-react';
import {
  getClauseEvaluation,
  getVisibleClausesForSheet,
  isNcStatus,
  resolveOutcomeText,
} from '../domain/auditRules';
import type {
  ClauseDefinition,
  ClauseEvaluation,
  ClauseSheetDefinition,
  ClauseStatus,
  IsoScheme,
  NcResolutionStatus,
} from '../types/audit';

interface ClauseChecklistStepProps {
  sheet: ClauseSheetDefinition;
  selectedSchemes: readonly IsoScheme[];
  evaluations: Readonly<Record<string, ClauseEvaluation>>;
  onUpdateEvaluation: (clauseId: string, updated: ClauseEvaluation) => void;
  onGoToDetails: () => void;
}

const STANDARD_STATUSES: readonly ClauseStatus[] = [
  'Comply',
  'Observation',
  'Minor NC',
  'Major NC',
];

const SCHEME_BADGE_STYLES: Record<IsoScheme, string> = {
  '9001': 'bg-sky-50 text-sky-700 border-sky-200',
  '14001': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '45001': 'bg-amber-50 text-amber-800 border-amber-200',
};

function getStatusButtonClass(status: ClauseStatus, active: boolean): string {
  if (!active) {
    return 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50';
  }
  switch (status) {
    case 'Comply':
      return 'border-emerald-600 bg-emerald-600 text-white shadow-xs';
    case 'Observation':
      return 'border-blue-600 bg-blue-600 text-white shadow-xs';
    case 'Minor NC':
      return 'border-amber-500 bg-amber-500 text-white shadow-xs';
    case 'Major NC':
      return 'border-red-600 bg-red-600 text-white shadow-xs';
    case 'N/A':
      return 'border-slate-600 bg-slate-600 text-white shadow-xs';
  }
}

export function ClauseChecklistStep({
  sheet,
  selectedSchemes,
  evaluations,
  onUpdateEvaluation,
  onGoToDetails,
}: ClauseChecklistStepProps) {
  const visibleClauses = getVisibleClausesForSheet(
    sheet,
    selectedSchemes,
    evaluations,
  );

  const evaluatedCount = visibleClauses.filter(
    (clause) => getClauseEvaluation(evaluations, clause.id).status !== null,
  ).length;

  const hiddenCount = sheet.clauses.length - visibleClauses.length;

  const handleStatusChange = (clause: ClauseDefinition, status: ClauseStatus) => {
    const current = getClauseEvaluation(evaluations, clause.id);
    const nextNcStatus: NcResolutionStatus = isNcStatus(status)
      ? current.ncStatus
      : 'Open';
    onUpdateEvaluation(clause.id, {
      ...current,
      status,
      ncStatus: nextNcStatus,
    });
  };

  const handleNcStatusChange = (
    clauseId: string,
    ncStatus: NcResolutionStatus,
  ) => {
    const current = getClauseEvaluation(evaluations, clauseId);
    onUpdateEvaluation(clauseId, { ...current, ncStatus });
  };

  const handleRemarksChange = (clauseId: string, remarks: string) => {
    const current = getClauseEvaluation(evaluations, clauseId);
    onUpdateEvaluation(clauseId, { ...current, remarks });
  };

  if (selectedSchemes.length === 0) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-base font-semibold text-amber-900">
              No ISO Scheme Selected
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Select one or more schemes (ISO 9001, ISO 14001, ISO 45001) in Audit
              Details to load the applicable clauses for {sheet.sheetName}.
            </p>
            <button
              type="button"
              onClick={onGoToDetails}
              className="mt-3 rounded-lg bg-[#1E3A5F] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#162d4a]"
            >
              Go to Audit Details
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {sheet.sheetName}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Showing {visibleClauses.length} applicable clause
              {visibleClauses.length === 1 ? '' : 's'}
              {hiddenCount > 0
                ? ` (${hiddenCount} non-applicable clause${hiddenCount === 1 ? '' : 's'} hidden)`
                : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <span>Progress:</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-[#1E3A5F]">
              {evaluatedCount} / {visibleClauses.length}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {visibleClauses.map((clause) => {
          const evaluation = getClauseEvaluation(evaluations, clause.id);
          const outcomeText = resolveOutcomeText(clause, evaluation.status);
          const statuses: readonly ClauseStatus[] = clause.supportsNotApplicable
            ? [...STANDARD_STATUSES, 'N/A']
            : STANDARD_STATUSES;
          const isSchemeSpecific = clause.applicableSchemes.length < 3;
          const showNcToggle = isNcStatus(evaluation.status);

          return (
            <article
              key={clause.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  {clause.title}
                </h3>
                {isSchemeSpecific && (
                  <div className="flex flex-wrap gap-1.5">
                    {clause.applicableSchemes.map((scheme) => (
                      <span
                        key={scheme}
                        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${SCHEME_BADGE_STYLES[scheme]}`}
                      >
                        ISO {scheme}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {clause.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Status:
                  </span>
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(clause, status)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${getStatusButtonClass(
                        status,
                        evaluation.status === status,
                      )}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {showNcToggle && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
                    <span className="text-xs font-semibold text-slate-600">
                      NC Status:
                    </span>
                    <div className="inline-flex rounded-md bg-white p-0.5 shadow-2xs ring-1 ring-slate-200">
                      {(['Open', 'Closed'] as const).map((ncOption) => {
                        const active = evaluation.ncStatus === ncOption;
                        return (
                          <button
                            key={ncOption}
                            type="button"
                            onClick={() =>
                              handleNcStatusChange(clause.id, ncOption)
                            }
                            className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                              active
                                ? ncOption === 'Open'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {ncOption}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {clause.id === '8.3' && evaluation.status === 'N/A' && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <Info className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>
                    Sub-clauses 8.3.1 – 8.3.6 are automatically hidden while
                    Clause 8.3 is marked N/A.
                  </span>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="text-xs font-semibold tracking-wide text-[#1E3A5F] uppercase">
                  Auto-Selected Audit Outcome
                </div>
                {outcomeText ? (
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {outcomeText}
                  </p>
                ) : (
                  <p className="mt-1 text-sm italic text-slate-400">
                    Select a status above to populate the standard audit outcome
                    statement.
                  </p>
                )}
              </div>

              <div className="mt-3">
                <label
                  htmlFor={`remarks-${clause.id}`}
                  className="block text-xs font-semibold tracking-wide text-slate-600 uppercase"
                >
                  Auditor Remarks
                </label>
                <textarea
                  id={`remarks-${clause.id}`}
                  rows={2}
                  value={evaluation.remarks}
                  onChange={(e) =>
                    handleRemarksChange(clause.id, e.target.value)
                  }
                  placeholder="Enter verified records, objective evidence, or finding details (exported to the Auditor Remarks column)..."
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
