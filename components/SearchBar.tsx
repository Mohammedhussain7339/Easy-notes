"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search notes",
}: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint"
        strokeWidth={2}
      />
      <input
        type="text"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-control border-theme border-border bg-surface-solid pl-11 pr-11 text-[15px] text-ink shadow-card backdrop-blur-theme placeholder:text-ink-faint focus:border-accent"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="tap-scale absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-accent-soft hover:text-accent"
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
}
