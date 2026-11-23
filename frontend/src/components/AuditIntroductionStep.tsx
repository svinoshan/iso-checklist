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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-semibold text-slate-900">
          Audit Introduction &amp; Control Union
        </h2>
        <p className="text-xs text-slate-500">
          Fill the scope of certification and accredited legal entity. Standard Control Union statements are included automatically in the exported sheet.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Editable Auditor Inputs */}
        <div className="space-y-4 lg:col-span-7">
          <div>
            <label
              htmlFor="scope-of-certification"
              className="block text-xs font-semibold text-slate-700"
            >
              Scope of Certification <span className="text-red-500">*</span>
            </label>
            <textarea
              id="scope-of-certification"
              rows={5}
              value={introduction.scopeOfCertification}
              onChange={(e) =>
                onChange({ ...introduction, scopeOfCertification: e.target.value })
              }
              placeholder="Describe the audited sites, products, services, and activities covered under certification..."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700">
              Accredited Legal Entity <span className="text-red-500">*</span>
            </span>
            <div className="mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {config.accreditedEntities.map((entity) => {
                const selected = introduction.accreditedLegalEntity === entity.code;
                return (
                  <label
                    key={entity.code}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${
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
        </div>

        {/* Standard Control Union Reference Panel */}
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:col-span-5">
          <div>
            <h3 className="text-[0.6875rem] font-semibold tracking-wide text-[#1E3A5F] uppercase">
              {config.staticContent.organizationHeading} — Audit Introduction
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {config.staticContent.introductionText}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-2.5">
            <h3 className="text-[0.6875rem] font-semibold tracking-wide text-slate-700 uppercase">
              Confidentiality Statement
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {config.staticContent.confidentialityStatement}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-2.5">
            <h3 className="text-[0.6875rem] font-semibold tracking-wide text-slate-700 uppercase">
              Disclaimer
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {config.staticContent.disclaimerText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
