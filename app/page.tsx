
"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store/store";

import { useNotes } from "@/lib/useNotes";
import { CATEGORIES, Category } from "@/lib/types";

import SearchBar from "@/components/SearchBar";
import CategoryFilter from "@/components/CategoryFilter";
import NoteCard from "@/components/NoteCard";
import EmptyState from "@/components/EmptyState";
import FAB from "@/components/FAB";
import SettingsLink from "@/components/SettingsLink";

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
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border p-3">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-border font-semibold text-ink">
                {(user.name || user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {user.name || "User"}
              </p>

              <p className="truncate text-xs text-ink-faint">
                {user.email}
              </p>

              <p className="truncate font-mono text-[10px] text-ink-faint">
                ID: {user.userId}
              </p>
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

      {/* Content */}
      <main className="flex-1 px-4 pt-4">
        {!isLoaded ? null : !hasAnyNotes ? (
          <EmptyState
            heading="No notes yet"
            subtext="Tap the plus button to write your first note."
            variant="blank"
          />
        ) : !hasResults ? (
          <EmptyState
            heading="Nothing found"
            subtext={
              query
                ? `No notes match "${query}". Try a different search.`
                : "No notes in this category yet."
            }
            variant="search"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((note, i) => (
              <li key={note.id}>
                <NoteCard
                  note={note}
                  onTogglePin={togglePin}
                  index={i}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      {isLoaded && <FAB />}
    </div>
  );
}
