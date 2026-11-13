"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { useAppTheme } from "@/lib/useAppTheme";
import IconButton from "@/components/IconButton";
import ThemePreviewCard from "@/components/ThemePreviewCard";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme, mounted } = useAppTheme();

  return (
    <div className="flex min-h-dvh flex-col pb-12">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b-theme border-border bg-canvas px-3 py-2.5 backdrop-blur-theme">
        <IconButton label="Back" onClick={() => router.push("/")}>
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </IconButton>
        <span className="text-[13px] font-medium text-ink-soft">
          Theme settings
        </span>
      </header>

      <div className="px-5 pt-6">
        <h1 className="font-display text-[22px] font-semibold leading-tight text-ink">
          Choose your style
        </h1>
        <p className="mt-1.5 max-w-[42ch] text-[14px] leading-relaxed text-ink-soft">
          Pick a look for Marginalia. It applies everywhere instantly, and is
          remembered the next time you open the app.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3.5 px-5 sm:grid-cols-2 lg:grid-cols-3">
        {mounted &&
          THEMES.map((t) => (
            <ThemePreviewCard
              key={t.id}
              theme={t}
              isActive={theme === t.id}
              onSelect={() => setTheme(t.id)}
            />
          ))}
      </div>

      <p className="mt-8 px-5 text-center font-mono text-[11px] uppercase tracking-wide text-ink-faint">
        Your theme is saved on this device only
      </p>
    </div>
  );
}
