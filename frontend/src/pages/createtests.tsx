import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { AppDataContext } from "../components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  TestCard,
  TestSearchBar,
  TestFilters,
  TestFiltersMobile,
} from "@/components/tests";
import { EmptyState } from "@/components/common";
import {
  useTestSearch,
  useTestFilters,
  usePagination,
  useFilteredTests,
} from "@/hooks";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { SortOption } from "@/lib/utils/tests";

export function CreateTestsScreen() {
  const { tests, testsLoaded } = useOutletContext<AppDataContext>();

  // Custom hooks for state management
  const { searchInput, searchQuery, setSearchInput, setSearchQuery, handleSearchSubmit } =
    useTestSearch();

  const {
    filters,
    setStatusFilter,
    setTestTypeFilter,
    setAssignedToFilter,
    setDateRangeFilter,
  } = useTestFilters();

  const [sortBy, setSortBy] = useState<SortOption>("created_desc");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Apply filters and sorting
  const filteredTests = useFilteredTests(tests, {
    searchQuery,
    statusFilter: filters.status,
    testTypeFilter: filters.testType,
    assignedToFilter: filters.assignedTo,
    dateRangeFilter: filters.dateRange,
    sortBy,
  });

  // Pagination
  const { paginatedItems, currentPage, totalPages, setCurrentPage } =
    usePagination(filteredTests, DEFAULT_PAGE_SIZE);

  // UI state
  const showEmptyState = testsLoaded && tests.length === 0;
  const showNoMatches =
    testsLoaded && tests.length > 0 && filteredTests.length === 0;

  const hasAdvancedFilters = Boolean(
    filters.testType ||
      filters.assignedTo ||
      filters.dateRange ||
      sortBy !== "created_desc"
  );

  const handlePageReset = () => setCurrentPage(1);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (value.trim() === "") {
      setSearchQuery("");
      handlePageReset();
    }
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    handlePageReset();
  };

  const wrappedSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    handleSearchSubmit(event);
    handlePageReset();
  };

  return (
    <div className="min-h-[calc(100dvh-var(--header-height)-var(--nav-height))] px-3 py-4 pb-24 md:px-4 md:py-5 md:pb-8">
      <section className="w-full rounded-[28px] border-2 border-slate-200 bg-white px-5 py-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-8 md:py-8 xl:px-[52px] xl:py-[48px]">
        <div className="flex flex-col gap-5 xl:gap-8">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold leading-tight tracking-[-0.02em] text-[#0F172A] md:text-4xl xl:text-[42px]">
                Tests
              </h1>
              <p className="text-base font-medium text-[#64748B] md:text-base xl:text-[20px]">
                View and manage quality control tests
              </p>
            </div>
            <Button
              asChild
              className="h-14 w-full rounded-full bg-[#2563EB] px-6 text-base font-semibold text-white hover:bg-[#1D4ED8] lg:h-14 lg:w-[230px] lg:text-[18px]"
            >
              <Link to="/create">New Test</Link>
            </Button>
          </div>

          {/* Search Bar */}
          <TestSearchBar
            searchInput={searchInput}
            onSearchInputChange={handleSearchInputChange}
            onSearchSubmit={wrappedSearchSubmit}
            onClearSearch={handleSearchClear}
          />

          {/* Filters */}
          <div className="space-y-3">
            <TestFiltersMobile
              isOpen={mobileFiltersOpen}
              onClose={() => setMobileFiltersOpen((prev) => !prev)}
              statusFilter={filters.status}
              testTypeFilter={filters.testType}
              assignedToFilter={filters.assignedTo}
              dateRangeFilter={filters.dateRange}
              sortBy={sortBy}
              hasAdvancedFilters={hasAdvancedFilters}
              onStatusChange={setStatusFilter}
              onTestTypeChange={setTestTypeFilter}
              onAssignedToChange={setAssignedToFilter}
              onDateRangeChange={setDateRangeFilter}
              onSortChange={setSortBy}
              onPageReset={handlePageReset}
            />

            <TestFilters
              statusFilter={filters.status}
              testTypeFilter={filters.testType}
              assignedToFilter={filters.assignedTo}
              dateRangeFilter={filters.dateRange}
              sortBy={sortBy}
              onStatusChange={setStatusFilter}
              onTestTypeChange={setTestTypeFilter}
              onAssignedToChange={setAssignedToFilter}
              onDateRangeChange={setDateRangeFilter}
              onSortChange={setSortBy}
              onPageReset={handlePageReset}
            />
          </div>

          {/* Results Header */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-bold text-[#0F172A] md:text-[32px] xl:text-[28px]">
              Recent Tests
            </h2>
            <p className="text-base font-medium text-[#64748B] md:text-base xl:text-[16px]">
              {filteredTests.length} total tests
            </p>
          </div>

          {/* Test Cards or Empty State */}
          {showEmptyState ? (
            <EmptyState
              title="No tests yet"
              description="Create your first quality control test to get started."
              action={
                <Button
                  asChild
                  className="h-12 rounded-xl px-6 text-base font-semibold"
                >
                  <Link to="/create">Create Test</Link>
                </Button>
              }
            />
          ) : showNoMatches ? (
            <EmptyState
              title="No tests match your search or filters."
              variant="error"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {paginatedItems.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
