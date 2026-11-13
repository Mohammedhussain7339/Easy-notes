"use client";

import { Check } from "lucide-react";
import type { ThemeMeta } from "@/lib/themes";

interface ThemePreviewCardProps {
  theme: ThemeMeta;
  isActive: boolean;
  onSelect: () => void;
}

export default function ThemePreviewCard({
  theme,
  isActive,
  onSelect,
}: ThemePreviewCardProps) {
  const Icon = theme.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={`tap-scale group relative flex flex-col overflow-hidden rounded-card border-theme text-left ${
        isActive ? "border-accent" : "border-border hover:border-accent"
      } bg-surface shadow-card`}
      style={isActive ? { boxShadow: "0 0 0 2px var(--color-accent)" } : undefined}
    >
      {isActive && (
        <span className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent shadow-card">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}

      {/* Live mini preview — scoped to this theme's own CSS variables via a
          nested data-theme attribute, so it's a real (tiny) rendering of the
          theme rather than a hand-picked swatch. */}
      <div
        data-theme={theme.id}
        className="relative flex h-32 flex-col justify-between overflow-hidden p-3"
        style={{
          backgroundColor: "var(--color-canvas)",
          backgroundImage: "var(--bg-image)",
          backgroundSize: "var(--bg-size)",
        }}
      >
        {/* mini search bar */}
        <div
          className="h-6 w-[70%] rounded-control"
          style={{
            backgroundColor: "var(--color-surface-solid)",
            border: "var(--border-width) solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        />

        <div className="flex-1" />

        {/* mini note card */}
        <div
          className="flex items-center gap-2 rounded-card p-2"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "var(--border-width) solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
            backdropFilter: "blur(var(--surface-blur))",
            WebkitBackdropFilter: "blur(var(--surface-blur))",
          }}
        >
          <span
            className="h-6 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--cat-work)" }}
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div
              className="h-2 w-3/4 rounded-full"
              style={{ backgroundColor: "var(--color-ink)" }}
            />
            <div
              className="h-1.5 w-1/2 rounded-full opacity-60"
              style={{ backgroundColor: "var(--color-ink-soft)" }}
            />
          </div>
        </div>

        {/* mini FAB */}
        <span
          className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full"
          style={{
            backgroundColor: "var(--color-accent)",
            boxShadow: "var(--shadow-fab)",
          }}
        >
          <span
            className="block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "var(--color-on-accent)" }}
          />
        </span>
      </div>

      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <Icon className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={2} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink">
            {theme.name}
          </p>
          <p className="truncate text-[12px] text-ink-faint">
            {theme.tagline}
          </p>
        </div>
      </div>
    </button>
  );
}
