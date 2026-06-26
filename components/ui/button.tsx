import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: "bg-emerald-400 text-[#0b141a] hover:bg-emerald-300",
  secondary: "bg-white/10 text-white hover:bg-white/15",
  outline: "border border-white/10 bg-transparent text-white hover:bg-white/5",
  ghost: "bg-transparent text-white/75 hover:bg-white/5",
  destructive: "bg-red-500/15 text-red-200 hover:bg-red-500/25",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
