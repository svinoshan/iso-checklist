import auditConfigRaw from '../audit-config.json';
import clause45Raw from './clause-4-5.json';
import clause67Raw from './clause-6-7.json';
import clause8Raw from './clause-8.json';
import clause910Raw from './clause-9-10.json';
import type { AuditConfig, ClauseSheetDefinition } from '../../types/audit';

export const AUDIT_CONFIG: AuditConfig = auditConfigRaw as AuditConfig;

export const CLAUSE_SHEETS: readonly ClauseSheetDefinition[] = [
  clause45Raw as ClauseSheetDefinition,
  clause67Raw as ClauseSheetDefinition,
  clause8Raw as ClauseSheetDefinition,
  clause910Raw as ClauseSheetDefinition,
];
