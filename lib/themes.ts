import type { LucideIcon } from "lucide-react";
import {
  CircleDot,
  Layers,
  Sparkles,
  Moon,
  LayoutGrid,
  Wand2,
  BookOpen,
} from "lucide-react";

/**
 * A theme is identified by `id`, which is written to `document.documentElement`
 * as `data-theme="<id>"`. All actual visual values (colors, radii, shadows,
 * blur, fonts) live as CSS custom properties in `app/globals.css` under a
 * matching `[data-theme="<id>"] { ... }` block — this file only carries the
 * metadata needed to render the theme picker (name, tagline, icon).
 *
 * To add a new theme:
 *   1. Add its id to `ThemeId` below.
 *   2. Add a `[data-theme="<id>"] { --color-canvas: ...; ... }` block in globals.css
 *      defining every custom property used elsewhere (see any existing block for
 *      the full list of required variables).
 *   3. Add an entry to the `THEMES` array below.
 * No component code needs to change — everything reads through the CSS variables.
 */
export type ThemeId =
  | "minimalism"
  | "glassmorphism"
  | "neumorphism"
  | "dark-modern"
  | "material"
  | "aurora"
  | "paper";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  icon: LucideIcon;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "minimalism",
    name: "Minimalism",
    tagline: "Clean, spacious, distraction-free",
    icon: CircleDot,
  },
  {
    id: "glassmorphism",
    name: "Glassmorphism",
    tagline: "Translucent cards, soft blur",
    icon: Layers,
  },
  {
    id: "neumorphism",
    name: "Neumorphism",
    tagline: "Soft shadows, raised surfaces",
    icon: Sparkles,
  },
  {
    id: "dark-modern",
    name: "Dark Modern",
    tagline: "Dark palette, elegant contrast",
    icon: Moon,
  },
  {
    id: "material",
    name: "Material",
    tagline: "Structured cards, clear elevation",
    icon: LayoutGrid,
  },
  {
    id: "aurora",
    name: "Aurora",
    tagline: "Vibrant gradients, modern energy",
    icon: Wand2,
  },
  {
    id: "paper",
    name: "Paper / Classic",
    tagline: "Paper-like, traditional notebook feel",
    icon: BookOpen,
  },
];

export const DEFAULT_THEME: ThemeId = "paper";
export const THEME_STORAGE_KEY = "marginalia.theme.v2";

export function isThemeId(value: string | null): value is ThemeId {
  return !!value && THEMES.some((t) => t.id === value);
}
