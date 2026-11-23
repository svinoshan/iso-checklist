import { Download, FileSpreadsheet, FolderOpen, Plus } from 'lucide-react';
import type { FindingsSummary } from '../types/audit';

interface HeaderBarProps {
  version: string;
  companyName: string;
  summary: FindingsSummary;
  isExporting: boolean;
  lastSavedAt: string | null;
  onOpenDrafts: () => void;
  onNewAudit: () => void;
  onExportExcel: () => void;
}

export function HeaderBar({
  version,
  companyName,
  summary,
  isExporting,
  lastSavedAt,
  onOpenDrafts,
  onNewAudit,
  onExportExcel,
}: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-5">
        {/* Left: Brand & Active Audit */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E3A5F] text-white shadow-xs">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900 sm:text-base">
                ISO Audit Report Workbook
              </h1>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-medium text-slate-600">
                {version}
              </span>
            </div>
            <p className="text-[0.6875rem] text-slate-500">
              {companyName.trim() ? companyName : 'Control Union'}
              {lastSavedAt ? ` · Saved ${lastSavedAt}` : ''}
            </p>
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
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#162d4a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isExporting ? 'Generating...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
