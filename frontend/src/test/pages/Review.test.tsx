import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import { Review } from "@/pages/Review";
import * as auth from "@/lib/auth";

// Mock the auth functions
vi.mock("@/lib/auth", () => ({
  isReviewer: vi.fn(() => true),
  getStoredRole: vi.fn(() => "reviewer"),
  getStoredUsername: vi.fn(() => "test_user"),
}));

// Mock API requests
vi.mock("@/lib/api/http", () => ({
  request: vi.fn().mockResolvedValue({
    items: [],
  }),
}));

// Mock gallery API
vi.mock("@/lib/api/gallery", () => ({
  fetchGallery: vi.fn().mockResolvedValue([]),
}));

// Mock defects API
vi.mock("@/lib/api/defects", () => ({
  updateVerificationStatus: vi.fn().mockResolvedValue({}),
}));

// Mock custom hooks
vi.mock("@/hooks", () => ({
  useReviewFilters: vi.fn(() => ({
    filters: {},
    hasActiveFilters: false,
    hasAdvancedFilters: false,
    setTestTypeFilter: vi.fn(),
    setVerificationStatusFilter: vi.fn(),
    setReviewStatusFilter: vi.fn(),
  })),
}));

// Mock components
vi.mock("@/components/review", () => ({
  ReviewFilters: ({
    onReviewStatusChange,
    onVerificationStatusChange,
  }: {
    onReviewStatusChange: (value: string) => void;
    onVerificationStatusChange: (value: string) => void;
  }) => (
    <div data-testid="review-filters">
      Review Filters
      <button
        data-testid="review-status-filter-trigger"
        onClick={() => onReviewStatusChange("approved")}
      >
        Set Review Approved
      </button>
      <button
        data-testid="review-status-pending-trigger"
        onClick={() => onReviewStatusChange("pending")}
      >
        Set Review Pending
      </button>
      <button
        data-testid="review-status-all-trigger"
        onClick={() => onReviewStatusChange("")}
      >
        Set Review All
      </button>
      <button
        data-testid="verification-filter-trigger"
        onClick={() => onVerificationStatusChange("approved")}
      >
        Set Verification Approved
      </button>
    </div>
  ),
  ReviewFiltersMobile: () => (
    <div data-testid="review-filters-mobile">Review Filters Mobile</div>
  ),
}));

const MockTestPage = () => <div data-testid="tests-page">Tests Page</div>;

// Mock outlet context
const mockOutletContext = {
  updateTest: vi.fn(),
};

describe("Review Page - Routing & Redirection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderReviewRoute = (initialPath = "/review") =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<Outlet context={mockOutletContext} />}>
            <Route path="review" element={<Review />} />
            <Route path="tests" element={<MockTestPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

  it("renders for authorized reviewers", async () => {
    vi.mocked(auth.getStoredRole).mockReturnValue("reviewer");

    renderReviewRoute();

    await waitFor(() => {
      expect(screen.getByTestId("review-filters")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("tests-page")).not.toBeInTheDocument();
  });

  it("redirects non-reviewers to tests page", async () => {
    vi.mocked(auth.getStoredRole).mockReturnValue("user");

    renderReviewRoute();

    await waitFor(() => {
      expect(screen.getByTestId("tests-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("review-filters")).not.toBeInTheDocument();
  });

  it("keeps users on tests page when route is already tests", async () => {
    vi.mocked(auth.getStoredRole).mockReturnValue("user");

    renderReviewRoute("/tests");

    await waitFor(() => {
      expect(screen.getByTestId("tests-page")).toBeInTheDocument();
    });
  });

  it("renders route wrapper without crashing", async () => {
    vi.mocked(auth.getStoredRole).mockReturnValue("reviewer");

    const { container } = renderReviewRoute();

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it("closes test sections and keeps photo verifications open when verification status changes", async () => {
    vi.mocked(auth.getStoredRole).mockReturnValue("reviewer");

    renderReviewRoute();

    await waitFor(() => {
      expect(screen.getByTestId("review-filters")).toBeInTheDocument();
    });

    expect(screen.getByText("No pending tests.")).toBeInTheDocument();
    expect(screen.getByText("No reviewed tests.")).toBeInTheDocument();
    expect(screen.getByText("No photo verifications.")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("verification-filter-trigger"));

    expect(screen.queryByText("No pending tests.")).not.toBeInTheDocument();
    expect(screen.queryByText("No reviewed tests.")).not.toBeInTheDocument();
    expect(screen.getByText("No photo verifications.")).toBeInTheDocument();
  });

  it("closes pending and photo sections and keeps reviewed tests open when review status changes", async () => {
    vi.mocked(auth.getStoredRole).mockReturnValue("reviewer");

    renderReviewRoute();

    await waitFor(() => {
      expect(screen.getByTestId("review-filters")).toBeInTheDocument();
    });

    expect(screen.getByText("No pending tests.")).toBeInTheDocument();
    expect(screen.getByText("No reviewed tests.")).toBeInTheDocument();
    expect(screen.getByText("No photo verifications.")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("review-status-filter-trigger"));

    expect(screen.queryByText("No pending tests.")).not.toBeInTheDocument();
    expect(screen.getByText("No reviewed tests.")).toBeInTheDocument();
    expect(
      screen.queryByText("No photo verifications."),
    ).not.toBeInTheDocument();
  });

  it("opens only pending tests and closes reviewed/photo when review status is pending", async () => {
    vi.mocked(auth.getStoredRole).mockReturnValue("reviewer");

    renderReviewRoute();

    await waitFor(() => {
      expect(screen.getByTestId("review-filters")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("review-status-pending-trigger"));

    expect(screen.getByText("No pending tests.")).toBeInTheDocument();
    expect(screen.queryByText("No reviewed tests.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No photo verifications."),
    ).not.toBeInTheDocument();
  });

  it("opens both pending and reviewed tests when review status is all", async () => {
    vi.mocked(auth.getStoredRole).mockReturnValue("reviewer");

    renderReviewRoute();

    await waitFor(() => {
      expect(screen.getByTestId("review-filters")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("review-status-all-trigger"));

    expect(screen.getByText("No pending tests.")).toBeInTheDocument();
    expect(screen.getByText("No reviewed tests.")).toBeInTheDocument();
    expect(
      screen.queryByText("No photo verifications."),
    ).not.toBeInTheDocument();
  });
});
