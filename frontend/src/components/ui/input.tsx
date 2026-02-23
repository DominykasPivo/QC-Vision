import * as React from "react";

import { cn } from "@/lib/utils";

const densityClass = {
  compact: "h-9 px-2.5 text-sm",
  comfortable: "h-11 px-3 text-sm",
  spacious: "h-12 px-4 text-base",
} as const;

type InputDensity = keyof typeof densityClass;

export interface InputProps extends React.ComponentProps<"input"> {
  density?: InputDensity;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, density = "comfortable", type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          densityClass[density],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
