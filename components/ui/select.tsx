import * as React from "react";
import { cn } from "../../lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

export { Select };
