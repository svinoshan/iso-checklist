import { Download, FileSpreadsheet, FolderOpen, Plus } from 'lucide-react';
import type { FindingsSummary } from '../types/audit';

interface HeaderBarProps {
  companyName: string;
  summary: FindingsSummary;
  isExporting: boolean;
  lastSavedAt: string | null;
  onOpenDrafts: () => void;
  onNewAudit: () => void;
  onExportExcel: () => void;
}

export function HeaderBar({
  companyName,
  summary,
  isExporting,
  lastSavedAt,
  onOpenDrafts,
  onNewAudit,
  onExportExcel,
}: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1E3A5F] text-white shadow-sm">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
              ISO Audit Report Generator
            </h1>
            <p className="text-xs text-slate-500">
              {companyName.trim() ? companyName : 'Control Union — CU SLAB Rev 01'}
              {lastSavedAt ? ` · Saved ${lastSavedAt}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium lg:flex">
            <span className="text-slate-600">
              Clauses: <strong className="text-slate-900">{summary.evaluatedCount}/{summary.visibleCount}</strong>
            </span>
            <span className="mx-1 text-slate-300">|</span>
            <span className="text-red-700">
              Major: <strong>{summary.majorNcs}</strong>
            </span>
            <span className="mx-1 text-slate-300">|</span>
            <span className="text-amber-700">
              Minor: <strong>{summary.minorNcs}</strong>
            </span>
            <span className="mx-1 text-slate-300">|</span>
            <span className="text-blue-700">
              Obs: <strong>{summary.observations}</strong>
            </span>
            <span className="mx-1 text-slate-300">|</span>
            <span className="text-slate-700">
              Open NC: <strong>{summary.openNcs}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenDrafts}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:text-sm"
          >
            <FolderOpen className="h-4 w-4 text-slate-500" />
            <span>Drafts</span>
          </button>

          <button
            type="button"
            onClick={onNewAudit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:text-sm"
          >
            <Plus className="h-4 w-4 text-slate-500" />
            <span>New Audit</span>
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A5F] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#162d4a] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Generating...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
