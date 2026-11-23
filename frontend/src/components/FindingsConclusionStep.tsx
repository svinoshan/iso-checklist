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
    <div className="space-y-6">
      {/* Auto-calculated Findings Summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Audit Findings Summary
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Automatically calculated from your clause evaluations and exported with
            live Excel formulas.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-xs font-medium text-slate-500">Number of NCs</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {summary.totalNcs}
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
            <div className="text-xs font-medium text-amber-800">Minor NC</div>
            <div className="mt-1 text-2xl font-bold text-amber-900">
              {summary.minorNcs}
            </div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5">
            <div className="text-xs font-medium text-red-800">Major NC</div>
            <div className="mt-1 text-2xl font-bold text-red-900">
              {summary.majorNcs}
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
            <div className="text-xs font-medium text-blue-800">Observations</div>
            <div className="mt-1 text-2xl font-bold text-blue-900">
              {summary.observations}
            </div>
          </div>
          <div className="rounded-xl border border-slate-300 bg-slate-100 p-3.5">
            <div className="text-xs font-medium text-slate-700">Open NC</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {summary.openNcs}
            </div>
          </div>
        </div>

        {/* List of Findings Preview */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-800">
            List of Findings Preview ({findings.length})
          </h3>
          {findings.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No nonconformities or observations recorded across applicable clauses.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-3.5 py-2.5">#</th>
                    <th className="px-3.5 py-2.5">Clause</th>
                    <th className="px-3.5 py-2.5">Type</th>
                    <th className="px-3.5 py-2.5">NC Status</th>
                    <th className="px-3.5 py-2.5">Auditor Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {findings.map((finding) => (
                    <tr key={`${finding.clauseId}-${finding.findingNumber}`}>
                      <td className="px-3.5 py-2.5 font-medium text-slate-500">
                        {finding.findingNumber}
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-900">
                        {finding.clauseTitle}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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
                      <td className="px-3.5 py-2.5">
                        {finding.ncStatus === '—' ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              finding.ncStatus === 'Open'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {finding.ncStatus}
                          </span>
                        )}
                      </td>
                      <td className="max-w-md px-3.5 py-2.5 text-slate-600">
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

      {/* Audit Conclusion (Multi-select) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">Audit Conclusion</h2>
          <p className="mt-1 text-sm text-slate-500">
            {config.staticContent.auditConclusionLead}
          </p>
        </div>

        <div className="mt-4 space-y-2.5">
          {config.conclusionItems.map((item) => {
            const checked = conclusion.selectedConclusions.includes(item.id);
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3.5 transition ${
                  checked
                    ? 'border-[#1E3A5F]/40 bg-[#1E3A5F]/[0.03]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleConclusion(item.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                  />
                  <span className="text-sm text-slate-800">{item.text}</span>
                </label>

                {item.requiresDate && checked && (
                  <div className="mt-2.5 pl-7">
                    <label
                      htmlFor="corrective-action-due-date"
                      className="block text-xs font-medium text-slate-600"
                    >
                      Corrective Action Due Date
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
                      className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Certification Recommendation (Single-select) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Certification Recommendation <span className="text-red-500">*</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select one certification recommendation.
          </p>
        </div>

        <div className="mt-4 space-y-2.5">
          {config.recommendations.map((option) => {
            const selected = conclusion.certificationRecommendation === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${
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
                  className="h-4 w-4 border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                />
                <span className="text-sm font-medium text-slate-800">
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Auditor Declaration, Follow-up & Next Audit Date */}
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Auditor Declaration &amp; Follow-up Requirements
          </h2>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={conclusion.auditorDeclarationAccepted}
            onChange={(e) =>
              onChange({
                ...conclusion,
                auditorDeclarationAccepted: e.target.checked,
              })
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
          />
          <span className="text-sm leading-relaxed text-slate-800">
            {config.staticContent.auditorDeclarationText}
          </span>
        </label>

        <div>
          <span className="block text-sm font-medium text-slate-700">
            Follow-up / Verification Audit Required <span className="text-red-500">*</span>
          </span>
          <div className="mt-2 flex gap-3">
            {(['Yes', 'No'] as const).map((choice) => {
              const selected = conclusion.followUpRequired === choice;
              return (
                <label
                  key={choice}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
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

        {conclusion.followUpRequired === 'Yes' && (
          <div>
            <label
              htmlFor="follow-up-comment"
              className="block text-sm font-medium text-slate-700"
            >
              Follow-up Audit Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              id="follow-up-comment"
              rows={3}
              value={conclusion.followUpComment}
              onChange={(e) =>
                onChange({ ...conclusion, followUpComment: e.target.value })
              }
              placeholder="Specify required follow-up verification scope, timeline, or conditions..."
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
            />
          </div>
        )}

        <div className="max-w-xs">
          <label
            htmlFor="next-audit-date"
            className="block text-sm font-medium text-slate-700"
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
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>
      </section>

      {/* Export Readiness & Download */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        {validationIssues.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>
              All required audit details, applicable clauses, and conclusion fields
              are completed. Your Excel report is ready to generate.
            </span>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>
                {validationIssues.length} item
                {validationIssues.length === 1 ? '' : 's'} incomplete (you can
                still export as a draft)
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-amber-800">
              {validationIssues.map((issue, idx) => (
                <li key={`${issue.stepId}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => onNavigateStep(issue.stepId)}
                    className="underline decoration-amber-400 underline-offset-2 hover:text-amber-950"
                  >
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A5F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#162d4a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            <span>
              {isExporting
                ? 'Generating Excel Report...'
                : 'Generate Completed Excel Report (.xlsx)'}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
