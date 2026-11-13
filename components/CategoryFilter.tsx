"use client";

import { Category } from "@/lib/types";
import { categoryChipStyle, categoryStyle } from "@/lib/utils";

interface CategoryFilterProps {
  categories: Category[];
  active: Category | "All";
  onChange: (value: Category | "All") => void;
  counts: Partial<Record<Category | "All", number>>;
}

export default function CategoryFilter({
  categories,
  active,
  onChange,
  counts,
}: CategoryFilterProps) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <button
        type="button"
        onClick={() => onChange("All")}
        className={`tap-scale flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border-theme px-4 py-2 text-[13.5px] font-medium ${
          active === "All"
            ? "border-transparent bg-accent text-on-accent"
            : "border-border bg-surface-solid text-ink-soft hover:bg-accent-soft hover:text-accent"
        }`}
      >
        All
        {typeof counts.All === "number" && (
          <span
            className={`text-[11px] tabular-nums ${
              active === "All" ? "opacity-80" : "text-ink-faint"
            }`}
          >
            {counts.All}
          </span>
        )}
      </button>

      {categories.map((cat) => {
        const isActive = active === cat;
        const style = categoryStyle(cat);
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            style={categoryChipStyle(cat, isActive)}
            className={`tap-scale flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border-theme px-4 py-2 text-[13.5px] font-medium ${
              isActive
                ? "border-transparent"
                : "border-border bg-surface-solid text-ink-soft hover:bg-accent-soft hover:text-accent"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${style.tab}`} aria-hidden />
            {cat}
            {typeof counts[cat] === "number" && (
              <span className="text-[11px] tabular-nums opacity-80">
                {counts[cat]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
