import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ListChecks,
} from 'lucide-react';
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

interface StepItem {
  id: WizardStepId;
  label: string;
  subtitle?: string;
  badge?: string;
  complete?: boolean;
  icon: 'details' | 'intro' | 'clause' | 'conclusion';
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

  const steps: StepItem[] = [
    {
      id: 'audit-details',
      label: '1. Audit Details',
      subtitle: 'Company, schemes & team',
      complete: detailsComplete,
      icon: 'details',
    },
    {
      id: 'audit-introduction',
      label: '2. Introduction & CU',
      subtitle: 'Scope & accreditation',
      complete: introComplete,
      icon: 'intro',
    },
    ...sheets.map((sheet, index): StepItem => {
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
        label: `${index + 3}. ${sheet.navLabel}`,
        subtitle: `${visible.length} applicable clause${visible.length === 1 ? '' : 's'}`,
        badge: `${evaluated}/${visible.length}`,
        complete: visible.length > 0 && evaluated === visible.length,
        icon: 'clause',
      };
    }),
    {
      id: 'findings-conclusion',
      label: '7. Findings & Conclusion',
      subtitle: 'Summary & recommendation',
      complete: conclusionComplete,
      icon: 'conclusion',
    },
  ];

  const renderIcon = (icon: StepItem['icon'], isActive: boolean) => {
    const className = `h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`;
    switch (icon) {
      case 'details':
        return <Building2 className={className} />;
      case 'intro':
        return <FileText className={className} />;
      case 'clause':
        return <ListChecks className={className} />;
      case 'conclusion':
        return <ClipboardCheck className={className} />;
    }
  };

  return (
    <nav aria-label="Audit report sections" className="w-full lg:w-68 lg:shrink-0">
      <div className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-20 lg:flex-col lg:overflow-visible lg:pb-0">
        {steps.map((step) => {
          const isActive = step.id === activeStep;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step.id)}
              className={`flex shrink-0 items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition lg:w-full ${
                isActive
                  ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {renderIcon(step.icon, isActive)}
                <div>
                  <div className="text-sm font-medium leading-tight">{step.label}</div>
                  {step.subtitle && (
                    <div
                      className={`mt-0.5 text-xs ${
                        isActive ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {step.subtitle}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {step.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : step.complete
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {step.badge}
                  </span>
                )}
                {step.complete && (
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-emerald-300' : 'text-emerald-600'
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
