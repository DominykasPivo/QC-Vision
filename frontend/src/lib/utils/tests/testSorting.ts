/**
 * Sorting comparators for test lists
 */

export type SortOption =
  | "created_desc"
  | "created_asc"
  | "deadline_asc"
  | "deadline_desc"
  | "status"
  | "id_asc"
  | "id_desc";

export interface SortableTest {
  id: string | number;
  status: string;
  createdAt: string | null;
  deadlineAt: string | null;
}

/**
 * Sorts tests based on deadline (earliest first)
 */
export function sortByDeadlineAsc(a: SortableTest, b: SortableTest): number {
  const dateA = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Infinity;
  const dateB = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Infinity;
  return dateA - dateB;
}

/**
 * Sorts tests based on deadline (latest first)
 */
export function sortByDeadlineDesc(a: SortableTest, b: SortableTest): number {
  const dateA = a.deadlineAt ? new Date(a.deadlineAt).getTime() : -Infinity;
  const dateB = b.deadlineAt ? new Date(b.deadlineAt).getTime() : -Infinity;
  return dateB - dateA;
}

/**
 * Sorts tests based on creation date (oldest first)
 */
export function sortByCreatedAsc(a: SortableTest, b: SortableTest): number {
  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return dateA - dateB;
}

/**
 * Sorts tests based on creation date (newest first)
 */
export function sortByCreatedDesc(a: SortableTest, b: SortableTest): number {
  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return dateB - dateA;
}

/**
 * Sorts tests alphabetically by status
 */
export function sortByStatus(a: SortableTest, b: SortableTest): number {
  return a.status.localeCompare(b.status);
}

/**
 * Sorts tests by ID (ascending)
 */
export function sortByIdAsc(a: SortableTest, b: SortableTest): number {
  return String(a.id).localeCompare(String(b.id));
}

/**
 * Sorts tests by ID (descending)
 */
export function sortByIdDesc(a: SortableTest, b: SortableTest): number {
  return String(b.id).localeCompare(String(a.id));
}

/**
 * Main sorting function that applies the selected sort option
 */
export function sortTests<T extends SortableTest>(
  tests: T[],
  sortBy: SortOption,
): T[] {
  const sorted = [...tests];

  switch (sortBy) {
    case "deadline_asc":
      return sorted.sort(sortByDeadlineAsc);
    case "deadline_desc":
      return sorted.sort(sortByDeadlineDesc);
    case "created_asc":
      return sorted.sort(sortByCreatedAsc);
    case "created_desc":
      return sorted.sort(sortByCreatedDesc);
    case "status":
      return sorted.sort(sortByStatus);
    case "id_asc":
      return sorted.sort(sortByIdAsc);
    case "id_desc":
      return sorted.sort(sortByIdDesc);
    default:
      return sorted;
  }
}
