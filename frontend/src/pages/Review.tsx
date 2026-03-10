import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { AppDataContext } from "@/components/layout/AppShell";
import { request } from "@/lib/api/http";
import { getStoredRole, getStoredUsername } from "@/lib/auth";
import type { ReviewStatus } from "@/lib/db-constants";
import { fetchGallery } from "@/lib/api/gallery";
import { updateVerificationStatus } from "@/lib/api/defects";
import { VerificationStatusBar } from "@/components/photo-defects";
import type { GalleryPhoto } from "@/lib/api/gallery";
import {
  ReviewFilters,
  ReviewFiltersMobile,
  ReviewPageFilters,
  ReviewPageFiltersMobile,
} from "@/components/review";
import { useReviewFilters } from "@/hooks";

type TestResponse = {
  id: number;
  jira_id: string;
  product_id: number;
  product_name: string;
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
  const navigate = useNavigate();
  const { updateTest } = useOutletContext<AppDataContext>();
  const [tests, setTests] = useState<TestResponse[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Gallery-style filters
  const {
    filters,
    hasActiveFilters,
    hasAdvancedFilters,
    setTestTypeFilter,
    setVerificationStatusFilter,
    setReviewStatusFilter,
  } = useReviewFilters();

  // Legacy filter states (keeping for backward compatibility with ReviewFilters component)
  const [reviewStatusFilterOld, setReviewStatusFilterOld] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [jiraIdFilter, setJiraIdFilter] = useState("");
  const [productNameFilter, setProductNameFilter] = useState("");

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

  // Redirect non-reviewers away from the Review page
  useEffect(() => {
    if (role && role !== "reviewer") {
      navigate("/gallery");
    }
  }, [role, navigate]);

  async function loadPending() {
    setLoading(true);
    setError(null);
    try {
      // Load all tests (pending, approved, and rejected)
      const res = await request<{ items: TestResponse[] }>(
        "/api/v1/tests/?limit=100",
      );
      setTests(res.items ?? []);

      // Load all photos (pending, approved, and rejected) - no status filter
      const photosRes = await fetchGallery({
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
      // Update photo status instead of removing it
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, verification_status: "approved" } : p,
        ),
      );
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "Approve photo failed");
    }
  };

  const rejectPhoto = async (photoId: number) => {
    try {
      await updateVerificationStatus(photoId, "rejected");
      // Update photo status instead of removing it
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, verification_status: "rejected" } : p,
        ),
      );
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "Reject photo failed");
    }
  };

  // Apply filters to tests
  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      // Review status filter (new)
      if (
        filters.reviewStatus &&
        filters.reviewStatus !== "all" &&
        test.review_status !== filters.reviewStatus
      ) {
        return false;
      }

      // Test type filter (new)
      if (
        filters.testType &&
        (!test.test_type ||
          test.test_type.toLowerCase() !== filters.testType.toLowerCase())
      ) {
        return false;
      }

      // Legacy filters (keeping for backward compatibility)
      // Assigned to filter (case-insensitive)
      if (
        assignedToFilter &&
        (!test.assigned_to ||
          !test.assigned_to
            .toLowerCase()
            .includes(assignedToFilter.toLowerCase()))
      ) {
        return false;
      }

      // Jira ID / Test ID filter (case-insensitive)
      if (
        jiraIdFilter &&
        (!test.jira_id ||
          !test.jira_id
            .toString()
            .toLowerCase()
            .includes(jiraIdFilter.toLowerCase()))
      ) {
        return false;
      }

      // Product name filter (case-insensitive)
      if (
        productNameFilter &&
        (!test.product_name ||
          !test.product_name
            .toLowerCase()
            .includes(productNameFilter.toLowerCase()))
      ) {
        return false;
      }

      return true;
    });
  }, [
    tests,
    filters.reviewStatus,
    filters.testType,
    assignedToFilter,
    jiraIdFilter,
    productNameFilter,
  ]);

  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      // Verification status filter (new)
      if (
        filters.verificationStatus &&
        photo.verification_status !== filters.verificationStatus
      ) {
        return false;
      }

      return true;
    });
  }, [photos, filters.verificationStatus]);

  // Check if there are any active filters
  const anyFiltersActive = Boolean(
    hasActiveFilters || assignedToFilter || jiraIdFilter || productNameFilter,
  );

  if (loading) return <div className="p-6">Loading review queue…</div>;
  if (error) return <div className="p-6">Error: {error}</div>;

  // Separate tests by review status for display
  const pendingTests = filteredTests.filter(
    (t) => t.review_status === "pending",
  );
  const reviewedTests = filteredTests.filter(
    (t) => t.review_status !== "pending",
  );

  return (
    <div className="min-h-[calc(100dvh-var(--header-height)-var(--nav-height))] px-3 py-4 pb-24 md:px-4 md:py-5 md:pb-8">
      <section className="w-full rounded-[28px] border-2 border-slate-200 bg-white px-5 py-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-8 md:py-8 xl:px-[52px] xl:py-[48px]">
        <div className="flex flex-col gap-5 xl:gap-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold leading-tight tracking-[-0.02em] text-[#0F172A] md:text-4xl xl:text-[42px]">
              Review
            </h1>
            <p className="text-base font-medium text-[#64748B] md:text-base xl:text-[16px]">
              Review and manage quality control tests and photos
            </p>
          </div>

          {/* Search Bar and Filters */}
          <div className="space-y-3">
            {/* Mobile Filters - Page Filters */}
            <ReviewPageFiltersMobile
              isOpen={mobileFiltersOpen}
              onClose={() => setMobileFiltersOpen((prev) => !prev)}
              testTypeFilter={filters.testType}
              reviewStatusFilter={filters.reviewStatus}
              verificationStatusFilter={filters.verificationStatus}
              hasAdvancedFilters={hasAdvancedFilters}
              onTestTypeChange={setTestTypeFilter}
              onReviewStatusChange={setReviewStatusFilter}
              onVerificationStatusChange={setVerificationStatusFilter}
              onPageReset={() => {}}
            />

            {/* Desktop Filters - Page Filters */}
            <ReviewPageFilters
              testTypeFilter={filters.testType}
              reviewStatusFilter={filters.reviewStatus}
              verificationStatusFilter={filters.verificationStatus}
              onTestTypeChange={setTestTypeFilter}
              onReviewStatusChange={setReviewStatusFilter}
              onVerificationStatusChange={setVerificationStatusFilter}
              onPageReset={() => {}}
            />

            {/* Mobile Filters - Legacy Filters */}
            <ReviewFiltersMobile
              isOpen={mobileFiltersOpen}
              onClose={() => setMobileFiltersOpen((prev) => !prev)}
              reviewStatusFilter={reviewStatusFilterOld}
              assignedToFilter={assignedToFilter}
              jiraIdFilter={jiraIdFilter}
              productNameFilter={productNameFilter}
              hasAdvancedFilters={anyFiltersActive}
              onReviewStatusChange={setReviewStatusFilterOld}
              onAssignedToChange={setAssignedToFilter}
              onJiraIdChange={setJiraIdFilter}
              onProductNameChange={setProductNameFilter}
              onPageReset={() => {}}
            />

            {/* Desktop Filters - Legacy Filters */}
            <ReviewFilters
              reviewStatusFilter={reviewStatusFilterOld}
              assignedToFilter={assignedToFilter}
              jiraIdFilter={jiraIdFilter}
              productNameFilter={productNameFilter}
              onReviewStatusChange={setReviewStatusFilterOld}
              onAssignedToChange={setAssignedToFilter}
              onJiraIdChange={setJiraIdFilter}
              onProductNameChange={setProductNameFilter}
              onPageReset={() => {}}
            />
          </div>

          {/* Results Count */}
          {anyFiltersActive && (
            <div className="text-sm text-[#64748B]">
              Showing {filteredTests.length} of {tests.length} tests and{" "}
              {filteredPhotos.length} of {photos.length} photos
            </div>
          )}

          {/* Pending Tests Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Pending Tests</h3>
            {pendingTests.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No pending tests
                {anyFiltersActive ? " matching your filters." : "."}
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingTests.map((t) => (
                  <div
                    key={t.id}
                    className="border border-border rounded-xl p-5 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        Gyra ID: #{t.jira_id} | Test ID: {t.id}
                      </div>

                      <div className="text-lg font-semibold mb-3">
                        {t.product_name}
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
            {reviewedTests.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No reviewed tests
                {anyFiltersActive ? " matching your filters." : "."}
              </div>
            ) : (
              <div className="grid gap-4">
                {reviewedTests.map((t) => (
                  <div
                    key={t.id}
                    className="border border-border rounded-xl p-5 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        Gyra ID: #{t.jira_id} | Test ID: {t.id}
                      </div>

                      <div className="text-lg font-semibold mb-3">
                        {t.product_name}
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
                        {t.review_status === "rejected"
                          ? "✗ Rejected"
                          : "Reject"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photos Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Photo Verifications</h3>
            {filteredPhotos.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No photo verifications
                {anyFiltersActive ? " matching your filters." : "."}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="border border-border rounded-xl p-5 flex flex-col"
                  >
                    {/* Image and Info Section */}
                    <div className="flex gap-4 mb-4">
                      {/* Thumbnail Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={`/api/v1/photos/${photo.id}/image`}
                          alt={`Photo #${photo.id}`}
                          className="w-32 h-32 object-cover rounded-lg border border-border"
                        />
                      </div>

                      {/* Info Section */}
                      <div className="flex-1">
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
                        <div className="text-sm mb-3">
                          <span
                            className={`font-semibold px-3 py-1 rounded-full text-sm ${
                              photo.verification_status === "approved"
                                ? "bg-green-100 text-green-800"
                                : photo.verification_status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {photo.verification_status === "approved"
                              ? "✓ Approved"
                              : photo.verification_status === "rejected"
                                ? "✗ Rejected"
                                : "Pending"}
                          </span>
                        </div>
                        {photo.description && (
                          <div className="text-sm mb-3">
                            <span className="font-semibold">Description:</span>{" "}
                            {photo.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Verification Status Bar */}
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
      </section>
    </div>
  );
}
