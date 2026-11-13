"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "ghost" | "solid" | "danger";
}

const VARIANT_CLASSES: Record<string, string> = {
  ghost: "bg-transparent text-ink-soft hover:bg-accent-soft hover:text-accent",
  solid: "bg-accent text-on-accent hover:bg-accent-hover",
  danger: "bg-transparent text-cat-journal hover:bg-cat-journal/10",
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = "ghost", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={`tap-scale inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

export default IconButton;
