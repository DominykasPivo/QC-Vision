/**
 * Test-related constants for UI and filtering
 */

import type { TestStatus } from "@/lib/db-constants";

/**
 * Status display labels
 */
export const STATUS_LABELS: Record<TestStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  pending: "Pending",
  finalized: "Finished",
};

/**
 * Status text colors for UI
 */
export const STATUS_TEXT_COLORS: Record<TestStatus, string> = {
  open: "text-[#0F172A]",
  in_progress: "text-[#2563EB]",
  pending: "text-[#D97706]",
  finalized: "text-[#16A34A]",
};

/**
 * Default page size for pagination
 */
export const DEFAULT_PAGE_SIZE = 12;
