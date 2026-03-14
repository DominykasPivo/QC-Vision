import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AppDataContext } from "../components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fetchAuditLogs } from "@/lib/api/audit";
import { getStoredUsername } from "@/lib/auth";

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type ApiAuditEventItem = {
  id: number | string;
  action?: string;
  entity_type?: string;
  entity_id?: number | string | null;
  test_id?: number | string | null;
  attribute?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  created_at: string;
  updated_at?: string;
  meta?: {
    summary?: string;
    message?: string;
    description?: string;
    [key: string]: unknown;
  } | null;
};

function resolveTestId(item: ApiAuditEventItem): number | null {
  if (item.test_id != null) {
    const value = Number(item.test_id);
    return Number.isFinite(value) ? value : null;
  }

  if (item.entity_type === "Test" && item.entity_id != null) {
    const value = Number(item.entity_id);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

function formatAuditValue(value: unknown): string {
  if (value == null) return "NULL";
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function AuditLog() {
  useOutletContext<AppDataContext>();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const [entityType, setEntityType] = useState<string>("");
  const [entityId, setEntityId] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  const [auditEvents, setAuditEvents] = useState<ApiAuditEventItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLogs(opts?: { clearFilters?: boolean }) {
    if (!getStoredUsername()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchAuditLogs({
        action: action.trim() || undefined,
        entity_type: entityType.trim() || undefined,
        entity_id: entityId.trim() || undefined,
        username: username.trim() || undefined,
        clear_filters: opts?.clearFilters,
        limit: 200,
        offset: 0,
      });

      const items: ApiAuditEventItem[] = Array.isArray(data?.items)
        ? data.items
        : [];
      setAuditEvents(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for audit log updates every 30 seconds when tab is visible
  useEffect(() => {
    const POLL_MS = 30_000; // 30 seconds
    const id = setInterval(() => {
      if (!document.hidden) {
        fetchLogs();
      }
    }, POLL_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, entityType, entityId, username]); // Re-setup polling when filters change

  const grouped = useMemo(() => {
    const map: Record<string, ApiAuditEventItem[]> = {};

    for (const item of auditEvents) {
      const testId = resolveTestId(item);
      const groupId = testId != null ? String(testId) : "other";

      if (!map[groupId]) map[groupId] = [];
      map[groupId].push(item);
    }

    for (const key of Object.keys(map)) {
      map[key] = [...map[key]].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    const entries = Object.entries(map).sort(([a], [b]) => {
      if (a === "other") return 1;
      if (b === "other") return -1;
      return Number(a) - Number(b);
    });

    return entries;
  }, [auditEvents]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Audit Log
        </h2>
        <p className="text-sm text-slate-600 md:text-base">
          Track all system events and changes
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Entity Type</label>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">All</option>
            <option value="Test">Test</option>
            <option value="Photo">Photo</option>
            <option value="Defect">Defect</option>
            <option value="Album">Album</option>
            <option value="User">User</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Entity ID</label>
          <input
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm sm:w-40"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="e.g. 1"
            inputMode="numeric"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Action</label>
          <input
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. UPLOAD"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Username</label>
          <input
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. system"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white"
            onClick={() => fetchLogs()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Apply"}
          </button>

          <button
            type="button"
            className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900"
            onClick={() => {
              setEntityType("");
              setEntityId("");
              setAction("");
              setUsername("");
              fetchLogs({ clearFilters: true });
            }}
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="mt-4">
        <CardContent className="p-0">
          {auditEvents.length === 0 ? (
            <div className="px-5 py-4 text-sm text-slate-600 md:px-6">
              {loading ? "Loading audit activity..." : "No audit activity yet."}
            </div>
          ) : (
            grouped.map(([groupKey, events]) => {
              const isOpen = openGroups[groupKey] ?? false;
              const title =
                groupKey === "other" ? "Other activity" : `Test ${groupKey}`;

              return (
                <div
                  key={groupKey}
                  className="border-b border-slate-200 last:border-b-0"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left md:px-6"
                    onClick={() =>
                      setOpenGroups((prev) => ({
                        ...prev,
                        [groupKey]: !isOpen,
                      }))
                    }
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {title}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({events.length})
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                    </div>

                    <div className="text-xs text-slate-500 md:text-sm">
                      {events[0]?.created_at
                        ? formatTimestamp(events[0].created_at)
                        : ""}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="overflow-x-auto bg-slate-50">
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-100 text-slate-900">
                          <tr>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              id
                            </th>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              action
                            </th>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              entity_type
                            </th>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              entity_id
                            </th>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              test_id
                            </th>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              attribute
                            </th>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              old_value
                            </th>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              new_value
                            </th>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              created_at
                            </th>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              updated_at
                            </th>
                            <th className="border border-slate-200 px-3 py-2 font-semibold">
                              username
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {events.map((event) => (
                            <tr key={event.id} className="align-top">
                              <td className="border border-slate-200 px-3 py-2">
                                {String(event.id)}
                              </td>
                              <td className="border border-slate-200 px-3 py-2">
                                {event.action ?? "NULL"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2">
                                {event.entity_type ?? "NULL"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2">
                                {event.entity_id != null
                                  ? String(event.entity_id)
                                  : "NULL"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2">
                                {resolveTestId(event) != null
                                  ? String(resolveTestId(event))
                                  : "NULL"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2">
                                {event.attribute ?? "NULL"}
                              </td>
                              <td className="max-w-xs border border-slate-200 px-3 py-2 whitespace-pre-wrap break-words">
                                {formatAuditValue(event.old_value)}
                              </td>
                              <td className="max-w-xs border border-slate-200 px-3 py-2 whitespace-pre-wrap break-words">
                                {formatAuditValue(event.new_value)}
                              </td>
                              <td className="border border-slate-200 px-3 py-2">
                                {formatTimestamp(event.created_at)}
                              </td>
                              <td className="border border-slate-200 px-3 py-2">
                                {event.updated_at
                                  ? formatTimestamp(event.updated_at)
                                  : "NULL"}
                              </td>
                              <td className="border border-slate-200 px-3 py-2">
                                {event.username ?? "NULL"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
