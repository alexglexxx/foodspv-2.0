"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type AppButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type AppButtonSize = "sm" | "md" | "lg";

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

const variantClasses: Record<AppButtonVariant, string> = {
  primary:
    "border border-orange-700 bg-orange-700 text-white shadow-md shadow-orange-900/10 hover:bg-orange-600 active:bg-orange-800",
  secondary:
    "border border-stone-300 bg-white text-stone-800 shadow-sm hover:bg-stone-50 active:bg-stone-100",
  danger:
    "border border-rose-200 bg-rose-50 text-rose-700 shadow-sm hover:bg-rose-100 active:bg-rose-200",
  ghost:
    "border border-transparent bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200",
};

const sizeClasses: Record<AppButtonSize, string> = {
  sm: "min-h-[44px] px-3 text-sm",
  md: "min-h-[44px] px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export function AppButton({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  disabled,
  children,
  className = "",
  type = "button",
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full font-extrabold",
        "select-none touch-manipulation [-webkit-tap-highlight-color:transparent]",
        "transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f1e8]",
        "active:scale-[0.97] active:translate-y-[1px] active:shadow-inner",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {loading ? (
        <>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          {loadingText ?? "Procesando..."}
        </>
      ) : (
        children
      )}
    </button>
  );
}
