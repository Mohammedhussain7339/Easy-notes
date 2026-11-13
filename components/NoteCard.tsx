"use client";

import Link from "next/link";
import { Pin } from "lucide-react";
import { Note } from "@/lib/types";
import { categoryStyle, excerpt, formatRelativeDate } from "@/lib/utils";

interface NoteCardProps {
  note: Note;
  onTogglePin: (id: string) => void;
  index: number;
}

export default function NoteCard({ note, onTogglePin, index }: NoteCardProps) {
  const style = categoryStyle(note.category);
  const preview = excerpt(note.content, 108);

  return (
    <Link
      href={`/note/${note.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className="group relative block animate-fade-in overflow-hidden rounded-card border-theme border-border bg-surface shadow-card backdrop-blur-theme transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99]"
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
            <span className={`text-[10.5px] font-mono font-medium uppercase tracking-wider ${style.text}`}>
              {note.category}
            </span>
            {note.pinned && (
              <Pin className="h-3 w-3 fill-current text-ink-faint" strokeWidth={0} />
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

        <button
          type="button"
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          aria-pressed={note.pinned}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin(note.id);
          }}
          className={`tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${
            note.pinned
              ? "text-accent"
              : "text-ink-faint opacity-0 hover:bg-accent-soft hover:text-accent group-hover:opacity-100"
          }`}
        >
          <Pin
            className="h-[18px] w-[18px]"
            strokeWidth={2}
            fill={note.pinned ? "currentColor" : "none"}
          />
        </button>
      </div>
    </Link>
  );
}
