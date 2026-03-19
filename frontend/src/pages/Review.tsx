import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { AppDataContext } from "@/components/layout/AppShell";
import { request } from "@/lib/api/http";
import { getStoredRole, getStoredUsername } from "@/lib/auth";
import type { ReviewStatus } from "@/lib/db-constants";
import { fetchGallery } from "@/lib/api/gallery";
import { updateVerificationStatus } from "@/lib/api/defects";
import type { GalleryPhoto } from "@/lib/api/gallery";
import { useReviewFilters } from "@/hooks";
import { ReviewContent } from "./ReviewContent";

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
  const [pendingTestsOpen, setPendingTestsOpen] = useState(true);
  const [reviewedTestsOpen, setReviewedTestsOpen] = useState(true);
  const [photoVerificationsOpen, setPhotoVerificationsOpen] = useState(true);

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
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [jiraIdFilter, setJiraIdFilter] = useState("");
  const [productNameFilter, setProductNameFilter] = useState("");

  const username = useMemo(() => getStoredUsername(), []);
  const role = getStoredRole?.() ?? "user";

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "X-User": username || "system",
      "X-Role": role || "user",
    }),
    [role, username],
  );

  // Redirect non-reviewers away from the Review page
  useEffect(() => {
    const currentRole = getStoredRole?.() ?? "user";
    if (currentRole !== "reviewer") {
      navigate("/tests");
    }
  }, [navigate]);

  // Listen for role changes from other tabs/windows via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === null || e.key.includes("role")) {
        const currentRole = getStoredRole?.() ?? "user";
        if (currentRole !== "reviewer") {
          navigate("/tests");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [navigate]);

  // Periodic check for role changes within the same tab
  useEffect(() => {
    let lastRole = getStoredRole?.() ?? "user";
    const interval = setInterval(() => {
      const currentRole = getStoredRole?.() ?? "user";
      if (currentRole !== lastRole) {
        lastRole = currentRole;
        if (currentRole !== "reviewer") {
          navigate("/tests");
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [navigate]);

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

  const handleVerificationStatusChange = (value: string) => {
    setVerificationStatusFilter(value);
    setPendingTestsOpen(false);
    setReviewedTestsOpen(false);
    setPhotoVerificationsOpen(true);
  };

  const handleReviewStatusChange = (value: string) => {
    setReviewStatusFilter(value);

    if (value === "pending") {
      setPendingTestsOpen(true);
      setReviewedTestsOpen(false);
    } else if (value === "" || value === "all") {
      setPendingTestsOpen(true);
      setReviewedTestsOpen(true);
    } else {
      setPendingTestsOpen(false);
      setReviewedTestsOpen(true);
    }

    setPhotoVerificationsOpen(false);
  };

  // Separate tests by review status for display
  const pendingTests = filteredTests.filter(
    (t) => t.review_status === "pending",
  );
  const reviewedTests = filteredTests.filter(
    (t) => t.review_status !== "pending",
  );

  return (
    <ReviewContent
      loading={loading}
      error={error}
      mobileFiltersOpen={mobileFiltersOpen}
      pendingTestsOpen={pendingTestsOpen}
      reviewedTestsOpen={reviewedTestsOpen}
      photoVerificationsOpen={photoVerificationsOpen}
      pendingTests={pendingTests}
      reviewedTests={reviewedTests}
      filteredPhotos={filteredPhotos}
      tests={tests}
      photos={photos}
      anyFiltersActive={anyFiltersActive}
      testTypeFilter={filters.testType}
      reviewStatusFilter={filters.reviewStatus}
      verificationStatusFilter={filters.verificationStatus}
      assignedToFilter={assignedToFilter}
      jiraIdFilter={jiraIdFilter}
      productNameFilter={productNameFilter}
      hasAdvancedFilters={hasAdvancedFilters}
      onMobileFiltersToggle={() => setMobileFiltersOpen((prev) => !prev)}
      onPendingTestsToggle={() => setPendingTestsOpen(!pendingTestsOpen)}
      onReviewedTestsToggle={() => setReviewedTestsOpen(!reviewedTestsOpen)}
      onPhotoVerificationsToggle={() =>
        setPhotoVerificationsOpen(!photoVerificationsOpen)
      }
      onTestTypeChange={setTestTypeFilter}
      onReviewStatusChange={handleReviewStatusChange}
      onVerificationStatusChange={handleVerificationStatusChange}
      onAssignedToChange={setAssignedToFilter}
      onJiraIdChange={setJiraIdFilter}
      onProductNameChange={setProductNameFilter}
      onApproveTest={approveTest}
      onRejectTest={rejectTest}
      onApprovePhoto={approvePhoto}
      onRejectPhoto={rejectPhoto}
      onNavigateToTest={(id) => navigate(`/tests/${id}`)}
      onNavigateToPhoto={(id) => navigate(`/photos/${id}`)}
    />
  );
}
