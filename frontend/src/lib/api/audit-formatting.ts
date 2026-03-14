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
  const safe = (value: unknown) =>
    value == null || value === "" ? "none" : String(value);

  if (log.action === "STATUS_CHANGE" && log.attribute === "status") {
    return `Test ${testId}: Status changed: ${safe(log.old_value)} → ${safe(log.new_value)}`;
  }

  if (log.action === "ASSIGN" && log.attribute === "assigned_to") {
    return `Test ${testId}: Assigned: ${safe(log.old_value)} → ${safe(log.new_value)}`;
  }

  if (log.action === "UNASSIGN" && log.attribute === "assigned_to") {
    return `Test ${testId}: Unassigned: ${safe(log.old_value)} → ${safe(log.new_value)}`;
  }

  if (log.action === "TEST_TYPE_CHANGE" && log.attribute === "test_type") {
    return `Test ${testId}: Test type changed: ${safe(log.old_value)} → ${safe(log.new_value)}`;
  }

  if (log.action === "UPLOAD" && log.attribute === "filename") {
    return `Test ${testId}: Uploaded Photo${log.entity_id ? ` #${log.entity_id}` : ""} by ${log.username ?? "system"}`;
  }

  if (log.action === "UPDATE") {
    return log.attribute
      ? `Test ${testId}: Updated ${log.attribute}: ${safe(log.old_value)} → ${safe(log.new_value)}`
      : `Test ${testId}: UPDATE ${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ""} by ${log.username ?? "system"}`;
  }

  if (log.action === "CREATE" && log.entity_type === "Defect") {
    return `Test ${testId}: Created Defect${log.entity_id ? ` #${log.entity_id}` : ""} by ${log.username ?? "system"}`;
  }

  if (log.action === "DELETE" && log.entity_type === "Defect") {
    return `Test ${testId}: Deleted Defect${log.entity_id ? ` #${log.entity_id}` : ""} by ${log.username ?? "system"}`;
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
        log.test_id ??
        (log.entity_type === "Test"
          ? log.entity_id
          : typeof log?.meta?.test_id === "number" ||
              typeof log?.meta?.test_id === "string"
            ? log.meta.test_id
            : null);

      if (!testId) return null;

      return {
        id: String(log.id),
        timestamp: log.created_at,
        event: formatAuditEventText(log, testId),
      } as AuditEvent;
    })
    .filter(Boolean) as AuditEvent[];
}
