# Marginalia — a mobile-first notes app

A clean, production-styled notes app built with Next.js (App Router), TypeScript, and Tailwind CSS. All notes are stored in the browser's `localStorage`, so there is no backend to set up.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For the best sense of the design, open dev tools and switch to a mobile viewport (e.g. iPhone 14 Pro), though the layout scales up cleanly to tablet and desktop widths too.

```bash
npm run build
npm run start
```

## What's inside

- **Home screen** (`app/page.tsx`) — search, category filter pills, and a list of note cards. Pinned notes float to the top.
- **New / edit note screen** (`app/note/new`, `app/note/[id]`) — a shared `NoteEditor` component with a title field, category picker, large text editor, save, and (when editing) delete with a confirmation sheet.
- **Theme settings** (`app/settings/page.tsx`) — pick from 7 themes (Minimalism, Glassmorphism, Neumorphism, Dark Modern, Material, Aurora, Paper/Classic). Each theme card shows a live miniature preview of itself. Selecting one applies instantly across every screen and persists to `localStorage`.
- **Persistence** (`lib/useNotes.ts`) — a small hook that reads/writes notes to `localStorage` under the key `marginalia.notes.v1`, keeps state in sync across tabs, and exposes create/update/delete/pin actions.

## Theme system architecture

Themes are implemented as CSS custom properties, not per-component conditional classes:

- `app/globals.css` defines one `[data-theme="<id>"] { --color-canvas: ...; --color-surface: ...; ... }` block per theme — background, surface, text (3 levels), border, accent (+ hover/soft/on-accent), corner radius (card & control), shadows (card/hover/fab/pressed), backdrop blur amount, heading font, and six category accent colors. This is the single source of truth for what a theme looks like.
- `tailwind.config.ts` maps semantic Tailwind classes (`bg-canvas`, `bg-surface`, `text-ink`, `border-border`, `bg-accent`, `text-on-accent`, `rounded-card`, `rounded-control`, `shadow-card`, `shadow-fab`, `backdrop-blur-theme`, `bg-cat-work`, etc.) to those CSS variables.
- Every component (notes list, note card, editor, search bar, buttons, inputs, modals, empty states, settings) is written entirely with these semantic classes — no component contains theme-specific styling, so a theme change is a single attribute swap (`data-theme` on `<html>`) with zero component re-renders required for styling.
- `lib/themes.ts` holds only the picker metadata (id, name, tagline, icon) for each theme. `lib/useAppTheme.ts` reads/writes the selection to `localStorage` (`marginalia.theme.v2`) and sets `data-theme` on `<html>`. An inline script in `app/layout.tsx` applies it before first paint to avoid a flash.
- **Adding a new theme** requires no component changes: add a `[data-theme="id"]` block in `globals.css` with the same variable set as an existing theme, then add one entry to the `THEMES` array in `lib/themes.ts`.
- The theme picker cards (`components/ThemePreviewCard.tsx`) render a real miniature mock (search bar, note card, FAB) inside a nested `data-theme` scope, so each preview is a live rendering of that theme's actual tokens rather than a hand-picked swatch — previews can't drift out of sync with the real UI.

## Notes on the design

The default theme ("Paper / Classic") has a quiet "index card / field notebook" feel: warm paper backgrounds, a serif display face for titles, a monospace face for timestamps and metadata, and a colored spine tab per note category rather than colored card backgrounds. Cards reveal a subtle paper "dog-ear" fold on hover. The other six themes (Minimalism, Glassmorphism, Neumorphism, Dark Modern, Material, Aurora) each restyle every surface, shadow, radius, and accent while reusing the same component structure.

## Tech

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (no component libraries or UI kits)
- `lucide-react` for icons
- No backend — everything persists to `localStorage`
