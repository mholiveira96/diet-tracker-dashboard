import * as React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
