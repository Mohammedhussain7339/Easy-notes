
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store/store";
import { ArrowLeft, Check, Trash2 } from "lucide-react";

type Category =
  | "Personal"
  | "Work"
  | "Ideas"
  | "Journal"
  | "To-do"
  | "Other";

interface Note {
  id: string;
  userId?: string;
  title: string;
  content: string;
  category: Category;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NoteDraft {
  title: string;
  content: string;
  category: Category;
}

interface Props {
  mode: "new" | "edit";
  initialNote?: Note;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  note?: T;
  notes?: Note[];
  deleted?: { id: string };
}

const CATEGORIES: Category[] = [
  "Personal",
  "Work",
  "Ideas",
  "Journal",
  "To-do",
  "Other",
];

const NOTES_API =
  "https://e0c8z9dp7l.execute-api.ap-south-1.amazonaws.com/dev";

const STORAGE_KEY = "Easy-notes";

// ============================================
// API REQUEST - ALL OPERATIONS USE POST
// ============================================

async function notesRequest<T = unknown>(
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  console.log("Notes API request:", data);

  const response = await fetch(NOTES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    cache: "no-store",
  });

  const responseText = await response.text();

  let result: any;

  try {
    result = JSON.parse(responseText);

    // Handle nested Lambda/API Gateway response
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
    throw new Error(
      result?.message || "Notes request failed.",
    );
  }

  return result as ApiResponse<T>;
}

// ============================================
// LOCAL STORAGE FUNCTIONS
// ============================================

function getLocalNotes(): Note[] {
  try {
    const storedNotes = localStorage.getItem(STORAGE_KEY);

    if (!storedNotes) return [];

    const parsed = JSON.parse(storedNotes);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Get local notes error:", error);
    return [];
  }
}

function saveLocalNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ============================================
// GET NOTES - AWS API / LOCAL STORAGE
// ============================================

async function getNotes(userId?: string): Promise<Note[]> {
  if (userId) {
    const result = await notesRequest<Note[]>({
      action: "get",
      userId: String(userId),
    });

    return result.notes ?? [];
  }

  return getLocalNotes();
}

// ============================================
// CREATE NOTE
// ============================================

async function createNote(
  userId: string | undefined,
  draft: NoteDraft,
): Promise<void> {
  if (userId) {
    await notesRequest<Note>({
      action: "create",
      userId: String(userId),
      ...draft,
      pinned: false,
    });

    return;
  }

  const notes = getLocalNotes();
  const now = new Date().toISOString();

  const newNote: Note = {
    id: crypto.randomUUID(),
    ...draft,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };

  saveLocalNotes([newNote, ...notes]);
}

// ============================================
// UPDATE NOTE
// ============================================

async function updateNote(
  userId: string | undefined,
  id: string,
  draft: NoteDraft,
  pinned: boolean,
): Promise<void> {
  if (userId) {
    await notesRequest<Note>({
      action: "update",
      userId: String(userId),
      id,
      ...draft,
      pinned,
    });

    return;
  }

  const notes = getLocalNotes();
  const now = new Date().toISOString();

  const updatedNotes = notes.map((note) =>
    note.id === id
      ? {
          ...note,
          ...draft,
          updatedAt: now,
        }
      : note,
  );

  saveLocalNotes(updatedNotes);
}

// ============================================
// DELETE NOTE
// ============================================

async function removeNote(
  userId: string | undefined,
  id: string,
): Promise<void> {
  if (userId) {
    await notesRequest({
      action: "delete",
      userId: String(userId),
      id,
    });

    return;
  }

  const notes = getLocalNotes();

  saveLocalNotes(
    notes.filter((note) => note.id !== id),
  );
}

// ============================================
// NOTES LIST - SAME FILE
// ============================================

export function NotesList() {
  const router = useRouter();

  const user = useSelector((state: RootState) => state.user);
  const userId = user?.userId;

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getNotes(
        userId ? String(userId) : undefined,
      );

      setNotes(result);
    } catch (err) {
      console.error("Fetch notes error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to fetch notes.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-ink-soft">
        Loading notes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-red-600">{error}</p>

        <button
          onClick={fetchNotes}
          className="mt-3 text-sm font-medium text-ink underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-ink-soft">
        No notes found.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {notes.map((note) => (
        <button
          key={note.id}
          type="button"
          onClick={() => {
            router.push(`/edit/${note.id}`);
          }}
          className="w-full rounded-xl border border-border p-4 text-left transition hover:bg-accent-soft"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate font-semibold text-ink">
              {note.title || "Untitled note"}
            </h3>

            <span className="shrink-0 text-xs text-ink-faint">
              {note.updatedAt
                ? new Date(note.updatedAt).toLocaleDateString()
                : ""}
            </span>
          </div>

          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-ink-soft">
            {note.content}
          </p>

          <span className="mt-3 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs text-ink-soft">
            {note.category}
          </span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// NOTE EDITOR
// ============================================

export default function NoteEditor({
  mode,
  initialNote,
}: Props) {
  const router = useRouter();

  // Redux user
  const user = useSelector((state: RootState) => state.user);

  const userId = user?.userId;
  const isAuthenticated = Boolean(userId);

  // Form states
  const [title, setTitle] = useState(
    initialNote?.title || "",
  );

  const [content, setContent] = useState(
    initialNote?.content || "",
  );

  const [category, setCategory] = useState<Category>(
    initialNote?.category || "Personal",
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ============================================
  // CREATE / UPDATE NOTE
  // ============================================

  async function saveNote() {
    if (!title.trim() && !content.trim()) return;

    if (mode === "edit" && !initialNote?.id) {
      setError("Note ID is missing.");
      return;
    }

    setLoading(true);
    setError("");

    const draft: NoteDraft = {
      title: title.trim() || "Untitled note",
      content: content.trim(),
      category,
    };

    try {
      if (mode === "new") {
        await createNote(
          isAuthenticated ? String(userId) : undefined,
          draft,
        );

        console.log("Note created successfully.");
      } else {
        await updateNote(
          isAuthenticated ? String(userId) : undefined,
          initialNote!.id,
          draft,
          initialNote!.pinned ?? false,
        );

        console.log("Note updated successfully.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Save note error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // DELETE NOTE
  // ============================================

  async function deleteNote() {
    if (!initialNote?.id || loading) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this note?",
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      await removeNote(
        isAuthenticated ? String(userId) : undefined,
        initialNote.id,
      );

      console.log("Note deleted successfully.");

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Delete note error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // GO BACK
  // ============================================

  function goBack() {
    if (
      title !== (initialNote?.title || "") ||
      content !== (initialNote?.content || "") ||
      category !== (initialNote?.category || "Personal")
    ) {
      if (!window.confirm("Discard your changes?")) return;
    }

    router.push("/");
  }

  // ============================================
  // CATEGORY COLORS
  // ============================================

  function getCategoryColor(cat: Category) {
    const colors: Record<Category, string> = {
      Personal: "bg-blue-400",
      Work: "bg-purple-400",
      Ideas: "bg-amber-400",
      Journal: "bg-pink-400",
      "To-do": "bg-green-400",
      Other: "bg-gray-400",
    };

    return colors[cat];
  }

  // ============================================
  // UI
  // ============================================

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b-theme border-border bg-canvas px-3 py-2.5">
        <button
          onClick={goBack}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-control text-ink hover:bg-accent-soft"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <span className="text-[13px] font-medium text-ink-soft">
          {mode === "edit" ? "Edit note" : "New note"}
        </span>

        <div className="flex items-center gap-1">
          {mode === "edit" && (
            <button
              onClick={deleteNote}
              disabled={loading}
              className="flex h-10 w-10 items-center justify-center rounded-control text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          )}

          <button
            onClick={saveNote}
            disabled={
              loading ||
              (!title.trim() && !content.trim())
            }
            className="flex h-10 w-10 items-center justify-center rounded-control bg-ink text-canvas disabled:opacity-40"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5 pb-8 pt-5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          autoFocus={mode === "new"}
          disabled={loading}
          className="w-full bg-transparent font-display text-[26px] font-semibold text-ink placeholder:text-ink-faint/60 focus:outline-none"
        />

        {initialNote && (
          <p className="mt-1.5 font-mono text-[11px] uppercase text-ink-faint">
            Last edited{" "}
            {new Date(
              initialNote.updatedAt,
            ).toLocaleString()}
          </p>
        )}

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              disabled={loading}
              onClick={() => setCategory(cat)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border-theme px-3.5 py-1.5 text-[13px] font-medium ${
                category === cat
                  ? "border-transparent bg-cat-journal text-on-accent"
                  : "border-border text-ink-soft hover:bg-accent-soft"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${getCategoryColor(
                  cat,
                )}`}
              />
              {cat}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing..."
          disabled={loading}
          className="mt-5 w-full flex-1 resize-none bg-transparent text-[16px] leading-relaxed text-ink placeholder:text-ink-faint/60 focus:outline-none"
          rows={12}
        />

        {error && (
          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading && (
          <p className="mt-3 text-sm text-ink-soft">
            Please wait...
          </p>
        )}
      </div>
    </div>
  );
}
