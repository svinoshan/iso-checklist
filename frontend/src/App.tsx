import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AccessibilityWidget } from './components/AccessibilityWidget';
import { AuditDetailsStep } from './components/AuditDetailsStep';
import { AuditIntroductionStep } from './components/AuditIntroductionStep';
import { ClauseChecklistStep } from './components/ClauseChecklistStep';
import { DraftsModal } from './components/DraftsModal';
import { FindingsConclusionStep } from './components/FindingsConclusionStep';
import { HeaderBar } from './components/HeaderBar';
import { StepNavigation } from './components/StepNavigation';
import { AUDIT_CONFIG, CLAUSE_SHEETS } from './data/clauses';
import { useFontScale } from './hooks/useFontScale';
import {
  calculateFindingsSummary,
  createEmptyAuditReport,
  extractFindingsList,
  validateAuditReportForExport,
} from './domain/auditRules';
import {
  auditRepository,
  downloadDraftJsonFile,
  readDraftJsonFile,
} from './repositories/AuditRepository';
import { exportAuditReportToExcel } from './services/excelExportService';
import type {
  AuditDraftSummary,
  AuditReport,
  ClauseEvaluation,
  WizardStepId,
} from './types/audit';

const STEP_ORDER: readonly WizardStepId[] = [
  'audit-details',
  'audit-introduction',
  'clause-4-5',
  'clause-6-7',
  'clause-8',
  'clause-9-10',
  'findings-conclusion',
];

export default function App() {
  const [report, setReport] = useState<AuditReport>(() => createEmptyAuditReport());
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeStep, setActiveStep] = useState<WizardStepId>('audit-details');
  const [drafts, setDrafts] = useState<AuditDraftSummary[]>([]);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const fontScaleControls = useFontScale();

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      const [existing, list] = await Promise.all([
        auditRepository.getActiveDraft(),
        auditRepository.listDrafts(),
      ]);
      if (!active) {
        return;
      }
      if (existing) {
        setReport(existing);
      }
      setDrafts(list);
      setIsLoaded(true);
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    const timer = window.setTimeout(() => {
      void auditRepository.saveDraft(report).then(async () => {
        setLastSavedAt(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        );
        const list = await auditRepository.listDrafts();
        setDrafts(list);
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [report, isLoaded]);

  const summary = useMemo(
    () =>
      calculateFindingsSummary(
        CLAUSE_SHEETS,
        report.details.schemes,
        report.evaluations,
      ),
    [report.details.schemes, report.evaluations],
  );

  const findings = useMemo(
    () =>
      extractFindingsList(
        CLAUSE_SHEETS,
        report.details.schemes,
        report.evaluations,
      ),
    [report.details.schemes, report.evaluations],
  );

  const validationIssues = useMemo(
    () => validateAuditReportForExport(report, CLAUSE_SHEETS),
    [report],
  );

  const currentStepIndex = STEP_ORDER.indexOf(activeStep);
  const prevStep = currentStepIndex > 0 ? STEP_ORDER[currentStepIndex - 1] : null;
  const nextStep =
    currentStepIndex >= 0 && currentStepIndex < STEP_ORDER.length - 1
      ? STEP_ORDER[currentStepIndex + 1]
      : null;

  const activeClauseSheet = useMemo(
    () => CLAUSE_SHEETS.find((sheet) => sheet.id === activeStep) ?? null,
    [activeStep],
  );

  const handleUpdateEvaluation = (
    clauseId: string,
    updated: ClauseEvaluation,
  ) => {
    setReport((prev) => ({
      ...prev,
      evaluations: {
        ...prev.evaluations,
        [clauseId]: updated,
      },
    }));
  };

  const handleNewAudit = () => {
    const confirmed = window.confirm(
      'Start a new blank audit report? Your current report remains saved in Drafts.',
    );
    if (!confirmed) {
      return;
    }
    setReport(createEmptyAuditReport());
    setActiveStep('audit-details');
    setExportError(null);
  };

  const handleSelectDraft = async (id: string) => {
    const loaded = await auditRepository.getDraftById(id);
    if (loaded) {
      setReport(loaded);
      setActiveStep('audit-details');
      setExportError(null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    await auditRepository.deleteDraft(id);
    const updatedList = await auditRepository.listDrafts();
    setDrafts(updatedList);
    if (id === report.id) {
      const nextDraft = await auditRepository.getActiveDraft();
      setReport(nextDraft ?? createEmptyAuditReport());
    }
  };

  const handleImportDraftJson = async (file: File) => {
    const imported = await readDraftJsonFile(file);
    const saved = await auditRepository.saveDraft(imported);
    const updatedList = await auditRepository.listDrafts();
    setReport(saved);
    setDrafts(updatedList);
    setActiveStep('audit-details');
    setExportError(null);
  };

  const handleExportExcel = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      await exportAuditReportToExcel(report, AUDIT_CONFIG, CLAUSE_SHEETS);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : 'Failed to generate Excel workbook.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectStep = (stepId: WizardStepId) => {
    setActiveStep(stepId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <HeaderBar
        version={AUDIT_CONFIG.appVersion}
        companyName={report.details.companyName}
        summary={summary}
        isExporting={isExporting}
        lastSavedAt={lastSavedAt}
        onOpenDrafts={() => setIsDraftsOpen(true)}
        onNewAudit={handleNewAudit}
        onExportExcel={() => void handleExportExcel()}
      />

      <StepNavigation
        activeStep={activeStep}
        onSelectStep={handleSelectStep}
        report={report}
        sheets={CLAUSE_SHEETS}
      />

      <main className="mx-auto max-w-[1600px] px-4 pt-4 pb-16 sm:px-5">
        {exportError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {exportError}
          </div>
        )}

        <div className="space-y-4">
          {activeStep === 'audit-details' && (
            <AuditDetailsStep
              details={report.details}
              config={AUDIT_CONFIG}
              activeClauseCount={summary.visibleCount}
              onChange={(details) => setReport((prev) => ({ ...prev, details }))}
            />
          )}

          {activeStep === 'audit-introduction' && (
            <AuditIntroductionStep
              introduction={report.introduction}
              config={AUDIT_CONFIG}
              onChange={(introduction) =>
                setReport((prev) => ({ ...prev, introduction }))
              }
            />
          )}

          {activeClauseSheet && (
            <ClauseChecklistStep
              sheet={activeClauseSheet}
              selectedSchemes={report.details.schemes}
              evaluations={report.evaluations}
              onUpdateEvaluation={handleUpdateEvaluation}
              onGoToDetails={() => handleSelectStep('audit-details')}
            />
          )}

          {activeStep === 'findings-conclusion' && (
            <FindingsConclusionStep
              config={AUDIT_CONFIG}
              conclusion={report.conclusion}
              summary={summary}
              findings={findings}
              validationIssues={validationIssues}
              isExporting={isExporting}
              onChange={(conclusion) =>
                setReport((prev) => ({ ...prev, conclusion }))
              }
              onNavigateStep={handleSelectStep}
              onExportExcel={() => void handleExportExcel()}
            />
          )}

          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            {prevStep ? (
              <button
                type="button"
                onClick={() => handleSelectStep(prevStep)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Sheet</span>
              </button>
            ) : (
              <div />
            )}

            {nextStep && (
              <button
                type="button"
                onClick={() => handleSelectStep(nextStep)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#1E3A5F] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#162d4a]"
              >
                <span>Next Sheet</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      <DraftsModal
        isOpen={isDraftsOpen}
        activeDraftId={report.id}
        drafts={drafts}
        onClose={() => setIsDraftsOpen(false)}
        onSelectDraft={(id) => void handleSelectDraft(id)}
        onDeleteDraft={(id) => void handleDeleteDraft(id)}
        onExportJson={() => downloadDraftJsonFile(report)}
        onImportJson={handleImportDraftJson}
      />

      <AccessibilityWidget fontScaleControls={fontScaleControls} />
    </div>
  );
}
