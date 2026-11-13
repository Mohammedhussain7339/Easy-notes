"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Pin, Trash2, RefreshCw } from "lucide-react";
import type { RootState } from "@/app/store/store";
import { Note } from "@/lib/types";
import { categoryStyle, excerpt, formatRelativeDate } from "@/lib/utils";

// ============================================
// CONFIG
// ============================================

const NOTES_API =
  "https://e0c8z9dp7l.execute-api.ap-south-1.amazonaws.com/dev";

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  note?: T;
  notes?: Note[];
  deleted?: { id: string };
}

// ============================================
// API REQUEST - ALL OPERATIONS USE POST
// ============================================

async function notesRequest<T = unknown>(
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  const response = await fetch(NOTES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });

  const responseText = await response.text();

  let result: any;

  try {
    result = JSON.parse(responseText);

    // Handle nested Lambda / API Gateway response
    if (result?.body !== undefined) {
      result =
        typeof result.body === "string"
          ? JSON.parse(result.body)
          : result.body;
    }
  } catch {
    console.error("Invalid API response:", responseText);
    throw new Error("Invalid server response.");
  }

  console.log("Notes API response:", result);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Notes request failed.");
  }

  return result as ApiResponse<T>;
}

// ============================================
// GET / PIN / DELETE  (all via API)
// ============================================

// Backend field names can differ (noteId / created_at etc.),
// so normalise every note before it reaches the UI.
function normalizeNote(raw: any): Note {
  const createdAt = raw?.createdAt ?? raw?.created_at ?? "";

  return {
    ...raw,
    id: String(raw?.id ?? raw?.noteId ?? raw?.note_id ?? ""),
    title: raw?.title ?? "",
    content: raw?.content ?? "",
    category: raw?.category ?? "Other",
    pinned: Boolean(raw?.pinned),
    createdAt,
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? createdAt,
  } as Note;
}

export async function getNotes(userId: string): Promise<Note[]> {
  const result: any = await notesRequest({
    action: "get",
    userId,
  });

  const list = result.notes ?? result.data ?? result.items ?? [];

  return (Array.isArray(list) ? list : [])
    .map(normalizeNote)
    .filter((note) => note.id);
}

async function setNotePinned(
  userId: string,
  note: Note,
  pinned: boolean,
): Promise<void> {
  await notesRequest({
    action: "update",
    userId,
    id: note.id,
    title: note.title,
    content: note.content,
    category: note.category,
    pinned,
  });
}

async function removeNote(userId: string, id: string): Promise<void> {
  await notesRequest({
    action: "delete",
    userId,
    id,
  });
}

// ============================================
// NOTE CARD
// ============================================

interface NoteCardProps {
  note: Note;
  onTogglePin: (id: string) => void;
  onDelete?: (id: string) => void;
  disabled?: boolean;
  index: number;
}

export default function NoteCard({
  note,
  onTogglePin,
  onDelete,
  disabled = false,
  index,
}: NoteCardProps) {
  const style = categoryStyle(note.category);
  const preview = excerpt(note.content, 108);

  return (
    <Link
      href={`/note/${note.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className={`group relative block animate-fade-in overflow-hidden rounded-card border-theme border-border bg-surface shadow-card backdrop-blur-theme transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99] ${
        disabled ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {/* Category spine tab */}
      <span
        aria-hidden
        className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${style.tab}`}
      />

      {/* Dog-ear fold, appears on hover as a tactile paper detail */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-7 w-7 -translate-y-1 translate-x-1 bg-surface-solid opacity-0 shadow-card transition-all duration-200 [clip-path:polygon(100%_0,0_0,100%_100%)] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
      />

      <div className="flex items-start gap-3 py-4 pl-6 pr-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`text-[10.5px] font-mono font-medium uppercase tracking-wider ${style.text}`}
            >
              {note.category}
            </span>
            {note.pinned && (
              <Pin
                className="h-3 w-3 fill-current text-ink-faint"
                strokeWidth={0}
              />
            )}
          </div>
          <h3 className="truncate font-display text-[17px] font-semibold leading-snug text-ink">
            {note.title || "Untitled note"}
          </h3>
          <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-ink-soft">
            {preview || "No additional text"}
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
            {formatRelativeDate(note.updatedAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            type="button"
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
            aria-pressed={note.pinned}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTogglePin(note.id);
            }}
            className={`tap-scale flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150 ${
              note.pinned
                ? "text-accent"
                : "text-ink-faint opacity-0 hover:bg-accent-soft hover:text-accent focus-visible:opacity-100 group-hover:opacity-100"
            }`}
          >
            <Pin
              className="h-[18px] w-[18px]"
              strokeWidth={2}
              fill={note.pinned ? "currentColor" : "none"}
            />
          </button>

          {onDelete && (
            <button
              type="button"
              aria-label="Delete note"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="tap-scale flex h-9 w-9 items-center justify-center rounded-full text-ink-faint opacity-0 transition-colors duration-150 hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

// ============================================
// LOADING SKELETON (matches card shape)
// ============================================

function NoteCardSkeleton({ index }: { index: number }) {
  return (
    <div
      aria-hidden
      style={{ animationDelay: `${index * 60}ms` }}
      className="relative animate-pulse overflow-hidden rounded-card border-theme border-border bg-surface py-4 pl-6 pr-4 shadow-card"
    >
      <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-accent-soft" />
      <div className="h-2.5 w-16 rounded-full bg-accent-soft" />
      <div className="mt-3 h-4 w-2/3 rounded-full bg-accent-soft" />
      <div className="mt-3 h-3 w-full rounded-full bg-accent-soft" />
      <div className="mt-2 h-3 w-4/5 rounded-full bg-accent-soft" />
      <div className="mt-4 h-2.5 w-20 rounded-full bg-accent-soft" />
    </div>
  );
}

// ============================================
// NOTES LIST - all GET related logic lives here
// ============================================

export function NotesList() {
  const user = useSelector((state: RootState) => state.user);
  const userId = user?.userId;

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // ----------------------------------------
  // GET
  // ----------------------------------------

  const fetchNotes = useCallback(
    async (silent = false) => {
      // Notes only come from the API, so a logged-in user is required
      if (!userId) {
        setNotes([]);
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      setError("");

      try {
        setNotes(await getNotes(String(userId)));
      } catch (err) {
        console.error("Fetch notes error:", err);

        setError(
          err instanceof Error ? err.message : "Unable to fetch notes.",
        );
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Re-fetch quietly when coming back to the tab / page
  // (e.g. after editing a note on /note/:id)
  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") fetchNotes(true);
    }

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [fetchNotes]);

  // Pinned first, then most recently edited
  const sortedNotes = useMemo(
    () =>
      [...notes].sort(
        (a, b) =>
          Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
          (Date.parse(b.updatedAt || "") || 0) -
            (Date.parse(a.updatedAt || "") || 0),
      ),
    [notes],
  );

  // ----------------------------------------
  // PIN (optimistic, rolls back on failure)
  // ----------------------------------------

  async function handleTogglePin(id: string) {
    if (busyId || !userId) return;

    const note = notes.find((n) => n.id === id);

    if (!note) return;

    const nextPinned = !note.pinned;
    const previous = notes;

    setBusyId(id);
    setActionError("");
    setNotes((list) =>
      list.map((n) => (n.id === id ? { ...n, pinned: nextPinned } : n)),
    );

    try {
      await setNotePinned(String(userId), note, nextPinned);
    } catch (err) {
      console.error("Pin note error:", err);

      setNotes(previous);
      setActionError(
        err instanceof Error
          ? err.message
          : "Couldn't update the note. Try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  // ----------------------------------------
  // DELETE (optimistic, rolls back on failure)
  // ----------------------------------------

  async function handleDelete(id: string) {
    if (busyId || !userId) return;

    const note = notes.find((n) => n.id === id);

    if (!note) return;

    const confirmed = window.confirm(
      `Delete "${note.title || "Untitled note"}"? This can't be undone.`,
    );

    if (!confirmed) return;

    const previous = notes;

    setBusyId(id);
    setActionError("");
    setNotes((list) => list.filter((n) => n.id !== id));

    try {
      await removeNote(String(userId), id);
    } catch (err) {
      console.error("Delete note error:", err);

      setNotes(previous);
      setActionError(
        err instanceof Error
          ? err.message
          : "Couldn't delete the note. Try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  // ----------------------------------------
  // STATES
  // ----------------------------------------

  if (!userId) {
    return (
      <div className="rounded-card border-theme border-border bg-surface px-6 py-12 text-center shadow-card">
        <p className="font-display text-[17px] font-semibold text-ink">
          Sign in to see your notes
        </p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
          Your notes are saved to your account and load from there.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-3" role="status" aria-label="Loading notes">
        {[0, 1, 2, 3].map((i) => (
          <NoteCardSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border-theme border-border bg-surface px-6 py-10 text-center shadow-card">
        <p className="font-display text-[17px] font-semibold text-ink">
          Couldn't load your notes
        </p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
          {error}
        </p>

        <button
          type="button"
          onClick={() => fetchNotes()}
          className="tap-scale mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-canvas"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {/* Action error */}
      {actionError && (
        <p
          role="alert"
          className="rounded-card bg-red-50 px-4 py-2.5 text-[13px] text-red-600"
        >
          {actionError}
        </p>
      )}

      {/* Empty */}
      {sortedNotes.length === 0 && (
        <div className="rounded-card border-theme border-border bg-surface px-6 py-12 text-center shadow-card">
          <p className="font-display text-[17px] font-semibold text-ink">
            No notes yet
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
            Notes you write will show up here.
          </p>
        </div>
      )}

      {/* Notes */}
      {sortedNotes.map((note, index) => (
        <NoteCard
          key={note.id}
          note={note}
          index={index}
          disabled={busyId === note.id}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}