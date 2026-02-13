export const TEST_TYPES = ['incoming', 'in_process', 'final', 'other'] as const;
export type TestType = (typeof TEST_TYPES)[number];

export const TEST_STATUSES = ['open', 'in_progress', 'pending', 'finalized'] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export const DEFECT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type DefectSeverity = (typeof DEFECT_SEVERITIES)[number];

export const DEFECT_CATEGORIES = [
  { id: 1, name: 'Incorrect Colors' },
  { id: 2, name: 'Damage' },
  { id: 3, name: 'Print Errors' },
  { id: 4, name: 'Embroidery Issues' },
  { id: 5, name: 'Other' },
] as const;

export const DEFECT_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
] as const;

export type DefectCategoryRecord = typeof DEFECT_CATEGORIES[number];
export type DefectCategory = DefectCategoryRecord['id'];

export function formatEnumLabel(value: string): string {
  const normalized = value.replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
