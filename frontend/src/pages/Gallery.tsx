import { useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import {
  GalleryCard,
  GalleryFilters,
  GalleryFiltersMobile,
  ActiveFilterChips,
} from "@/components/gallery";
import {
  useGalleryData,
  useGalleryFilters,
  useCategories,
  usePagination,
} from "@/hooks";
import { PAGE_SIZE } from "@/lib/constants";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";

export function Gallery() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Fetch categories
  const { categories } = useCategories();

  // Filter management
  const {
    filters,
    apiFilters,
    hasActiveFilters,
    hasAdvancedFilters,
    clearAllFilters,
    setSeverityFilter,
    setCategoryFilter,
    setTestTypeFilter,
    setTestStatusFilter,
    setHasDefectsFilter,
    setVerificationFilter,
  } = useGalleryFilters();

  // Pagination
  const { currentPage, setCurrentPage } = usePagination([], PAGE_SIZE);

  // Fetch gallery data
  const { photos, loading, totalPages } = useGalleryData(
    apiFilters,
    currentPage,
    PAGE_SIZE,
  );

  const handlePageReset = () => setCurrentPage(1);

  const handleClearFilters = () => {
    clearAllFilters();
    handlePageReset();
  };

  return (
    <div
      className={cn(
        spacing.pageContainer,
        spacing.pageStack,
        "max-w-none pb-24 md:pb-8",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold leading-tight tracking-[-0.02em] text-slate-900 md:text-4xl">
            Gallery
          </h2>
          <p className="text-base font-medium text-slate-500 md:text-lg">
            Browse all test photos
          </p>
        </div>
      </div>

      {/* Mobile Filters */}
      <GalleryFiltersMobile
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen((prev) => !prev)}
        severityFilter={filters.severity}
        categoryFilter={filters.category}
        testTypeFilter={filters.testType}
        testStatusFilter={filters.testStatus}
        hasDefectsFilter={filters.hasDefects}
        verificationFilter={filters.verification}
        hasAdvancedFilters={hasAdvancedFilters}
        categories={categories}
        onSeverityChange={setSeverityFilter}
        onCategoryChange={setCategoryFilter}
        onTestTypeChange={setTestTypeFilter}
        onTestStatusChange={setTestStatusFilter}
        onHasDefectsChange={setHasDefectsFilter}
        onVerificationChange={setVerificationFilter}
        onPageReset={handlePageReset}
      />

      {/* Desktop Filters */}
      <GalleryFilters
        severityFilter={filters.severity}
        categoryFilter={filters.category}
        testTypeFilter={filters.testType}
        testStatusFilter={filters.testStatus}
        hasDefectsFilter={filters.hasDefects}
        verificationFilter={filters.verification}
        categories={categories}
        onSeverityChange={setSeverityFilter}
        onCategoryChange={setCategoryFilter}
        onTestTypeChange={setTestTypeFilter}
        onTestStatusChange={setTestStatusFilter}
        onHasDefectsChange={setHasDefectsFilter}
        onVerificationChange={setVerificationFilter}
        onPageReset={handlePageReset}
      />

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <ActiveFilterChips
          severityFilter={filters.severity}
          categoryFilter={filters.category}
          testTypeFilter={filters.testType}
          testStatusFilter={filters.testStatus}
          hasDefectsFilter={filters.hasDefects}
          verificationFilter={filters.verification}
          categories={categories}
          onClearAll={handleClearFilters}
        />
      )}

      {/* Gallery Content */}
      {loading ? (
        <p className="mt-6 text-base font-medium text-slate-500">
          Loading photos...
        </p>
      ) : photos.length === 0 ? (
        <p className="mt-6 text-base font-medium text-slate-500">
          {hasActiveFilters
            ? "No photos match the selected filters."
            : "No photos yet. Upload photos when creating a test."}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {photos.map((photo) => (
              <GalleryCard key={photo.id} photo={photo} />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
