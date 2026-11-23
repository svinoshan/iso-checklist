import type {
  AccreditedEntityCode,
  AuditConfig,
  AuditIntroduction,
} from '../types/audit';

interface AuditIntroductionStepProps {
  introduction: AuditIntroduction;
  config: AuditConfig;
  onChange: (updated: AuditIntroduction) => void;
}

export function AuditIntroductionStep({
  introduction,
  config,
  onChange,
}: AuditIntroductionStepProps) {
  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Audit Introduction &amp; Control Union
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Define the scope of certification and select the accredited legal entity.
          Standard Control Union statements below are automatically included in the exported sheet.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-xs font-semibold tracking-wide text-[#1E3A5F] uppercase">
          {config.staticContent.organizationHeading} — Audit Introduction
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {config.staticContent.introductionText}
        </p>
      </div>

      <div>
        <label
          htmlFor="scope-of-certification"
          className="block text-sm font-medium text-slate-700"
        >
          Scope of Certification <span className="text-red-500">*</span>
        </label>
        <textarea
          id="scope-of-certification"
          rows={4}
          value={introduction.scopeOfCertification}
          onChange={(e) =>
            onChange({ ...introduction, scopeOfCertification: e.target.value })
          }
          placeholder="Describe the audited sites, products, services, and activities covered under certification..."
          className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">
          Accredited Legal Entity <span className="text-red-500">*</span>
        </span>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {config.accreditedEntities.map((entity) => {
            const selected = introduction.accreditedLegalEntity === entity.code;
            return (
              <label
                key={entity.code}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  selected
                    ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 ring-1 ring-[#1E3A5F]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="accredited-legal-entity"
                  value={entity.code}
                  checked={selected}
                  onChange={() =>
                    onChange({
                      ...introduction,
                      accreditedLegalEntity: entity.code as AccreditedEntityCode,
                    })
                  }
                  className="mt-0.5 h-4 w-4 border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {entity.label}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    {entity.fullName}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Confidentiality Statement
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            {config.staticContent.confidentialityStatement}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Disclaimer
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            {config.staticContent.disclaimerText}
          </p>
        </div>
      </div>
    </section>
  );
}
