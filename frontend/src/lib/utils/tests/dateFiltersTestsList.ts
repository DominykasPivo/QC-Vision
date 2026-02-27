export function isInDateRange(
  deadlineAt: string | null,
  dateRangeFilter: string,
): boolean {
  if (!dateRangeFilter || !deadlineAt) return true;

  const deadline = new Date(deadlineAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (dateRangeFilter) {
    case "overdue":
      return deadline < today;

    case "today": {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return deadline >= today && deadline < tomorrow;
    }

    case "this_week": {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return deadline >= today && deadline < weekEnd;
    }

    case "this_month": {
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return deadline >= today && deadline <= monthEnd;
    }

    case "next_month": {
      const nextMonthStart = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1,
      );
      const nextMonthEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 2,
        0,
      );
      return deadline >= nextMonthStart && deadline <= nextMonthEnd;
    }

    default:
      return true;
  }
}
