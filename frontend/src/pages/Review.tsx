import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AppDataContext } from "@/components/layout/AppShell";
import { request } from "@/lib/api/http";
import { getStoredRole, getStoredUsername } from "@/lib/auth";
import type { ReviewStatus } from "@/lib/db-constants";
import { fetchGallery } from "@/lib/api/gallery";
import { updateVerificationStatus } from "@/lib/api/defects";
import { VerificationStatusBar } from "@/components/photo-defects";
import type { GalleryPhoto } from "@/lib/api/gallery";

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
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
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
      // Load all tests (pending, approved, and rejected)
      const res = await request<{ items: TestResponse[] }>(
        "/api/v1/tests/?limit=100",
      );
      setTests(res.items ?? []);

      // Load pending photos
      const photosRes = await fetchGallery({
        verification_status: "pending",
        page_size: 100,
      });
      setPhotos(photosRes.items ?? []);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPending();
  }, []);

  // Poll for pending tests every 30 seconds when tab is visible
  useEffect(() => {
    const POLL_MS = 30_000; // 30 seconds
    const id = setInterval(() => {
      if (!document.hidden) {
        void loadPending();
      }
    }, POLL_MS);

    return () => clearInterval(id);
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

      // Update local state to reflect the new status
      setTests((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                review_status: response.review_status,
                reviewed_by: response.reviewed_by,
                reviewed_at: response.reviewed_at,
                review_comment: response.review_comment,
              }
            : t,
        ),
      );
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

      // Update local state to reflect the new status
      setTests((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                review_status: response.review_status,
                reviewed_by: response.reviewed_by,
                reviewed_at: response.reviewed_at,
                review_comment: response.review_comment,
              }
            : t,
        ),
      );
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "Reject failed");
    }
  };

  const approvePhoto = async (photoId: number) => {
    try {
      await updateVerificationStatus(photoId, "approved");
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "Approve photo failed");
    }
  };

  const rejectPhoto = async (photoId: number) => {
    try {
      await updateVerificationStatus(photoId, "rejected");
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "Reject photo failed");
    }
  };

  if (loading) return <div className="p-6">Loading review queue…</div>;
  if (error) return <div className="p-6">Error: {error}</div>;

  return (
    <div className="p-6 max-w-5xl">
      <h2 className="mb-1 text-xl font-semibold">Review</h2>
      <p className="mt-0 text-sm text-muted-foreground">
        Tests and Photos for review and decision changes.
      </p>

      {/* Pending Tests Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Pending Tests</h3>
        {tests.filter((t) => t.review_status === "pending").length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending tests.</div>
        ) : (
          <div className="grid gap-4">
            {tests
              .filter((t) => t.review_status === "pending")
              .map((t) => (
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
                        <span className="font-semibold">Type:</span>{" "}
                        {t.test_type}
                      </div>
                      <div>
                        <span className="font-semibold">Status:</span>{" "}
                        {t.status}
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

      {/* Reviewed Tests Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Reviewed Tests</h3>
        {tests.filter((t) => t.review_status !== "pending").length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No reviewed tests.
          </div>
        ) : (
          <div className="grid gap-4">
            {tests
              .filter((t) => t.review_status !== "pending")
              .map((t) => (
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
                        <span className="font-semibold">Type:</span>{" "}
                        {t.test_type}
                      </div>
                      <div>
                        <span className="font-semibold">Status:</span>{" "}
                        {t.status}
                      </div>
                      <div>
                        <span
                          className={`font-semibold px-3 py-1 rounded-full text-sm ${
                            t.review_status === "approved"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {t.review_status === "approved"
                            ? "✓ Approved"
                            : "✗ Rejected"}
                        </span>
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
                      <div>
                        <span className="font-semibold">Reviewed by:</span>{" "}
                        {t.reviewed_by ?? "—"}
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
                      className={`px-4 py-2 rounded-lg border font-semibold ${
                        t.review_status === "approved"
                          ? "border-green-600 bg-green-50 text-green-800 hover:bg-green-100"
                          : "border-green-600 bg-white text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {t.review_status === "approved"
                        ? "✓ Approved"
                        : "Approve"}
                    </button>

                    <button
                      type="button"
                      onClick={() => rejectTest(t.id)}
                      className={`px-4 py-2 rounded-lg border font-semibold ${
                        t.review_status === "rejected"
                          ? "border-red-600 bg-red-50 text-red-800 hover:bg-red-100"
                          : "border-red-600 bg-white text-red-600 hover:bg-red-50"
                      }`}
                    >
                      {t.review_status === "rejected" ? "✗ Rejected" : "Reject"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Photos Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">
          Pending Photo Verifications
        </h3>
        {photos.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No pending photo verifications.
          </div>
        ) : (
          <div className="grid gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="border border-border rounded-xl p-5"
              >
                <div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Photo #{photo.id}
                  </div>
                  <div className="text-sm mb-3">
                    <span className="font-semibold">Test ID:</span>{" "}
                    {photo.test_id}
                  </div>
                  <div className="text-sm mb-3">
                    <span className="font-semibold">Type:</span>{" "}
                    {photo.test_type}
                  </div>
                  {photo.description && (
                    <div className="text-sm mb-3">
                      <span className="font-semibold">Description:</span>{" "}
                      {photo.description}
                    </div>
                  )}
                </div>
                <VerificationStatusBar
                  isApproved={photo.verification_status === "approved"}
                  isRejected={photo.verification_status === "rejected"}
                  isSaving={false}
                  onVerify={(status) => {
                    if (status === "approved") {
                      approvePhoto(photo.id);
                    } else if (status === "rejected") {
                      rejectPhoto(photo.id);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
