import { type FormEvent, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AppDataContext } from "../components/layout/AppShell";
import { Pagination } from "@/components/ui/pagination";
import {
  TestCardList,
  TestsSearchBar,
  TestsListFilters,
  TestsListFiltersMobile,
  TestsActiveFilterChips,
  TestsEmptyState,
  TestsNoMatches,
} from "@/components/tests";
import {
  useTestSearch,
  useTestsListFilters,
  usePagination,
  useFilteredTestsList,
} from "@/hooks";
import { PAGE_SIZE } from "@/lib/constants";

export function TestsList() {
  const { tests, testsLoaded } = useOutletContext<AppDataContext>();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Search management
  const {
    searchInput,
    searchQuery,
    setSearchInput,
    handleSearchSubmit,
    clearSearch,
  } = useTestSearch();

  // Filter management
  const {
    filters,
    hasActiveFilters,
    clearAllFilters,
    setStatusFilter,
    setTestTypeFilter,
    setAssignedToFilter,
    setDateRangeFilter,
    setSortBy,
  } = useTestsListFilters();

  // Apply filtering and sorting
  const filteredTests = useFilteredTestsList(tests, searchQuery, filters);

  // Pagination
  const { currentPage, setCurrentPage } = usePagination(
    filteredTests,
    PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / PAGE_SIZE));

  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTests.slice(start, start + PAGE_SIZE);
  }, [filteredTests, currentPage]);

  const showEmptyState = testsLoaded && tests.length === 0;
  const showNoMatches =
    testsLoaded && tests.length > 0 && filteredTests.length === 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSearchSubmit(event);
    setCurrentPage(1);
  };

  const handlePageReset = () => setCurrentPage(1);

  const handleClearAll = () => {
    setSearchInput("");
    clearSearch();
    clearAllFilters();
    setCurrentPage(1);
  };

  const hasAnyFilters = Boolean(searchQuery) || hasActiveFilters;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-6 pt-3 sm:space-y-7 sm:px-3">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Tests
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          View and manage quality control tests
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TestsSearchBar
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearchSubmit={handleSubmit}
          onOpenFilters={() => setMobileFiltersOpen(true)}
          onClearSearch={() => {
            clearSearch();
            setCurrentPage(1);
          }}
        />

        <div className="hidden md:block">
          <TestsListFilters
            statusFilter={filters.status}
            testTypeFilter={filters.testType}
            assignedToFilter={filters.assignedTo}
            dateRangeFilter={filters.dateRange}
            sortBy={filters.sortBy}
            onStatusChange={setStatusFilter}
            onTestTypeChange={setTestTypeFilter}
            onAssignedToChange={setAssignedToFilter}
            onDateRangeChange={setDateRangeFilter}
            onSortByChange={setSortBy}
            onPageReset={handlePageReset}
          />
        </div>
      </form>

      <TestsListFiltersMobile
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        statusFilter={filters.status}
        testTypeFilter={filters.testType}
        assignedToFilter={filters.assignedTo}
        dateRangeFilter={filters.dateRange}
        sortBy={filters.sortBy}
        onStatusChange={setStatusFilter}
        onTestTypeChange={setTestTypeFilter}
        onAssignedToChange={setAssignedToFilter}
        onDateRangeChange={setDateRangeFilter}
        onSortByChange={setSortBy}
        onPageReset={handlePageReset}
      />

      {hasAnyFilters && (
        <TestsActiveFilterChips
          searchQuery={searchQuery}
          statusFilter={filters.status}
          testTypeFilter={filters.testType}
          assignedToFilter={filters.assignedTo}
          dateRangeFilter={filters.dateRange}
          sortBy={filters.sortBy}
          onClearAll={handleClearAll}
        />
      )}

      {showEmptyState ? (
        <TestsEmptyState />
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Recent Tests
            </h2>

            {showNoMatches ? (
              <TestsNoMatches />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {paginatedTests.map((test) => (
                  <TestCardList key={test.id} test={test} />
                ))}
              </div>
            )}
          </section>

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
