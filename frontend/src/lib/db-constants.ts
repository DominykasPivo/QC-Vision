export const TEST_TYPES = ['incoming', 'in_process', 'final', 'other'] as const;
export type TestType = (typeof TEST_TYPES)[number];

export const TEST_STATUSES = ['open', 'in_progress', 'pending', 'finalized'] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export const DEFECT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type DefectSeverity = (typeof DEFECT_SEVERITIES)[number];

export const DEFECT_CATEGORIES = [
  'Incorrect Colors',
  'Damage',
  'Print Errors',
  'Embroidery Issues',
  'Other',
] as const;
export type DefectCategory = (typeof DEFECT_CATEGORIES)[number];

export function formatEnumLabel(value: string): string {
  const normalized = value.replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
