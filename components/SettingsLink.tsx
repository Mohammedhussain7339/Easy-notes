"use client";

import Link from "next/link";
import { Palette } from "lucide-react";

export default function SettingsLink() {
  return (
    <Link
      href="/settings"
      aria-label="Theme settings"
      title="Theme settings"
      className="tap-scale inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors duration-150 hover:bg-accent-soft hover:text-accent"
    >
      <Palette className="h-[19px] w-[19px]" strokeWidth={2} />
    </Link>
  );
}
