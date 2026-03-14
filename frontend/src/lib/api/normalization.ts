/**
 * API response normalization utilities
 * Converts backend API responses to frontend types
 */

import type { Test } from "@/lib/types";
import {
  TEST_STATUSES,
  TEST_TYPES,
  type TestStatus,
  type TestType,
} from "../db-constants";

export type ApiTest = {
  id: number | string;
  jiraId?: string;
  jira_id?: string;
  productName?: string;
  product_name?: string;
  testType?: string;
  test_type?: string;
  requester?: string;
  assignedTo?: string | null;
  assigned_to?: string | null;
  description?: string | null;
  color_ids?: number[] | null;
  colors?: Array<{ id: number; name: string; hex_value: string }> | null;
  matrix_columns?: string | null;
  status?: string | null;
  deadlineAt?: string | null;
  deadline_at?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
};

export type ApiAuditLog = {
  id: string | number;
  created_at: string;
  updated_at: string;
  action: string;
  entity_type: string;
  entity_id?: number | string | null;
  test_id?: number | string | null;
  attribute?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  username?: string | null;
  meta?: {
    user_visible?: boolean;
    test_id?: number | string;
    [key: string]: unknown;
  } | null;
};

/**
 * Normalize status value to valid TestStatus
 */
export function normalizeStatus(value: unknown): TestStatus {
  if (typeof value !== "string") return "pending";
  return TEST_STATUSES.includes(value as TestStatus)
    ? (value as TestStatus)
    : "pending";
}

/**
 * Normalize test type value to valid TestType
 */
export function normalizeTestType(value: unknown): TestType {
  if (typeof value !== "string") return "other";
  return TEST_TYPES.includes(value as TestType) ? (value as TestType) : "other";
}

/**
 * Format deadline date to YYYY-MM-DD string
 */
export function formatDeadline(value?: string | null): string {
  if (!value) return "None";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

/**
 * Convert API test response to frontend Test type
 */
export function toFrontendTest(raw: ApiTest): Test {
  const jiraId = raw.jiraId ?? raw.jira_id ?? "";
  const productName = raw.productName ?? raw.product_name ?? "";
  const testType = normalizeTestType(raw.testType ?? raw.test_type);
  const status = normalizeStatus(raw.status);
  const deadlineAt = raw.deadlineAt ?? raw.deadline_at ?? null;
  const assignedTo = raw.assignedTo ?? raw.assigned_to ?? undefined;
  const createdAt = raw.createdAt ?? raw.created_at ?? null;
  const updatedAt = raw.updatedAt ?? raw.updated_at ?? null;
  const colorIds = raw.color_ids ?? raw.colors?.map((c) => c.id) ?? [];
  const colors = raw.colors?.map((c) => ({
    id: c.id,
    name: c.name,
    hexValue: c.hex_value,
  }));

  return {
    id: String(raw.id),
    jiraId,
    productName,
    testType,
    requester: raw.requester ?? "",
    assignedTo: assignedTo || undefined,
    description: raw.description ?? null,
    deadline: formatDeadline(deadlineAt),
    deadlineAt,
    colorIds,
    colors,
    matrixColumns: raw.matrix_columns ?? null,
    status,
    createdAt,
    updatedAt,
  };
}

/**
 * Convert API audit log to frontend AuditEvent type
 */
export function toFrontendAuditEvent(raw: ApiAuditLog): {
  id: string;
  event: string;
  timestamp: string;
} {
  const actionLabel =
    raw.action === "CREATE"
      ? "created"
      : raw.action === "UPDATE"
        ? "updated"
        : raw.action === "DELETE"
          ? "deleted"
          : raw.action.toLowerCase();

  const entity = raw.entity_type?.toLowerCase() ?? "item";
  const entityId = raw.entity_id ?? "?";
  const username = raw.username ?? "system";
  const attribute = raw.attribute;

  // Build event message
  let event = `${username} ${actionLabel} ${entity} #${entityId}`;

  if (raw.action === "UPDATE" && attribute) {
    event += ` (${attribute})`;
  }

  return {
    id: String(raw.id),
    event,
    timestamp: raw.created_at,
  };
}
