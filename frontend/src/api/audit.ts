const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchAuditLogs() {
  const res = await fetch(`${API_URL}/api/v1/audit/logs?limit=50&offset=0`);
  if (!res.ok) {
    throw new Error(`Failed to fetch audit logs (${res.status})`);
  }
  return res.json(); // { items, total, limit, offset }
}
