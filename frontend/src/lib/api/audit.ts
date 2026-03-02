const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export type FetchAuditParams = {
  action?: string;
  entity_type?: string;
  entity_id?: string | number;
  username?: string;
  clear_filters?: boolean;
  limit?: number;
  offset?: number;
};

export type AuditActivityItem = {
  id: number | string;
  action: string;
  entity_type: string;
  entity_id: number | string;
  username?: string | null;
  created_at: string;
  meta?: Record<string, unknown> | null;
};

export type AuditActivityResponse = {
  items: AuditActivityItem[];
  total: number;
  limit: number;
  offset: number;
};

export async function fetchAuditLogs(params: FetchAuditParams = {}) {
  const searchParams = new URLSearchParams();

  searchParams.set("limit", String(params.limit ?? 50));
  searchParams.set("offset", String(params.offset ?? 0));

  if (params.clear_filters) {
    searchParams.set("clear_filters", "true");
  } else {
    if (params.action) searchParams.set("action", params.action);
    if (params.entity_type) searchParams.set("entity_type", params.entity_type);
    if (params.entity_id !== undefined && params.entity_id !== "") {
      searchParams.set("entity_id", String(params.entity_id));
    }
    if (params.username) searchParams.set("username", params.username);
  }

  const res = await fetch(
    `${API_URL}/api/v1/audit/logs?${searchParams.toString()}`,
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch audit logs (${res.status})`);
  }

  return res.json(); // { items, total, limit, offset }
}

export async function fetchTestActivity(
  testId: number | string,
  params: { user_actions_only?: boolean; limit?: number; offset?: number } = {},
) {
  const searchParams = new URLSearchParams();
  searchParams.set(
    "user_actions_only",
    String(params.user_actions_only ?? true),
  );
  searchParams.set("limit", String(params.limit ?? 20));
  searchParams.set("offset", String(params.offset ?? 0));

  const res = await fetch(
    `${API_URL}/api/v1/audit/tests/${testId}/activity?${searchParams.toString()}`,
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch test activity (${res.status})`);
  }

  return (await res.json()) as AuditActivityResponse;
}
