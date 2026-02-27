/**
 * Audit event formatting utilities
 */

import type { ApiAuditLog } from "./normalization";
import type { AuditEvent } from "@/lib/types";

/**
 * Format audit log with test-specific context
 */
export function formatAuditEventText(
  log: ApiAuditLog,
  testId: number | string,
): string {
  if (log.action === "STATUS_CHANGE" && log.meta?.from !== undefined) {
    return `Test ${testId}: Status changed: ${log.meta.from} → ${log.meta.to}`;
  }

  if (log.action === "ASSIGN") {
    return `Test ${testId}: Assigned: ${log.meta?.from ?? "none"} → ${log.meta?.to ?? "none"}`;
  }

  if (log.action === "UNASSIGN") {
    return `Test ${testId}: Unassigned: ${log.meta?.from ?? "none"} → none`;
  }

  if (log.action === "TEST_TYPE_CHANGE" && log.meta?.from !== undefined) {
    return `Test ${testId}: Test type changed: ${log.meta.from} → ${log.meta.to}`;
  }

  if (log.action === "UPLOAD") {
    return `Test ${testId}: Uploaded Photo${log.entity_id ? ` #${log.entity_id}` : ""} by ${log.username ?? "system"}`;
  }

  if (log.action === "UPDATE") {
    const fields = Array.isArray(log.meta?.updated_fields)
      ? log.meta.updated_fields
      : null;
    return fields?.length
      ? `Test ${testId}: Updated fields: ${fields.join(", ")}`
      : `Test ${testId}: UPDATE ${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ""} by ${log.username ?? "system"}`;
  }

  return `Test ${testId}: ${log.action} ${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ""} by ${log.username ?? "system"}`;
}

/**
 * Process audit logs from API into frontend audit events
 */
export function processAuditLogs(rawLogs: ApiAuditLog[]): AuditEvent[] {
  return rawLogs
    .filter((log) => log?.meta?.user_visible !== false)
    .map((log) => {
      const testId =
        log.entity_type === "Test"
          ? log.entity_id
          : typeof log?.meta?.test_id === "number" ||
              typeof log?.meta?.test_id === "string"
            ? log.meta.test_id
            : null;

      if (!testId) return null;

      return {
        id: String(log.id),
        timestamp: log.created_at,
        event: formatAuditEventText(log, testId),
      } as AuditEvent;
    })
    .filter(Boolean) as AuditEvent[];
}
