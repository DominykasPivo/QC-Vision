import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ring-offset-[var(--bg)]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)]",
        secondary:
          "border-transparent bg-[var(--bg-secondary)] text-[var(--text)] hover:bg-[var(--border)]",
        destructive:
          "border-transparent bg-[var(--error)] text-white shadow-sm hover:opacity-90",
        outline: "border-[var(--border)] text-[var(--text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
