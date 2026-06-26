import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[96px] w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
