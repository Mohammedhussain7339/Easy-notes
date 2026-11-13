"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/useTheme";
import IconButton from "./IconButton";

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <IconButton
      label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className="relative overflow-hidden"
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-[19px] w-[19px] animate-pop-in" strokeWidth={2} />
      ) : (
        <Moon className="h-[19px] w-[19px] animate-pop-in" strokeWidth={2} />
      )}
    </IconButton>
  );
}
