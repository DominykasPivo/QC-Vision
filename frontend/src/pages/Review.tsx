import { useCallback, useEffect, useMemo, useState } from "react";
import { request } from "@/lib/api/http";
import { getStoredUsername, getStoredRole } from "@/lib/auth";

type TestResponse = {
  id: number;
  product_id: number;
  test_type: string;
  requester: string;
  assigned_to: string | null;
  description: string | null;
  status: string;
  review_status: "pending" | "approved" | "rejected" | string;
};

type TestsListResponse = {
  items: TestResponse[];
  total?: number;
  limit?: number;
  offset?: number;
};

const getErrorMessage = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === "string"
      ? e
      : "Something went wrong";

export function Review() {
  const [tests, setTests] = useState<TestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const username = useMemo(() => getStoredUsername(), []);
  const role = useMemo(() => getStoredRole?.() ?? "user", []);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "X-User": username || "system",
      "X-Role": role || "user",
    }),
    [username, role],
  );

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await request<TestsListResponse>("/api/v1/tests/?limit=100");

      const items = Array.isArray(res?.items) ? res.items : [];
      const pending = items.filter((t) => t.review_status === "pending");

      setTests(pending);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const approveTest = useCallback(
    async (id: number) => {
      try {
        await request(`/api/v1/tests/${id}/review`, {
          method: "POST",
          headers,
          body: JSON.stringify({ decision: "approved" }),
        });

        // keep UI consistent with backend
        await loadPending();
      } catch (e: unknown) {
        alert(getErrorMessage(e) || "Approve failed");
      }
    },
    [headers, loadPending],
  );

  const rejectTest = useCallback(
    async (id: number) => {
      try {
        await request(`/api/v1/tests/${id}/review`, {
          method: "POST",
          headers,
          body: JSON.stringify({ decision: "rejected" }),
        });

        await loadPending();
      } catch (e: unknown) {
        alert(getErrorMessage(e) || "Reject failed");
      }
    },
    [headers, loadPending],
  );

  if (loading) return <div style={{ padding: 24 }}>Loading review queue…</div>;
  if (error) return <div style={{ padding: 24 }}>Error: {error}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h2 style={{ marginBottom: 6 }}>Review</h2>
      <p style={{ marginTop: 0, color: "#666" }}>
        Pending Tests will be shown here.
      </p>

      {tests.length === 0 ? (
        <div style={{ marginTop: 18 }}>No pending tests.</div>
      ) : (
        <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
          {tests.map((t) => (
            <div
              key={t.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div>
                <div style={{ color: "#666", fontSize: 14 }}>Test #{t.id}</div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    margin: "6px 0 10px",
                  }}
                >
                  Product {t.product_id}
                </div>

                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  <div>
                    <b>Type:</b> {t.test_type}
                  </div>
                  <div>
                    <b>Status:</b> {t.status}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  <div>
                    <b>Requester:</b> {t.requester}
                  </div>
                  <div>
                    <b>Assigned:</b> {t.assigned_to ?? "—"}
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <b>Description:</b> {t.description ?? "—"}
                </div>
              </div>

              <div style={{ display: "grid", gap: 10, minWidth: 140 }}>
                <button
                  type="button"
                  onClick={() => approveTest(t.id)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 12,
                    border: "1px solid #16a34a",
                    background: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => rejectTest(t.id)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 12,
                    border: "1px solid #ef4444",
                    background: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
