import { PHOTO_VALIDATION } from "@/lib/validation/photo-validation";

export const CONTROL_CLASS =
  "rounded-2xl border-2 border-slate-300 bg-white font-medium text-slate-900 shadow-none transition-all focus-visible:border-[#2563eb] focus-visible:ring-4 focus-visible:ring-[#2563eb]/20";

export const MUTED_CONTROL_CLASS =
  "rounded-2xl border-2 border-slate-200 bg-slate-100 font-medium text-slate-500 shadow-none";

export const TEXTAREA_CLASS =
  "min-h-40 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-base font-medium text-slate-900 placeholder:text-slate-500 transition-all focus:outline-none focus-visible:border-[#2563eb] focus-visible:ring-4 focus-visible:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:opacity-60 md:text-lg";

export const MAX_PHOTOS_PER_UPLOAD = PHOTO_VALIDATION.MAX_PHOTOS_PER_UPLOAD;

export const SUBMIT_BUTTON_CLASS =
  "h-16 w-full rounded-3xl bg-[#2563eb] text-lg font-bold text-white shadow-[0_14px_28px_rgba(37,99,235,0.35)] hover:bg-[#1d4ed8] focus-visible:ring-4 focus-visible:ring-[#2563eb]/30 focus-visible:ring-offset-0";
