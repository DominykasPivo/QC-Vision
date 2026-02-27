/**
 * Gallery-related constants for UI and filtering
 */

export const PAGE_SIZE = 20;

export const NO_DEFECT_BORDER = "border-emerald-400 border";

export const VERIFICATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/**
 * Verification status dot colors and labels
 */
export const VERIFICATION_DOT: Record<string, { bg: string; title: string }> = {
  approved: { bg: "bg-emerald-500", title: "Approved" },
  rejected: { bg: "bg-red-500", title: "Rejected" },
  pending: { bg: "bg-slate-400", title: "Pending review" },
};

/**
 * Severity border and badge styles
 */
export const SEVERITY_STYLES: Record<
  string,
  { border: string; badge: string }
> = {
  critical: {
    border: "border-red-600 border-2",
    badge: "bg-red-200 text-red-900",
  },
  high: {
    border: "border-red-400 border-2",
    badge: "bg-red-100 text-red-800",
  },
  medium: {
    border: "border-orange-400 border-2",
    badge: "bg-orange-100 text-orange-800",
  },
  low: {
    border: "border-yellow-400 border-2",
    badge: "bg-yellow-100 text-yellow-800",
  },
};

/**
 * Shared select trigger classes
 */
export const DESKTOP_TRIGGER_CLS =
  "h-14 rounded-full border border-slate-200 bg-white !pl-6 !pr-5 text-base text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-500 [&>svg]:opacity-100";

export const MOBILE_TRIGGER_CLS =
  "h-11 rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155]";
