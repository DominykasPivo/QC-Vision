import { ChevronDown, Search } from "lucide-react";
import { ReviewFilters, ReviewFiltersMobile } from "@/components/review";
import type { GalleryPhoto } from "@/lib/api/gallery";

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
  review_status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
};

interface ReviewContentProps {
  loading: boolean;
  error: string | null;
  mobileFiltersOpen: boolean;
  pendingTestsOpen: boolean;
  reviewedTestsOpen: boolean;
  photoVerificationsOpen: boolean;
  pendingTests: TestResponse[];
  reviewedTests: TestResponse[];
  filteredPhotos: GalleryPhoto[];
  tests: TestResponse[];
  photos: GalleryPhoto[];
  anyFiltersActive: boolean;
  testTypeFilter: string;
  reviewStatusFilter: string;
  verificationStatusFilter: string;
  assignedToFilter: string;
  jiraIdFilter: string;
  productNameFilter: string;
  hasAdvancedFilters: boolean;
  onMobileFiltersToggle: () => void;
  onPendingTestsToggle: () => void;
  onReviewedTestsToggle: () => void;
  onPhotoVerificationsToggle: () => void;
  onTestTypeChange: (value: string) => void;
  onReviewStatusChange: (value: string) => void;
  onVerificationStatusChange: (value: string) => void;
  onAssignedToChange: (value: string) => void;
  onJiraIdChange: (value: string) => void;
  onProductNameChange: (value: string) => void;
  onApproveTest: (id: number) => Promise<void>;
  onRejectTest: (id: number) => Promise<void>;
  onApprovePhoto: (id: number) => Promise<void>;
  onRejectPhoto: (id: number) => Promise<void>;
  onNavigateToTest: (id: number) => void;
  onNavigateToPhoto: (id: number) => void;
}

export function ReviewContent({
  loading,
  error,
  mobileFiltersOpen,
  pendingTestsOpen,
  reviewedTestsOpen,
  photoVerificationsOpen,
  pendingTests,
  reviewedTests,
  filteredPhotos,
  tests,
  photos,
  anyFiltersActive,
  testTypeFilter,
  reviewStatusFilter,
  verificationStatusFilter,
  assignedToFilter,
  jiraIdFilter,
  productNameFilter,
  hasAdvancedFilters,
  onMobileFiltersToggle,
  onPendingTestsToggle,
  onReviewedTestsToggle,
  onPhotoVerificationsToggle,
  onTestTypeChange,
  onReviewStatusChange,
  onVerificationStatusChange,
  onAssignedToChange,
  onJiraIdChange,
  onProductNameChange,
  onApproveTest,
  onRejectTest,
  onApprovePhoto,
  onRejectPhoto,
  onNavigateToTest,
  onNavigateToPhoto,
}: ReviewContentProps) {
  if (loading) return <div className="p-6">Loading review queue…</div>;
  if (error) return <div className="p-6">Error: {error}</div>;

  return (
    <div className="min-h-[calc(100dvh-var(--header-height)-var(--nav-height))] pb-24 md:pb-8">
      <section className="w-full bg-white px-5 py-6 md:px-8 md:py-8 xl:px-[52px] xl:py-[48px]">
        <div className="flex flex-col gap-5 xl:gap-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Search className="w-8 h-8 text-[#0F172A]" />
              <h1 className="text-3xl font-bold leading-tight tracking-[-0.02em] text-[#0F172A] md:text-4xl xl:text-[42px]">
                Review
              </h1>
            </div>
            <p className="text-base font-medium text-[#64748B] md:text-base xl:text-[16px]">
              Review and manage quality control tests and photos
            </p>
          </div>

          {/* Search Bar and Filters */}
          <div className="space-y-3">
            {/* Mobile Filters */}
            <ReviewFiltersMobile
              isOpen={mobileFiltersOpen}
              onClose={onMobileFiltersToggle}
              testTypeFilter={testTypeFilter}
              reviewStatusFilter={reviewStatusFilter}
              verificationStatusFilter={verificationStatusFilter}
              assignedToFilter={assignedToFilter}
              jiraIdFilter={jiraIdFilter}
              productNameFilter={productNameFilter}
              hasAdvancedFilters={hasAdvancedFilters}
              onTestTypeChange={onTestTypeChange}
              onReviewStatusChange={onReviewStatusChange}
              onVerificationStatusChange={onVerificationStatusChange}
              onAssignedToChange={onAssignedToChange}
              onJiraIdChange={onJiraIdChange}
              onProductNameChange={onProductNameChange}
              onPageReset={() => {}}
            />

            {/* Desktop Filters */}
            <ReviewFilters
              testTypeFilter={testTypeFilter}
              reviewStatusFilter={reviewStatusFilter}
              verificationStatusFilter={verificationStatusFilter}
              assignedToFilter={assignedToFilter}
              jiraIdFilter={jiraIdFilter}
              productNameFilter={productNameFilter}
              onTestTypeChange={onTestTypeChange}
              onReviewStatusChange={onReviewStatusChange}
              onVerificationStatusChange={onVerificationStatusChange}
              onAssignedToChange={onAssignedToChange}
              onJiraIdChange={onJiraIdChange}
              onProductNameChange={onProductNameChange}
              onPageReset={() => {}}
            />
          </div>

          {/* Results Count */}
          {anyFiltersActive && (
            <div className="text-sm text-[#64748B]">
              Showing {pendingTests.length + reviewedTests.length} of{" "}
              {tests.length} tests and {filteredPhotos.length} of{" "}
              {photos.length} photos
            </div>
          )}

          {/* Pending Tests Section */}
          <div className="mt-2">
            <button
              type="button"
              onClick={onPendingTestsToggle}
              className="flex items-center gap-2 mb-1 hover:opacity-80 transition"
            >
              <ChevronDown
                className={`w-5 h-5 text-[#0F172A] transition-transform ${
                  pendingTestsOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
              <h3 className="text-lg font-semibold">Pending Tests</h3>
            </button>
            {pendingTestsOpen &&
              (pendingTests.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No pending tests
                  {anyFiltersActive ? " matching your filters." : "."}
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingTests.map((t) => (
                    <TestCard
                      key={t.id}
                      test={t}
                      onNavigate={() => onNavigateToTest(t.id)}
                      onApprove={() => onApproveTest(t.id)}
                      onReject={() => onRejectTest(t.id)}
                    />
                  ))}
                </div>
              ))}
          </div>

          {/* Reviewed Tests Section */}
          <div className="mt-2">
            <button
              type="button"
              onClick={onReviewedTestsToggle}
              className="flex items-center gap-2 mb-1 hover:opacity-80 transition"
            >
              <ChevronDown
                className={`w-5 h-5 text-[#0F172A] transition-transform ${
                  reviewedTestsOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
              <h3 className="text-lg font-semibold">Reviewed Tests</h3>
            </button>
            {reviewedTestsOpen &&
              (reviewedTests.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No reviewed tests
                  {anyFiltersActive ? " matching your filters." : "."}
                </div>
              ) : (
                <div className="grid gap-4">
                  {reviewedTests.map((t) => (
                    <TestCard
                      key={t.id}
                      test={t}
                      onNavigate={() => onNavigateToTest(t.id)}
                      onApprove={() => onApproveTest(t.id)}
                      onReject={() => onRejectTest(t.id)}
                      isReviewed
                    />
                  ))}
                </div>
              ))}
          </div>

          {/* Photos Section */}
          <div className="mt-2">
            <button
              type="button"
              onClick={onPhotoVerificationsToggle}
              className="flex items-center gap-2 mb-1 hover:opacity-80 transition"
            >
              <ChevronDown
                className={`w-5 h-5 text-[#0F172A] transition-transform ${
                  photoVerificationsOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
              <h3 className="text-lg font-semibold">Photo Verifications</h3>
            </button>
            {photoVerificationsOpen &&
              (filteredPhotos.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No photo verifications
                  {anyFiltersActive ? " matching your filters." : "."}
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredPhotos.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      onNavigate={() => onNavigateToPhoto(photo.id)}
                      onApprove={() => onApprovePhoto(photo.id)}
                      onReject={() => onRejectPhoto(photo.id)}
                    />
                  ))}
                </div>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function TestCard({
  test,
  onNavigate,
  onApprove,
  onReject,
  isReviewed = false,
}: {
  test: TestResponse;
  onNavigate: () => void;
  onApprove: () => void;
  onReject: () => void;
  isReviewed?: boolean;
}) {
  return (
    <div
      className="border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4 cursor-pointer hover:bg-slate-50 transition"
      onClick={onNavigate}
    >
      <div>
        <div className="text-sm text-muted-foreground mb-1">
          Gyra ID: #{test.jira_id} | Test ID: {test.id}
        </div>

        <div className="text-lg font-semibold mb-3">{test.product_name}</div>

        <div className="flex flex-wrap gap-4">
          <div>
            <span className="font-semibold">Type:</span> {test.test_type}
          </div>
          <div>
            <span className="font-semibold">Status:</span> {test.status}
          </div>
          {isReviewed && (
            <div>
              <span
                className={`font-semibold px-3 py-1 rounded-full text-sm ${
                  test.review_status === "approved"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {test.review_status === "approved"
                  ? "✓ Approved"
                  : "✗ Rejected"}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mt-2">
          <div>
            <span className="font-semibold">Requester:</span> {test.requester}
          </div>
          <div>
            <span className="font-semibold">Assigned:</span>{" "}
            {test.assigned_to ?? "—"}
          </div>
          {isReviewed && (
            <div>
              <span className="font-semibold">Reviewed by:</span>{" "}
              {test.reviewed_by ?? "—"}
            </div>
          )}
        </div>

        <div className="mt-2">
          <span className="font-semibold">Description:</span>{" "}
          {test.description ?? "—"}
        </div>
      </div>

      <div className="flex md:flex-col gap-2 md:flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onApprove();
          }}
          className={`flex-1 md:flex-none px-4 py-2 rounded-lg border font-semibold ${
            isReviewed && test.review_status === "approved"
              ? "border-green-600 bg-green-50 text-green-800 hover:bg-green-100"
              : "border-green-600 bg-white text-green-600 hover:bg-green-50"
          }`}
        >
          {isReviewed && test.review_status === "approved"
            ? "✓ Approved"
            : "Approve"}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReject();
          }}
          className={`flex-1 md:flex-none px-4 py-2 rounded-lg border font-semibold ${
            isReviewed && test.review_status === "rejected"
              ? "border-red-600 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-red-600 bg-white text-red-600 hover:bg-red-50"
          }`}
        >
          {isReviewed && test.review_status === "rejected"
            ? "✗ Rejected"
            : "Reject"}
        </button>
      </div>
    </div>
  );
}

function PhotoCard({
  photo,
  onNavigate,
  onApprove,
  onReject,
}: {
  photo: GalleryPhoto;
  onNavigate: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div
      className="border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4 cursor-pointer hover:bg-slate-50 transition"
      onClick={onNavigate}
    >
      {/* Image and Info Section */}
      <div className="flex flex-col md:flex-row gap-4 flex-1">
        {/* Thumbnail Image */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className="flex-shrink-0 hover:opacity-80 transition cursor-pointer"
        >
          <img
            src={`/api/v1/photos/${photo.id}/image`}
            alt={`Photo #${photo.id}`}
            className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 object-cover rounded-lg border border-border"
          />
        </button>

        {/* Info Section */}
        <div className="flex-1">
          <div className="text-sm text-muted-foreground mb-1">
            Photo #{photo.id}
          </div>
          <div className="text-sm mb-2">
            <span className="font-semibold">Test ID:</span> {photo.test_id}
          </div>
          <div className="text-sm mb-2">
            <span className="font-semibold">Type:</span> {photo.test_type}
          </div>
          <div className="text-sm mb-2">
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
            <div className="text-sm">
              <span className="font-semibold">Description:</span>{" "}
              {photo.description}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex md:flex-col gap-2 md:flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onApprove();
          }}
          className={`flex-1 md:flex-none px-4 py-2 rounded-lg border font-semibold whitespace-nowrap ${
            photo.verification_status === "approved"
              ? "border-green-600 bg-green-50 text-green-800 hover:bg-green-100"
              : "border-green-600 bg-white text-green-600 hover:bg-green-50"
          }`}
        >
          {photo.verification_status === "approved" ? "✓ Approved" : "Approve"}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReject();
          }}
          className={`flex-1 md:flex-none px-4 py-2 rounded-lg border font-semibold whitespace-nowrap ${
            photo.verification_status === "rejected"
              ? "border-red-600 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-red-600 bg-white text-red-600 hover:bg-red-50"
          }`}
        >
          {photo.verification_status === "rejected" ? "✗ Rejected" : "Reject"}
        </button>
      </div>
    </div>
  );
}
