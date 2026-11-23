import {
  Download,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  Plus,
} from 'lucide-react';
import type { FindingsSummary, IsoScheme } from '../types/audit';

interface HeaderBarProps {
  version: string;
  companyName: string;
  schemes: readonly IsoScheme[];
  summary: FindingsSummary;
  isExporting: boolean;
  lastSavedAt: string | null;
  onOpenDrafts: () => void;
  onNewAudit: () => void;
  onExportExcel: () => void;
}

const SCHEME_ORDER: readonly IsoScheme[] = ['9001', '14001', '45001'];

const SCHEME_CHIP_STYLES: Record<IsoScheme, string> = {
  '9001': 'border-sky-200 bg-sky-50 text-sky-700',
  '14001': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  '45001': 'border-amber-200 bg-amber-50 text-amber-800',
};

const SCHEME_LABELS: Record<IsoScheme, string> = {
  '9001': 'ISO 9001 (QMS)',
  '14001': 'ISO 14001 (EMS)',
  '45001': 'ISO 45001 (OHS)',
};

export function HeaderBar({
  version,
  companyName,
  schemes,
  summary,
  isExporting,
  lastSavedAt,
  onOpenDrafts,
  onNewAudit,
  onExportExcel,
}: HeaderBarProps) {
  const orderedSchemes = SCHEME_ORDER.filter((scheme) =>
    schemes.includes(scheme),
  );
  const displayCompany = companyName.trim() || 'Control Union';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-5">
        {/* Left: Brand & Active Audit */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1E3A5F] text-white shadow-xs">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900 sm:text-base">
                ISO Audit Report Workbook
              </h1>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-medium text-slate-600">
                {version}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-slate-500">
              <span
                title={displayCompany}
                className="max-w-[14rem] truncate font-medium text-slate-600"
              >
                {displayCompany}
              </span>

              {orderedSchemes.length > 0 && (
                <>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <div
                    className="inline-flex items-center gap-1"
                    aria-label="Selected ISO schemes"
                  >
                    {orderedSchemes.map((scheme) => (
                      <span
                        key={scheme}
                        title={SCHEME_LABELS[scheme]}
                        className={`rounded border px-1.5 py-0.5 text-[0.625rem] leading-none font-semibold ${SCHEME_CHIP_STYLES[scheme]}`}
                      >
                        {scheme}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {lastSavedAt && (
                <>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span>Saved {lastSavedAt}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Live Audit Summary */}
        <div className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium xl:flex">
          <span className="text-slate-600">
            Clauses:{' '}
            <strong className="text-slate-900">
              {summary.evaluatedCount}/{summary.visibleCount}
            </strong>
          </span>
          <span className="mx-0.5 text-slate-300">|</span>
          <span className="text-red-700">
            Major: <strong>{summary.majorNcs}</strong>
          </span>
          <span className="mx-0.5 text-slate-300">|</span>
          <span className="text-amber-700">
            Minor: <strong>{summary.minorNcs}</strong>
          </span>
          <span className="mx-0.5 text-slate-300">|</span>
          <span className="text-blue-700">
            Obs: <strong>{summary.observations}</strong>
          </span>
          <span className="mx-0.5 text-slate-300">|</span>
          <span className="text-slate-700">
            Open NC: <strong>{summary.openNcs}</strong>
          </span>
        </div>

        {/* Right: Primary Workbook Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenDrafts}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
            <span>Drafts</span>
          </button>

          <button
            type="button"
            onClick={onNewAudit}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>New Audit</span>
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting}
            aria-busy={isExporting}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#162d4a] disabled:opacity-60"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>{isExporting ? 'Generating...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
