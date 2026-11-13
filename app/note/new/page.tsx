"use client";

import { useRouter } from "next/navigation";
import { useNotes } from "@/lib/useNotes";
import { NoteDraft } from "@/lib/types";
import NoteEditor from "@/components/NoteEditor";

export default function NewNotePage() {
  const router = useRouter();
  const { createNote } = useNotes();

  function handleSave(draft: NoteDraft) {
    createNote(draft);
    router.push("/");
  }

  return <NoteEditor mode="new" onSave={handleSave} />;
}
