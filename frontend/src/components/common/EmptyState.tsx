import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "error";
}

export function EmptyState({
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  const titleColor = variant === "error" ? "text-red-600" : "text-slate-900";

  return (
    <div className="rounded-[18px] border border-[#D5DFEC] bg-white p-8 text-center">
      <h3 className={`text-2xl font-bold ${titleColor}`}>{title}</h3>
      {description && (
        <p className="mt-2 text-base text-slate-600">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
