import {
  CircleDot,
  FolderOpen,
  Clock3,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import type { TestStatus } from "@/lib/db-constants";

export const PAGE_SIZE = 21;

export const STATUS_CONFIG: Record<
  TestStatus,
  { accent: string; badge: string; icon: LucideIcon }
> = {
  open: {
    accent: "bg-slate-400",
    badge: "border-slate-300 bg-slate-100 text-slate-700",
    icon: FolderOpen,
  },
  in_progress: {
    accent: "bg-sky-500",
    badge: "border-sky-300 bg-sky-100 text-sky-700",
    icon: CircleDot,
  },
  pending: {
    accent: "bg-orange-500",
    badge: "border-orange-300 bg-orange-100 text-orange-800",
    icon: Clock3,
  },
  finalized: {
    accent: "bg-emerald-500",
    badge: "border-emerald-300 bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
};

export const STATUS_FILTER_CHIP_CLASS: Record<TestStatus, string> = {
  open: "border-slate-300 bg-slate-100 text-slate-700",
  in_progress: "border-sky-300 bg-sky-100 text-sky-700",
  pending: "border-orange-300 bg-orange-100 text-orange-800",
  finalized: "border-emerald-300 bg-emerald-100 text-emerald-800",
};

export const SORT_OPTIONS = [
  { value: "created_desc", label: "Newest First" },
  { value: "created_asc", label: "Oldest First" },
  { value: "deadline_asc", label: "Deadline: Soonest" },
  { value: "deadline_desc", label: "Deadline: Latest" },
  { value: "status", label: "Status" },
  { value: "id_asc", label: "ID: A-Z" },
  { value: "id_desc", label: "ID: Z-A" },
] as const;

export const DATE_RANGE_OPTIONS = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due Today" },
  { value: "this_week", label: "Due This Week" },
  { value: "this_month", label: "Due This Month" },
  { value: "next_month", label: "Due Next Month" },
] as const;

export const DEFAULT_SORT = "created_desc";
