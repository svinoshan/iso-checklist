import { CheckCircle2 } from 'lucide-react';
import { getClauseEvaluation, getVisibleClausesForSheet } from '../domain/auditRules';
import type {
  AuditReport,
  ClauseSheetDefinition,
  WizardStepId,
} from '../types/audit';

interface StepNavigationProps {
  activeStep: WizardStepId;
  onSelectStep: (stepId: WizardStepId) => void;
  report: AuditReport;
  sheets: readonly ClauseSheetDefinition[];
}

interface SheetTabItem {
  id: WizardStepId;
  label: string;
  badge?: string;
  complete: boolean;
}

export function StepNavigation({
  activeStep,
  onSelectStep,
  report,
  sheets,
}: StepNavigationProps) {
  const detailsComplete = Boolean(
    report.details.auditType &&
      report.details.companyName.trim() &&
      report.details.schemes.length > 0 &&
      report.details.cuProjectNumber.trim() &&
      report.details.teamLeader.trim(),
  );

  const introComplete = Boolean(
    report.introduction.scopeOfCertification.trim() &&
      report.introduction.accreditedLegalEntity,
  );

  const conclusionComplete = Boolean(
    report.conclusion.certificationRecommendation &&
      report.conclusion.auditorDeclarationAccepted &&
      report.conclusion.followUpRequired &&
      (report.conclusion.followUpRequired === 'No' ||
        report.conclusion.followUpComment.trim()),
  );

  const tabs: SheetTabItem[] = [
    {
      id: 'audit-details',
      label: 'Audit Details',
      complete: detailsComplete,
    },
    {
      id: 'audit-introduction',
      label: 'Introduction & CU',
      complete: introComplete,
    },
    ...sheets.map((sheet): SheetTabItem => {
      const visible = getVisibleClausesForSheet(
        sheet,
        report.details.schemes,
        report.evaluations,
      );
      const evaluated = visible.filter(
        (clause) => getClauseEvaluation(report.evaluations, clause.id).status !== null,
      ).length;

      return {
        id: sheet.id,
        label: sheet.navLabel,
        badge: `${evaluated}/${visible.length}`,
        complete: visible.length > 0 && evaluated === visible.length,
      };
    }),
    {
      id: 'findings-conclusion',
      label: 'Findings & Conclusion',
      complete: conclusionComplete,
    },
  ];

  return (
    <nav
      aria-label="Workbook sheets"
      className="bg-slate-100/90 shadow-[inset_0_-1px_0_0_#e2e8f0]"
    >
      <div className="mx-auto flex max-w-[1600px] items-end gap-1 overflow-x-auto overflow-y-hidden px-4 pt-2 sm:px-5">
        {tabs.map((tab) => {
          const isActive = tab.id === activeStep;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectStep(tab.id)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-t-lg border px-3.5 py-2 text-xs font-medium whitespace-nowrap transition sm:text-[0.8125rem] ${
                isActive
                  ? 'z-10 border-slate-200 border-b-white bg-white font-semibold text-[#1E3A5F] shadow-[inset_0_2px_0_0_#1E3A5F]'
                  : 'border-transparent border-b-slate-200 bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold ${
                    isActive
                      ? tab.complete
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'
                      : tab.complete
                        ? 'bg-emerald-100/80 text-emerald-800'
                        : 'bg-white/70 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.complete && (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
