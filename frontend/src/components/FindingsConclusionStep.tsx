import { AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import type {
  AuditConclusionState,
  AuditConfig,
  FindingRecord,
  FindingsSummary,
  ValidationIssue,
  WizardStepId,
} from '../types/audit';

interface FindingsConclusionStepProps {
  config: AuditConfig;
  conclusion: AuditConclusionState;
  summary: FindingsSummary;
  findings: readonly FindingRecord[];
  validationIssues: readonly ValidationIssue[];
  isExporting: boolean;
  onChange: (updated: AuditConclusionState) => void;
  onNavigateStep: (stepId: WizardStepId) => void;
  onExportExcel: () => void;
}

export function FindingsConclusionStep({
  config,
  conclusion,
  summary,
  findings,
  validationIssues,
  isExporting,
  onChange,
  onNavigateStep,
  onExportExcel,
}: FindingsConclusionStepProps) {
  const toggleConclusion = (id: string) => {
    const exists = conclusion.selectedConclusions.includes(id);
    const nextSelected = exists
      ? conclusion.selectedConclusions.filter((item) => item !== id)
      : [...conclusion.selectedConclusions, id];
    onChange({
      ...conclusion,
      selectedConclusions: nextSelected,
      correctiveActionDueDate:
        id === 'corrective_actions_due' && exists
          ? ''
          : conclusion.correctiveActionDueDate,
    });
  };

  return (
    <div className="space-y-4">
      {/* Compact Findings Summary Strip + List of Findings */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[0.6875rem] font-medium text-slate-500">Number of NCs</div>
            <div className="text-xl font-bold text-slate-900">{summary.totalNcs}</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
            <div className="text-[0.6875rem] font-medium text-amber-800">Minor NC</div>
            <div className="text-xl font-bold text-amber-900">{summary.minorNcs}</div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/70 px-3 py-2">
            <div className="text-[0.6875rem] font-medium text-red-800">Major NC</div>
            <div className="text-xl font-bold text-red-900">{summary.majorNcs}</div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2">
            <div className="text-[0.6875rem] font-medium text-blue-800">Observations</div>
            <div className="text-xl font-bold text-blue-900">{summary.observations}</div>
          </div>
          <div className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <div className="text-[0.6875rem] font-medium text-slate-700">Open NC</div>
            <div className="text-xl font-bold text-slate-900">{summary.openNcs}</div>
          </div>
        </div>

        <div className="mt-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
              List of Findings ({findings.length})
            </h3>
            <span className="text-[0.6875rem] text-slate-400">
              Auto-synced from clause sheets &amp; exported with live Excel formulas
            </span>
          </div>
          {findings.length === 0 ? (
            <p className="mt-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              No nonconformities or observations recorded across applicable clauses.
            </p>
          ) : (
            <div className="mt-1.5 max-h-44 overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="sticky top-0 bg-slate-100 text-left font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-3 py-1.5">#</th>
                    <th className="px-3 py-1.5">Clause</th>
                    <th className="px-3 py-1.5">Type</th>
                    <th className="px-3 py-1.5">NC Status</th>
                    <th className="px-3 py-1.5">Auditor Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {findings.map((finding) => (
                    <tr key={`${finding.clauseId}-${finding.findingNumber}`}>
                      <td className="px-3 py-1.5 font-medium text-slate-500">
                        {finding.findingNumber}
                      </td>
                      <td className="px-3 py-1.5 font-medium text-slate-900">
                        {finding.clauseTitle}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                            finding.findingType === 'Major NC'
                              ? 'bg-red-100 text-red-800'
                              : finding.findingType === 'Minor NC'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {finding.findingType}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        {finding.ncStatus === '—' ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                              finding.ncStatus === 'Open'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {finding.ncStatus}
                          </span>
                        )}
                      </td>
                      <td className="max-w-md px-3 py-1.5 text-slate-600">
                        {finding.remarks || (
                          <span className="italic text-slate-400">No remarks</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Two-Column Dashboard: Conclusions (Left) + Recommendation & Declaration (Right) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: Audit Conclusion Checklist */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-7">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-semibold text-slate-900">
              Audit Conclusion (Select all that apply)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {config.staticContent.auditConclusionLead}
            </p>
          </div>

          <div className="mt-3 space-y-1.5">
            {config.conclusionItems.map((item) => {
              const checked = conclusion.selectedConclusions.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border px-3 py-2 transition ${
                    checked
                      ? 'border-[#1E3A5F]/40 bg-[#1E3A5F]/[0.03]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleConclusion(item.id)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                    />
                    <span className="text-xs leading-snug text-slate-800">
                      {item.text}
                    </span>
                  </label>

                  {item.requiresDate && checked && (
                    <div className="mt-2 flex items-center gap-2 pl-6">
                      <label
                        htmlFor="corrective-action-due-date"
                        className="text-[0.6875rem] font-medium text-slate-600"
                      >
                        Due Date:
                      </label>
                      <input
                        id="corrective-action-due-date"
                        type="date"
                        value={conclusion.correctiveActionDueDate}
                        onChange={(e) =>
                          onChange({
                            ...conclusion,
                            correctiveActionDueDate: e.target.value,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Recommendation, Declaration, Follow-up, Next Date & Export */}
        <div className="space-y-4 lg:col-span-5">
          {/* Certification Recommendation */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">
              Certification Recommendation <span className="text-red-500">*</span>
            </h2>
            <div className="mt-2.5 space-y-1.5">
              {config.recommendations.map((option) => {
                const selected = conclusion.certificationRecommendation === option.id;
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition ${
                      selected
                        ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 ring-1 ring-[#1E3A5F]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="certification-recommendation"
                      value={option.id}
                      checked={selected}
                      onChange={() =>
                        onChange({
                          ...conclusion,
                          certificationRecommendation: option.id,
                        })
                      }
                      className="h-3.5 w-3.5 border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                    />
                    <span className="text-xs font-medium text-slate-800">
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Auditor Declaration, Follow-up & Next Audit Date */}
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">
              Auditor Declaration &amp; Follow-up
            </h2>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                type="checkbox"
                checked={conclusion.auditorDeclarationAccepted}
                onChange={(e) =>
                  onChange({
                    ...conclusion,
                    auditorDeclarationAccepted: e.target.checked,
                  })
                }
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
              />
              <span className="text-xs leading-relaxed text-slate-800">
                {config.staticContent.auditorDeclarationText}
              </span>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Follow-up Required <span className="text-red-500">*</span>
                </span>
                <div className="mt-1.5 flex gap-2">
                  {(['Yes', 'No'] as const).map((choice) => {
                    const selected = conclusion.followUpRequired === choice;
                    return (
                      <label
                        key={choice}
                        className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                          selected
                            ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="follow-up-required"
                          value={choice}
                          checked={selected}
                          onChange={() =>
                            onChange({
                              ...conclusion,
                              followUpRequired: choice,
                              followUpComment:
                                choice === 'No' ? '' : conclusion.followUpComment,
                            })
                          }
                          className="sr-only"
                        />
                        <span>{choice}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="next-audit-date"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Next Audit Date
                </label>
                <input
                  id="next-audit-date"
                  type="date"
                  value={conclusion.nextAuditDate}
                  onChange={(e) =>
                    onChange({ ...conclusion, nextAuditDate: e.target.value })
                  }
                  className="mt-1.5 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] focus:outline-none"
                />
              </div>
            </div>

            {conclusion.followUpRequired === 'Yes' && (
              <div>
                <label
                  htmlFor="follow-up-comment"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Follow-up Audit Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="follow-up-comment"
                  rows={2}
                  value={conclusion.followUpComment}
                  onChange={(e) =>
                    onChange({ ...conclusion, followUpComment: e.target.value })
                  }
                  placeholder="Specify required follow-up verification scope, timeline, or conditions..."
                  className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] focus:outline-none"
                />
              </div>
            )}
          </section>

          {/* Export Readiness & Action */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            {validationIssues.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  All required fields and applicable clauses are completed. Ready to export.
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>
                    {validationIssues.length} item
                    {validationIssues.length === 1 ? '' : 's'} incomplete (draft export still allowed)
                  </span>
                </div>
                <ul className="mt-1.5 max-h-28 space-y-0.5 overflow-y-auto text-[0.6875rem] text-amber-800">
                  {validationIssues.map((issue, idx) => (
                    <li key={`${issue.stepId}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => onNavigateStep(issue.stepId)}
                        className="text-left underline decoration-amber-400 underline-offset-2 hover:text-amber-950"
                      >
                        {issue.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={onExportExcel}
              disabled={isExporting}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#162d4a] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              <Download className="h-4 w-4" />
              <span>
                {isExporting
                  ? 'Generating Excel Report...'
                  : 'Generate Completed Excel Report (.xlsx)'}
              </span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
