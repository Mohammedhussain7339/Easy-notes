"use client";

import { useCallback, useEffect, useState } from "react";
import { Note, NoteDraft } from "./types";
import { generateId } from "./utils";

const STORAGE_KEY = "marginalia.notes.v1";

function readFromStorage(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeToStorage(notes: Note[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Storage full or unavailable; fail silently, app still works in-memory.
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setNotes(readFromStorage());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) writeToStorage(notes);
  }, [notes, isLoaded]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setNotes(readFromStorage());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const createNote = useCallback((draft: NoteDraft): Note => {
    const now = new Date().toISOString();
    const note: Note = {
      id: generateId(),
      title: draft.title,
      content: draft.content,
      category: draft.category,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [note, ...prev]);
    return note;
  }, []);

  const updateNote = useCallback((id: string, draft: NoteDraft) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              ...draft,
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  }, []);

  const getNote = useCallback(
    (id: string) => notes.find((n) => n.id === id),
    [notes]
  );

  return {
    notes,
    isLoaded,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    getNote,
  };
}
