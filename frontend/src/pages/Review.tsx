import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AppDataContext } from "@/components/layout/AppShell";
import { request } from "@/lib/api/http";
import { getStoredRole, getStoredUsername } from "@/lib/auth";
import type { ReviewStatus } from "@/lib/db-constants";

type TestResponse = {
  id: number;
  product_id: number;
  test_type: string;
  requester: string;
  assigned_to: string | null;
  description: string | null;
  status: string;
  review_status: string; // "pending" | "approved" | "rejected"
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
};

const getErrorMessage = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === "string"
      ? e
      : "Something went wrong";

export function Review() {
  const { updateTest } = useOutletContext<AppDataContext>();
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

  async function loadPending() {
    setLoading(true);
    setError(null);
    try {
      const res = await request<{ items: TestResponse[] }>(
        "/api/v1/tests/?limit=100",
      );
      const pending = (res.items ?? []).filter(
        (t) => t.review_status === "pending",
      );
      setTests(pending);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPending();
  }, []);

  const approveTest = async (id: number) => {
    try {
      const response = await request<TestResponse>(
        `/api/v1/tests/${id}/review`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ decision: "approved" }),
        },
      );

      // Update the test in the context with the new review status
      updateTest(String(id), {
        review_status: response.review_status as ReviewStatus,
        reviewed_by: response.reviewed_by,
        reviewed_at: response.reviewed_at,
        review_comment: response.review_comment,
      });

      // Remove from pending list
      setTests((prev) => prev.filter((t) => t.id !== id));
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "Approve failed");
    }
  };

  const rejectTest = async (id: number) => {
    try {
      const response = await request<TestResponse>(
        `/api/v1/tests/${id}/review`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ decision: "rejected" }),
        },
      );

      // Update the test in the context with the new review status
      updateTest(String(id), {
        review_status: response.review_status as ReviewStatus,
        reviewed_by: response.reviewed_by,
        reviewed_at: response.reviewed_at,
        review_comment: response.review_comment,
      });

      // Remove from pending list
      setTests((prev) => prev.filter((t) => t.id !== id));
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "Reject failed");
    }
  };

  if (loading) return <div className="p-6">Loading review queue…</div>;
  if (error) return <div className="p-6">Error: {error}</div>;

  return (
    <div className="p-6 max-w-5xl">
      <h2 className="mb-1 text-xl font-semibold">Review</h2>
      <p className="mt-0 text-sm text-muted-foreground">
        Pending Tests will be shown here.
      </p>

      {tests.length === 0 ? (
        <div className="mt-5">No pending tests.</div>
      ) : (
        <div className="grid gap-4 mt-5">
          {tests.map((t) => (
            <div
              key={t.id}
              className="border border-border rounded-xl p-5 flex items-center justify-between"
            >
              <div>
                <div className="text-sm text-muted-foreground">
                  Test #{t.id}
                </div>

                <div className="text-2xl font-bold mt-1 mb-3">
                  Product {t.product_id}
                </div>

                <div className="flex flex-wrap gap-4">
                  <div>
                    <span className="font-semibold">Type:</span> {t.test_type}
                  </div>
                  <div>
                    <span className="font-semibold">Status:</span> {t.status}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-2">
                  <div>
                    <span className="font-semibold">Requester:</span>{" "}
                    {t.requester}
                  </div>
                  <div>
                    <span className="font-semibold">Assigned:</span>{" "}
                    {t.assigned_to ?? "—"}
                  </div>
                </div>

                <div className="mt-2">
                  <span className="font-semibold">Description:</span>{" "}
                  {t.description ?? "—"}
                </div>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => approveTest(t.id)}
                  className="px-4 py-2 rounded-lg border border-green-600 bg-white font-semibold hover:bg-green-50"
                >
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => rejectTest(t.id)}
                  className="px-4 py-2 rounded-lg border border-red-500 bg-white font-semibold hover:bg-red-50"
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
