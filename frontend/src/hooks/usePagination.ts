import { useState, useMemo } from "react";

export interface PaginationResult<T> {
  paginatedItems: T[];
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
}

/**
 * Generic pagination hook for any array of items
 * @param items - Array of items to paginate
 * @param pageSize - Number of items per page
 */
export function usePagination<T>(
  items: T[],
  pageSize: number
): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 if current page exceeds total pages
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const goToNextPage = () => {
    setCurrentPage((prev: number) => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev: number) => Math.max(prev - 1, 1));
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  return {
    paginatedItems,
    currentPage: safePage,
    totalPages,
    setCurrentPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
  };
}
