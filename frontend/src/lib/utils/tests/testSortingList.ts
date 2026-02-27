import type { Test } from "@/lib/db-constants";

export function sortTests(tests: Test[], sortBy: string): Test[] {
  const sorted = [...tests];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case "deadline_asc": {
        const dateA = a.deadlineAt
          ? new Date(a.deadlineAt).getTime()
          : Infinity;
        const dateB = b.deadlineAt
          ? new Date(b.deadlineAt).getTime()
          : Infinity;
        return dateA - dateB;
      }
      case "deadline_desc": {
        const dateA = a.deadlineAt
          ? new Date(a.deadlineAt).getTime()
          : -Infinity;
        const dateB = b.deadlineAt
          ? new Date(b.deadlineAt).getTime()
          : -Infinity;
        return dateB - dateA;
      }
      case "created_asc": {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      case "created_desc": {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      case "status":
        return a.status.localeCompare(b.status);
      case "id_asc":
        return String(a.id).localeCompare(String(b.id));
      case "id_desc":
        return String(b.id).localeCompare(String(a.id));
      default:
        return 0;
    }
  });

  return sorted;
}
