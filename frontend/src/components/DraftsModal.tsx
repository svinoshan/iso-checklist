import { type ChangeEvent, useRef, useState } from 'react';
import { Download, Trash2, Upload, X } from 'lucide-react';
import type { AuditDraftSummary } from '../types/audit';

interface DraftsModalProps {
  isOpen: boolean;
  activeDraftId: string;
  drafts: readonly AuditDraftSummary[];
  onClose: () => void;
  onSelectDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => Promise<void>;
}

export function DraftsModal({
  isOpen,
  activeDraftId,
  drafts,
  onClose,
  onSelectDraft,
  onDeleteDraft,
  onExportJson,
  onImportJson,
}: DraftsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    setImportError(null);
    try {
      await onImportJson(file);
      onClose();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Unable to import draft file.',
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drafts-modal-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="drafts-modal-title" className="text-base font-semibold text-slate-900">
              Saved Drafts &amp; File Backup
            </h2>
            <p className="text-xs text-slate-500">
              Drafts auto-save locally in your browser. Export as JSON to transfer
              or archive drafts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close drafts dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onExportJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Save Current Draft (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Upload className="h-4 w-4 text-slate-500" />
              <span>Load Draft from File (.json)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {importError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {importError}
            </div>
          )}

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {drafts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                No locally saved drafts yet.
              </p>
            ) : (
              drafts.map((draft) => {
                const isCurrent = draft.id === activeDraftId;
                return (
                  <div
                    key={draft.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 ${
                      isCurrent
                        ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {draft.companyName}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-[#1E3A5F] px-2 py-0.5 text-[10px] font-semibold text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {[
                          draft.cuProjectNumber || 'No Project #',
                          draft.auditType || 'Type not set',
                          draft.schemes.length > 0
                            ? draft.schemes.map((s) => `ISO ${s}`).join(', ')
                            : 'No scheme',
                        ].join(' · ')}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        Updated {new Date(draft.updatedAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectDraft(draft.id);
                            onClose();
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Open
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteDraft(draft.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete draft ${draft.companyName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
