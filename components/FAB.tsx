"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export default function FAB() {
  return (
    <Link
      href="/note/new"
      aria-label="Create new note"
      className="tap-scale fixed bottom-6 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-fab transition-all duration-200 hover:bg-accent-hover active:scale-95 sm:bottom-8 sm:right-8"
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </Link>
  );
}
