
"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store/store";
import { ArrowLeft, Check, Trash2, UserRound } from "lucide-react";
import { useNotes } from "@/lib/useNotes";
import { CATEGORIES, Category } from "@/lib/types";

import SearchBar from "@/components/SearchBar";
import CategoryFilter from "@/components/CategoryFilter";
import NoteCard from "@/components/NoteCard";
import EmptyState from "@/components/EmptyState";
import FAB from "@/components/FAB";
import SettingsLink from "@/components/SettingsLink";
import { NotesList } from "@/components/NoteCard";
export default function HomePage() {
  const { notes, isLoaded, togglePin } = useNotes();

  // Get authenticated user data from Redux.
  const user = useSelector((state: RootState) => state.user);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">(
    "All"
  );

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return notes;

    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [notes, query]);

  const counts = useMemo(() => {
    const map: Partial<Record<Category | "All", number>> = {
      All: searched.length,
    };

    for (const cat of CATEGORIES) {
      map[cat] = searched.filter((n) => n.category === cat).length;
    }

    return map;
  }, [searched]);

  const visible = useMemo(() => {
    const filtered =
      activeCategory === "All"
        ? searched
        : searched.filter((n) => n.category === activeCategory);

    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

      return (
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime()
      );
    });
  }, [searched, activeCategory]);

  const hasAnyNotes = notes.length > 0;
  const hasResults = visible.length > 0;

  return (
    <div className="flex min-h-dvh flex-col pb-28">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b-theme border-border bg-canvas px-5 pb-4 pt-6 backdrop-blur-theme">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-[26px] font-semibold leading-none text-ink">
              Marginalia
            </h1>

            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
              {hasAnyNotes
                ? `${notes.length} ${
                    notes.length === 1 ? "note" : "notes"
                  }`
                : "A quiet place to keep notes"}
            </p>
          </div>

          <SettingsLink />
        </div>

        {/* Redux User Information */}
{user?.userId && (
  <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-accent-soft/40 p-3.5 transition-colors">
    {/* Profile Avatar */}
    <div className="relative shrink-0">
      {user.image ? (
        <img
          src={user.image}
          alt={user.name || "User"}
          className="h-12 w-12 rounded-full border border-border object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-canvas text-ink-soft">
          <UserRound className="h-6 w-6" strokeWidth={1.7} />
        </div>
      )}

      {/* Online Indicator */}
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-canvas bg-green-500" />
    </div>

    {/* User Details */}
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-ink">
        {user.name || "Welcome"}
      </p>

      <p className="mt-0.5 truncate text-xs text-ink-soft">
        Personal workspace
      </p>
    </div>

    {/* Account Status */}
    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      <span className="text-[11px] font-medium text-ink-soft">
        Signed in
      </span>
    </div>
  </div>
)}

        <SearchBar value={query} onChange={setQuery} />

        {hasAnyNotes && (
          <div className="mt-3">
            <CategoryFilter
              categories={CATEGORIES}
              active={activeCategory}
              onChange={setActiveCategory}
              counts={counts}
            />
          </div>
        )}
      </header>
            <NotesList />



      {isLoaded && <FAB />}
    </div>
  );
}
