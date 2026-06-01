"use client";

import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
  badge?: string;
}

export function CollapsibleSection({
  title,
  description,
  isOpen,
  onToggle,
  children,
  disabled = false,
  badge,
}: CollapsibleSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={isOpen}
        className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-orange-50/60 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-row sm:items-center sm:justify-between"
      >
        <span>
          <span className="block text-lg font-black text-stone-950">
            {title}
          </span>
          {description ? (
            <span className="mt-1 block text-sm font-semibold leading-6 text-stone-500">
              {description}
            </span>
          ) : null}
        </span>

        <span className="flex items-center gap-3">
          {badge ? (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold text-orange-800 ring-1 ring-orange-200">
              {badge}
            </span>
          ) : null}
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-xl font-black text-orange-700">
            {isOpen ? "-" : "+"}
          </span>
        </span>
      </button>

      {isOpen && !disabled ? (
        <div className="border-t border-stone-100 px-5 py-5">{children}</div>
      ) : null}
    </section>
  );
}
