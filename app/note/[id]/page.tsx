
"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store/store";

import NoteEditor from "@/components/NoteEditor";
import { getNotes } from "@/components/NoteCard";

type EditorNote = ComponentProps<typeof NoteEditor>["initialNote"];

type Status = "loading" | "ready" | "missing" | "signin" | "error";

export default function NotePage() {
  const params = useParams<{ id: string }>();

  const id = decodeURIComponent(String(params?.id ?? ""));

  const user = useSelector((state: RootState) => state.user);
  const userId = user?.userId;

  const [note, setNote] = useState<EditorNote>(undefined);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const isNew = id === "new";

  // ============================================
  // LOAD NOTE
  // ============================================

  useEffect(() => {
    if (isNew) return;

    if (!userId) {
      setStatus("signin");
      return;
    }

    let cancelled = false;

    async function load() {
      setStatus("loading");
      setMessage("");

      try {
        const notes = await getNotes(String(userId));

        const found = notes.find(
          (n) => String(n.id) === id
        );

        if (cancelled) return;

        if (found) {
          setNote(found as unknown as EditorNote);
          setStatus("ready");
        } else {
          setNote(undefined);
          setStatus("missing");
        }
      } catch (err) {
        if (cancelled) return;

        setMessage(
          err instanceof Error
            ? err.message
            : "Unable to load this note."
        );

        setStatus("error");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, id, isNew]);

  // ============================================
  // NEW NOTE
  // ============================================

  if (isNew) {
    return <NoteEditor mode="new" />;
  }

  // ============================================
  // EDIT NOTE
  // ============================================

  if (status === "ready" && note) {
    return (
      <NoteEditor
        key={id}
        mode="edit"
        initialNote={note}
      />
    );
  }

  // ============================================
  // LOADING / ERROR STATES
  // ============================================

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">

      {status === "loading" && (
        <p className="text-sm text-ink-soft">
          Loading note...
        </p>
      )}

      {status === "signin" && (
        <>
          <h1 className="font-display text-xl font-semibold text-ink">
            Sign in to view this note
          </h1>

          <p className="mt-1 text-sm text-ink-soft">
            Your notes are saved to your account.
          </p>
        </>
      )}

      {status === "missing" && (
        <>
          <h1 className="font-display text-xl font-semibold text-ink">
            Note not found
          </h1>

          <p className="mt-1 text-sm text-ink-soft">
            This note may have been deleted.
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="font-display text-xl font-semibold text-ink">
            Couldn't load this note
          </h1>

          <p className="mt-1 text-sm text-ink-soft">
            {message}
          </p>
        </>
      )}

      {status !== "loading" && (
        <Link
          href="/"
          className="mt-4 text-sm font-medium text-ink underline"
        >
          Back to notes
        </Link>
      )}
    </div>
  );
}
