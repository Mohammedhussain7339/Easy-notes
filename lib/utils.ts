import type { CSSProperties } from "react";
import { Category } from "./types";

export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function excerpt(text: string, maxLength = 96): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}\u2026`;
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const diffHr = Math.round(diffMs / 3600000);
  const diffDay = Math.round(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function formatFullDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Category colors are themed too (see the --cat-* variables in globals.css),
 * so this returns Tailwind classes pointing at those CSS variables rather
 * than fixed colors. `varName` is exposed for the rare spot (chip "tint"
 * background) that needs the raw CSS variable for a color-mix() expression.
 */
interface CategoryStyle {
  tab: string; // left spine tab color (background)
  text: string; // label / icon color
  varName: string; // raw CSS variable, e.g. "--cat-work"
}

const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  Personal: { tab: "bg-cat-personal", text: "text-cat-personal", varName: "--cat-personal" },
  Work: { tab: "bg-cat-work", text: "text-cat-work", varName: "--cat-work" },
  Ideas: { tab: "bg-cat-ideas", text: "text-cat-ideas", varName: "--cat-ideas" },
  Journal: { tab: "bg-cat-journal", text: "text-cat-journal", varName: "--cat-journal" },
  "To-do": { tab: "bg-cat-todo", text: "text-cat-todo", varName: "--cat-todo" },
  Other: { tab: "bg-cat-other", text: "text-cat-other", varName: "--cat-other" },
};

export function categoryStyle(category: Category): CategoryStyle {
  return CATEGORY_STYLES[category];
}

/** Inline style for a category "chip": a soft tint of the category color as
 * background, with the category color itself as text/border. Using
 * color-mix() keeps this legible across every theme without per-theme,
 * per-category contrast pairs. */
export function categoryChipStyle(
  category: Category,
  active: boolean
): CSSProperties {
  const { varName } = categoryStyle(category);
  const catColor = `var(${varName})`;
  if (!active) return {};
  return {
    backgroundColor: `color-mix(in srgb, ${catColor} 16%, var(--color-surface))`,
    borderColor: catColor,
    color: catColor,
  };
}
