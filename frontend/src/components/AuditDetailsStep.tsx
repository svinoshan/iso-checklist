import type { AuditConfig, AuditDetails, AuditType, IsoScheme } from '../types/audit';

interface AuditDetailsStepProps {
  details: AuditDetails;
  config: AuditConfig;
  activeClauseCount: number;
  onChange: (updated: AuditDetails) => void;
}

export function AuditDetailsStep({
  details,
  config,
  activeClauseCount,
  onChange,
}: AuditDetailsStepProps) {
  const toggleScheme = (scheme: IsoScheme) => {
    const exists = details.schemes.includes(scheme);
    const nextSchemes = exists
      ? details.schemes.filter((s) => s !== scheme)
      : [...details.schemes, scheme];
    onChange({ ...details, schemes: nextSchemes });
  };

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Audit Details</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter general audit information and select the applicable ISO scheme(s).
          Applicable clauses across all checklist sheets update automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="audit-type"
            className="block text-sm font-medium text-slate-700"
          >
            Type of Audit <span className="text-red-500">*</span>
          </label>
          <select
            id="audit-type"
            value={details.auditType}
            onChange={(e) =>
              onChange({ ...details, auditType: e.target.value as AuditType | '' })
            }
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          >
            <option value="">Select audit type...</option>
            {config.auditTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="cu-project-number"
            className="block text-sm font-medium text-slate-700"
          >
            CU Project Number <span className="text-red-500">*</span>
          </label>
          <input
            id="cu-project-number"
            type="text"
            value={details.cuProjectNumber}
            onChange={(e) =>
              onChange({ ...details, cuProjectNumber: e.target.value })
            }
            placeholder="e.g., CU-PRJ-2026-001"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="company-name"
            className="block text-sm font-medium text-slate-700"
          >
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            id="company-name"
            type="text"
            value={details.companyName}
            onChange={(e) => onChange({ ...details, companyName: e.target.value })}
            placeholder="Enter audited organization name"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="block text-sm font-medium text-slate-700">
              Scheme/s (Select one or multiple) <span className="text-red-500">*</span>
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {activeClauseCount} active clause{activeClauseCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {config.schemes.map((scheme) => {
              const checked = details.schemes.includes(scheme.code);
              return (
                <label
                  key={scheme.code}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                    checked
                      ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 ring-1 ring-[#1E3A5F]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleScheme(scheme.code)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {scheme.standardCode} ({scheme.shortLabel})
                    </div>
                    <div className="text-xs text-slate-500">{scheme.fullName}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="audit-start-date"
            className="block text-sm font-medium text-slate-700"
          >
            Audit Start Date
          </label>
          <input
            id="audit-start-date"
            type="date"
            value={details.auditStartDate}
            onChange={(e) =>
              onChange({ ...details, auditStartDate: e.target.value })
            }
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="audit-end-date"
            className="block text-sm font-medium text-slate-700"
          >
            Audit End Date
          </label>
          <input
            id="audit-end-date"
            type="date"
            value={details.auditEndDate}
            min={details.auditStartDate || undefined}
            onChange={(e) => onChange({ ...details, auditEndDate: e.target.value })}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="team-leader"
            className="block text-sm font-medium text-slate-700"
          >
            Team Leader <span className="text-red-500">*</span>
          </label>
          <input
            id="team-leader"
            type="text"
            value={details.teamLeader}
            onChange={(e) => onChange({ ...details, teamLeader: e.target.value })}
            placeholder="Lead auditor name"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="report-completed-date"
            className="block text-sm font-medium text-slate-700"
          >
            Report Completed Date
          </label>
          <input
            id="report-completed-date"
            type="date"
            value={details.reportCompletedDate}
            onChange={(e) =>
              onChange({ ...details, reportCompletedDate: e.target.value })
            }
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="team-members"
            className="block text-sm font-medium text-slate-700"
          >
            Team Members
          </label>
          <input
            id="team-members"
            type="text"
            value={details.teamMembers}
            onChange={(e) => onChange({ ...details, teamMembers: e.target.value })}
            placeholder="Co-auditors, technical experts, observers (comma-separated)"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>
      </div>
    </section>
  );
}
