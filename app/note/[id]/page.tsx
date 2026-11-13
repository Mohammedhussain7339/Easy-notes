"use client";

import { useRouter } from "next/navigation";
import { useNotes } from "@/lib/useNotes";
import { NoteDraft } from "@/lib/types";
import NoteEditor from "@/components/NoteEditor";
import EmptyState from "@/components/EmptyState";

export default function EditNotePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isLoaded, getNote, updateNote, deleteNote } = useNotes();
  const note = getNote(params.id);

  function handleSave(draft: NoteDraft) {
    updateNote(params.id, draft);
    router.push("/");
  }

  function handleDelete() {
    deleteNote(params.id);
    router.push("/");
  }

  if (!isLoaded) return null;

  if (!note) {
    return (
      <div className="flex min-h-dvh flex-col">
        <EmptyState
          heading="Note not found"
          subtext="This note may have been deleted."
          action={{ label: "Back to notes", onClick: () => router.push("/") }}
        />
      </div>
    );
  }

  return (
    <NoteEditor
      mode="edit"
      initialNote={note}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  );
}
