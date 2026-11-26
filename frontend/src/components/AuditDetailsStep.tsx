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
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Audit Details</h2>
          <p className="text-xs text-slate-500">
            Select applicable ISO scheme(s) to automatically filter clauses across all checklist sheets.
          </p>
        </div>
        <span className="rounded-full bg-[#1E3A5F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1E3A5F]">
          {activeClauseCount} active clause{activeClauseCount === 1 ? '' : 's'}
        </span>
      </div>

      {/* Scheme Selector */}
      <div>
        <span className="block text-xs font-semibold tracking-wide text-slate-600 uppercase">
          Scheme/s (Select one or multiple) <span className="text-red-500">*</span>
        </span>
        <div className="mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {config.schemes.map((scheme) => {
            const checked = details.schemes.includes(scheme.code);
            return (
              <label
                key={scheme.code}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition ${
                  checked
                    ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 ring-1 ring-[#1E3A5F]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleScheme(scheme.code)}
                  className="h-4 w-4 rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {scheme.standardCode} ({scheme.shortLabel})
                  </div>
                  <div className="truncate text-xs text-slate-500">{scheme.fullName}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Compact 3-Column Workbook Form Grid */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label
            htmlFor="company-name"
            className="block text-xs font-semibold text-slate-700"
          >
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            id="company-name"
            type="text"
            value={details.companyName}
            onChange={(e) => onChange({ ...details, companyName: e.target.value })}
            placeholder="Enter audited organization name"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="audit-type"
            className="block text-xs font-semibold text-slate-700"
          >
            Type of Audit <span className="text-red-500">*</span>
          </label>
          <select
            id="audit-type"
            value={details.auditType}
            onChange={(e) =>
              onChange({ ...details, auditType: e.target.value as AuditType | '' })
            }
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
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
            className="block text-xs font-semibold text-slate-700"
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
            placeholder="e.g., PRJ 123456"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="audit-start-date"
            className="block text-xs font-semibold text-slate-700"
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
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="audit-end-date"
            className="block text-xs font-semibold text-slate-700"
          >
            Audit End Date
          </label>
          <input
            id="audit-end-date"
            type="date"
            value={details.auditEndDate}
            min={details.auditStartDate || undefined}
            onChange={(e) => onChange({ ...details, auditEndDate: e.target.value })}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="team-leader"
            className="block text-xs font-semibold text-slate-700"
          >
            Team Leader <span className="text-red-500">*</span>
          </label>
          <input
            id="team-leader"
            type="text"
            value={details.teamLeader}
            onChange={(e) => onChange({ ...details, teamLeader: e.target.value })}
            placeholder="Lead auditor name"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="team-members"
            className="block text-xs font-semibold text-slate-700"
          >
            Team Members
          </label>
          <input
            id="team-members"
            type="text"
            value={details.teamMembers}
            onChange={(e) => onChange({ ...details, teamMembers: e.target.value })}
            placeholder="Co-auditors, technical experts (comma-separated)"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="report-completed-date"
            className="block text-xs font-semibold text-slate-700"
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
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
          />
        </div>
      </div>
    </section>
  );
}
