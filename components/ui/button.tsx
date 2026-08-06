import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: "bg-pink-500 text-white hover:bg-pink-600",
  secondary: "border border-[#efd7e3] bg-white/72 text-[#5f3b52] hover:bg-pink-50",
  outline: "border border-[#efd7e3] bg-transparent text-[#5f3b52] hover:bg-pink-50",
  ghost: "bg-transparent text-[#76556b] hover:bg-pink-50",
  destructive: "bg-red-50 text-red-700 hover:bg-red-100",
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
