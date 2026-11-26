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
  const selectedEntity = config.accreditedEntities.find(
    (entity) =>
      entity.code === introduction.accreditedLegalEntity && !entity.disabled,
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-semibold text-slate-900">
          Audit Introduction &amp; Control Union
        </h2>
        <p className="text-xs text-slate-500">
          Fill the scope of certification and select the accreditation body. Standard Control Union statements are included automatically in the exported sheet.
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
              Accreditation Body <span className="text-red-500">*</span>
            </span>
            <div className="mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {config.accreditedEntities.map((entity) => {
                const isDisabled = Boolean(entity.disabled);
                const selected =
                  !isDisabled && introduction.accreditedLegalEntity === entity.code;
                return (
                  <label
                    key={entity.code}
                    aria-disabled={isDisabled}
                    className={`flex items-start gap-2.5 rounded-lg border p-3 transition ${
                      isDisabled
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100/70 opacity-60'
                        : selected
                          ? 'cursor-pointer border-[#1E3A5F] bg-[#1E3A5F]/5 ring-1 ring-[#1E3A5F]'
                          : 'cursor-pointer border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accreditation-body"
                      value={entity.code}
                      checked={selected}
                      disabled={isDisabled}
                      onChange={() => {
                        if (isDisabled) {
                          return;
                        }
                        onChange({
                          ...introduction,
                          accreditedLegalEntity: entity.code as AccreditedEntityCode,
                        });
                      }}
                      className="mt-0.5 h-4 w-4 border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {entity.label}
                        </span>
                        {isDisabled && (
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[0.625rem] font-medium text-slate-600">
                            Unavailable
                          </span>
                        )}
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

          {selectedEntity && selectedEntity.legalEntityName && (
            <div>
              <span className="block text-xs font-semibold text-slate-700">
                Accredited Legal Entity
              </span>
              <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800">
                <div className="font-semibold text-slate-900">
                  {selectedEntity.legalEntityName}
                </div>
                {selectedEntity.legalEntityAddress && (
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {selectedEntity.legalEntityAddress}
                  </div>
                )}
              </div>
            </div>
          )}
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
