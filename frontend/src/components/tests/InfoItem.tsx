import { cn } from "@/lib/utils";

export function InfoItem({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "text-2xl font-semibold leading-tight text-slate-900 break-words",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}
