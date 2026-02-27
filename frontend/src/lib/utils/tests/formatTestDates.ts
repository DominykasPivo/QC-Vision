/**
 * Format date value for display, showing "—" for empty/invalid dates
 */
export function formatDateOnly(value?: string | null): string {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return parsed.toISOString().slice(0, 10);
}

/**
 * Format field value for display, showing "—" for empty strings
 */
export function formatFieldValue(value?: string | null): string {
  return value?.trim() ? value : "—";
}
