import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
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

const SHORT_STATUS_LABELS: Record<ClauseStatus, string> = {
  Comply: 'Comply',
  Observation: 'Obs',
  'Minor NC': 'Minor NC',
  'Major NC': 'Major NC',
  'N/A': 'N/A',
};

const SCHEME_BADGE_STYLES: Record<IsoScheme, string> = {
  '9001': 'bg-sky-50 text-sky-700 border-sky-200',
  '14001': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '45001': 'bg-amber-50 text-amber-800 border-amber-200',
};

function getStatusButtonClass(status: ClauseStatus, active: boolean): string {
  if (!active) {
    return 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50';
  }
  switch (status) {
    case 'Comply':
      return 'border-emerald-600 bg-emerald-600 text-white';
    case 'Observation':
      return 'border-blue-600 bg-blue-600 text-white';
    case 'Minor NC':
      return 'border-amber-500 bg-amber-500 text-white';
    case 'Major NC':
      return 'border-red-600 bg-red-600 text-white';
    case 'N/A':
      return 'border-slate-600 bg-slate-600 text-white';
  }
}

function getOutcomeAccentClass(status: ClauseStatus | null): string {
  switch (status) {
    case 'Comply':
      return 'border-l-emerald-500 bg-emerald-50/30';
    case 'Observation':
      return 'border-l-blue-500 bg-blue-50/30';
    case 'Minor NC':
      return 'border-l-amber-500 bg-amber-50/40';
    case 'Major NC':
      return 'border-l-red-500 bg-red-50/40';
    case 'N/A':
      return 'border-l-slate-400 bg-slate-50';
    default:
      return 'border-l-slate-200 bg-slate-50/40';
  }
}

export function ClauseChecklistStep({
  sheet,
  selectedSchemes,
  evaluations,
  onUpdateEvaluation,
  onGoToDetails,
}: ClauseChecklistStepProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const visibleClauses = getVisibleClausesForSheet(
    sheet,
    selectedSchemes,
    evaluations,
  );

  const evaluatedCount = visibleClauses.filter(
    (clause) => getClauseEvaluation(evaluations, clause.id).status !== null,
  ).length;

  const hiddenCount = sheet.clauses.length - visibleClauses.length;

  const toggleRowExpand = (clauseId: string) => {
    setExpandedRows((prev) => ({ ...prev, [clauseId]: !prev[clauseId] }));
  };

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
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-sm font-semibold text-amber-900">
              No ISO Scheme Selected
            </h2>
            <p className="mt-1 text-xs text-amber-800">
              Select one or more schemes (ISO 9001, ISO 14001, ISO 45001) in Audit
              Details to load the applicable clauses for {sheet.sheetName}.
            </p>
            <button
              type="button"
              onClick={onGoToDetails}
              className="mt-3 rounded-md bg-[#1E3A5F] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#162d4a]"
            >
              Go to Audit Details
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* Compact Sheet Subheader Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {sheet.sheetName}
          </h2>
          <span className="text-xs text-slate-500">
            {visibleClauses.length} applicable clause
            {visibleClauses.length === 1 ? '' : 's'}
            {hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span>Evaluated:</span>
          <span className="rounded-full bg-[#1E3A5F]/10 px-2.5 py-0.5 font-semibold text-[#1E3A5F]">
            {evaluatedCount} / {visibleClauses.length}
          </span>
        </div>
      </div>

      {/* Desktop Workbook Grid (Excel-style Frozen Header + Compact Rows) */}
      <div className="hidden max-h-[calc(100vh-205px)] overflow-y-auto lg:block">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#1E3A5F] text-xs font-semibold text-white shadow-xs">
            <tr className="divide-x divide-white/15">
              <th className="w-[26%] px-3 py-2">Clause &amp; Description</th>
              <th className="w-[18%] px-3 py-2">Status</th>
              <th className="w-[32%] px-3 py-2">Audit Outcome (Auto)</th>
              <th className="w-[24%] px-3 py-2">Auditor Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {visibleClauses.map((clause, index) => {
              const evaluation = getClauseEvaluation(evaluations, clause.id);
              const outcomeText = resolveOutcomeText(clause, evaluation.status);
              const statuses: readonly ClauseStatus[] = clause.supportsNotApplicable
                ? [...STANDARD_STATUSES, 'N/A']
                : STANDARD_STATUSES;
              const isSchemeSpecific = clause.applicableSchemes.length < 3;
              const showNcToggle = isNcStatus(evaluation.status);
              const isExpanded = Boolean(expandedRows[clause.id]);

              return (
                <tr
                  key={clause.id}
                  className={`divide-x divide-slate-200 align-top transition-colors hover:bg-sky-50/35 ${
                    index % 2 === 1 ? 'bg-slate-50/45' : 'bg-white'
                  }`}
                >
                  {/* Column 1: Clause Title, Scheme Pill & Expandable Description */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-1">
                      <span className="font-semibold text-slate-900">
                        {clause.title}
                      </span>
                      {isSchemeSpecific && (
                        <div className="flex flex-wrap gap-1">
                          {clause.applicableSchemes.map((scheme) => (
                            <span
                              key={scheme}
                              className={`rounded border px-1.5 py-0.5 text-[0.625rem] font-medium ${SCHEME_BADGE_STYLES[scheme]}`}
                            >
                              {scheme}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p
                      className={`mt-1 leading-snug text-slate-600 ${
                        isExpanded ? '' : 'line-clamp-2'
                      }`}
                    >
                      {clause.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleRowExpand(clause.id)}
                      className="mt-1 inline-flex items-center gap-0.5 text-[0.6875rem] font-medium text-[#1E3A5F] hover:underline"
                    >
                      {isExpanded ? (
                        <>
                          <span>Less</span>
                          <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          <span>Details</span>
                          <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  </td>

                  {/* Column 2: Compact Status Controls + Conditional NC Open/Closed */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {statuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          title={status}
                          onClick={() => handleStatusChange(clause, status)}
                          className={`rounded border px-2 py-1 text-[0.6875rem] font-semibold transition ${getStatusButtonClass(
                            status,
                            evaluation.status === status,
                          )}`}
                        >
                          {SHORT_STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>

                    {showNcToggle && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[0.625rem] font-semibold tracking-wide text-slate-500 uppercase">
                          NC:
                        </span>
                        <div className="inline-flex rounded border border-slate-200 bg-white p-0.5">
                          {(['Open', 'Closed'] as const).map((ncOption) => {
                            const active = evaluation.ncStatus === ncOption;
                            return (
                              <button
                                key={ncOption}
                                type="button"
                                onClick={() =>
                                  handleNcStatusChange(clause.id, ncOption)
                                }
                                className={`rounded px-2 py-0.5 text-[0.625rem] font-semibold transition ${
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

                    {clause.id === '8.3' && evaluation.status === 'N/A' && (
                      <div className="mt-1.5 flex items-center gap-1 text-[0.6875rem] text-slate-600">
                        <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>8.3.1–8.3.6 hidden</span>
                      </div>
                    )}
                  </td>

                  {/* Column 3: Auto-Selected Audit Outcome */}
                  <td className="px-3 py-2.5">
                    <div
                      className={`rounded border border-slate-200/80 border-l-3 px-2.5 py-1.5 ${getOutcomeAccentClass(
                        evaluation.status,
                      )}`}
                    >
                      {outcomeText ? (
                        <p
                          className={`leading-relaxed text-slate-700 ${
                            isExpanded ? '' : 'line-clamp-3'
                          }`}
                        >
                          {outcomeText}
                        </p>
                      ) : (
                        <p className="italic text-slate-400">
                          Select a status to populate the audit outcome.
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Column 4: Dedicated Auditor Remarks */}
                  <td className="px-2.5 py-2">
                    <textarea
                      id={`remarks-grid-${clause.id}`}
                      aria-label={`Auditor remarks for ${clause.title}`}
                      rows={isExpanded ? 4 : 3}
                      value={evaluation.remarks}
                      onChange={(e) =>
                        handleRemarksChange(clause.id, e.target.value)
                      }
                      placeholder="Objective evidence, records, or finding details..."
                      className="block w-full resize-y rounded border border-slate-200 bg-white px-2 py-1.5 text-xs leading-snug text-slate-900 focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] focus:outline-none"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Responsive Compact Cards for Mobile / Small Tablets (< lg) */}
      <div className="divide-y divide-slate-200 lg:hidden">
        {visibleClauses.map((clause) => {
          const evaluation = getClauseEvaluation(evaluations, clause.id);
          const outcomeText = resolveOutcomeText(clause, evaluation.status);
          const statuses: readonly ClauseStatus[] = clause.supportsNotApplicable
            ? [...STANDARD_STATUSES, 'N/A']
            : STANDARD_STATUSES;
          const isSchemeSpecific = clause.applicableSchemes.length < 3;
          const showNcToggle = isNcStatus(evaluation.status);

          return (
            <article key={clause.id} className="space-y-2.5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {clause.title}
                </h3>
                {isSchemeSpecific && (
                  <div className="flex flex-wrap gap-1">
                    {clause.applicableSchemes.map((scheme) => (
                      <span
                        key={scheme}
                        className={`rounded border px-1.5 py-0.5 text-[0.625rem] font-medium ${SCHEME_BADGE_STYLES[scheme]}`}
                      >
                        ISO {scheme}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs leading-relaxed text-slate-600">
                {clause.description}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(clause, status)}
                      className={`rounded border px-2.5 py-1 text-xs font-semibold transition ${getStatusButtonClass(
                        status,
                        evaluation.status === status,
                      )}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {showNcToggle && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-600">NC:</span>
                    <div className="inline-flex rounded border border-slate-200 bg-white p-0.5">
                      {(['Open', 'Closed'] as const).map((ncOption) => {
                        const active = evaluation.ncStatus === ncOption;
                        return (
                          <button
                            key={ncOption}
                            type="button"
                            onClick={() =>
                              handleNcStatusChange(clause.id, ncOption)
                            }
                            className={`rounded px-2 py-0.5 text-xs font-semibold transition ${
                              active
                                ? ncOption === 'Open'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                : 'text-slate-600'
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
                <div className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                  <Info className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span>Sub-clauses 8.3.1 – 8.3.6 are hidden while 8.3 is N/A.</span>
                </div>
              )}

              <div
                className={`rounded border border-slate-200 border-l-3 px-3 py-2 text-xs ${getOutcomeAccentClass(
                  evaluation.status,
                )}`}
              >
                {outcomeText ? (
                  <p className="leading-relaxed text-slate-700">{outcomeText}</p>
                ) : (
                  <p className="italic text-slate-400">
                    Select a status above to populate the audit outcome.
                  </p>
                )}
              </div>

              <textarea
                id={`remarks-mobile-${clause.id}`}
                aria-label={`Auditor remarks for ${clause.title}`}
                rows={2}
                value={evaluation.remarks}
                onChange={(e) => handleRemarksChange(clause.id, e.target.value)}
                placeholder="Auditor remarks / objective evidence..."
                className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] focus:outline-none"
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
