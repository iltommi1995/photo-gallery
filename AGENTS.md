<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Photo Gallery — AI agent guide

This file is read by both Claude Code and Codex CLI. It is the single source of
truth for project conventions; tool-specific files (`CLAUDE.md`, `.codex/prompts/`)
add only what's specific to that tool and otherwise point back here.

## What this project is

A self-hosted photography portfolio with two halves:

- **Public site** — album index ("Places"), and an album viewer that scrolls
  **horizontally** on desktop (wheel `deltaY` remapped to the X axis, native
  trackpad `deltaX` passed through) and falls back to a normal vertical layout
  on mobile. Albums are organized into **chapters** (e.g. by year or trip), each
  chapter a curated mosaic of photos in mixed sizes — not a uniform grid.
- **Admin panel** (`/admin/**`, single owner account) — upload photos with
  automatic EXIF extraction, and a Behance-style drag-and-drop editor for
  composing each chapter's mosaic.

See `docs/ai/` for step-by-step playbooks on the recurring workflows below, and
`stories/docs/` (Storybook) for the illustrated version of this same material.

## Commands

| Command                             | Purpose                                        |
| ----------------------------------- | ---------------------------------------------- |
| `pnpm dev`                          | Start the Next.js dev server                   |
| `pnpm build`                        | Production build                               |
| `pnpm lint`                         | ESLint                                         |
| `pnpm format` / `pnpm format:check` | Prettier write / check                         |
| `pnpm typecheck`                    | `tsc --noEmit`                                 |
| `pnpm test` / `pnpm test:watch`     | Vitest (unit/component)                        |
| `pnpm test:e2e`                     | Playwright E2E (requires the app + db running) |
| `pnpm storybook`                    | Storybook dev server on :6006                  |
| `pnpm db:migrate`                   | Create/apply a dev migration (Prisma)          |
| `pnpm db:seed`                      | Seed the dev database (`prisma/seed.ts`)       |
| `pnpm db:reset`                     | Drop, re-migrate, and reseed the dev database  |
| `pnpm db:studio`                    | Prisma Studio                                  |

Local dev database: `docker compose -f docker-compose.dev.yml up -d` starts
Postgres only. Full-stack deploy uses the root `docker-compose.yml` (see
`docs/deployment.md`).

## Folder structure

```
src/
  app/                  Next.js App Router
    (public)/           Home, /places, /places/[slug], /about — public routes
    admin/               Admin dashboard, album/chapter editor, login
    api/                 Route handlers for mutations (upload, album CRUD, ...)
  components/
    ui/                  shadcn/ui primitives (admin-facing, neutral theme)
    gallery/             ChapterMosaic and friends — the ONE shared component
                         used by both the admin live-preview and the public
                         album page. Never fork this into two implementations.
    public/              Public-site-specific components (nav, hero, lightbox)
    admin/               Admin-specific components (editor canvas, forms)
  lib/
    db.ts                Prisma client singleton
    auth.ts              Auth.js config
    schemas/              zod schemas shared between forms and API routes
    image/                sharp variant generation, LQIP
    exif/                 exifr extraction helpers
    scroll/                useHorizontalScroll and related hooks
prisma/
  schema.prisma          Album → Chapter → Placement → Photo (+ Tag, Admin)
  seed.ts
docs/
  ai/                     Playbooks — see below
  deployment.md
.claude/agents/           Claude Code sub-agents (thin wrappers over docs/ai/*)
.claude/skills/            Claude Code skills (thin wrappers over docs/ai/*)
.codex/prompts/            Codex CLI custom prompts (same wrapping, same names)
stories/docs/               Storybook MDX documentation pages
storage/                    Local photo storage volume (originals + variants; gitignored)
```

## Data model (spec §6)

`Album` → `Chapter` (ordered sections, e.g. by year) → `Placement` (a photo's
position + size within a chapter: `SMALL`/`MEDIUM`/`LARGE`/`FULL`) → `Photo`
(the underlying file + all EXIF/manual metadata). A `Photo` can appear in
multiple `Placement`s across albums. See `prisma/schema.prisma` for the exact
shape and `stories/docs/data-model.mdx` for the diagram. Any schema change
should go through the `schema-guardian` agent/skill — see
`docs/ai/add-album-layout-variant.md` for the layout-variant case specifically.

## Design system (spec §9)

Two token sets live side by side in `src/app/globals.css`:

- **shadcn/admin theme** (`--background`, `--primary`, etc.) — neutral,
  functional, used only under `/admin`.
- **Portfolio tokens** (`--portfolio-ink`, `--portfolio-paper`,
  `--portfolio-accent` `#c0392b`, `--portfolio-accent-dim`,
  `--portfolio-overlay`, `--portfolio-font-heading`) — the fixed black/white +
  red-accent brand used by every public-facing component. It does not respond
  to OS dark-mode; it's the photographer's identity, not a themeable surface.

Tailwind v4 is CSS-first here (no `tailwind.config.ts`) — tokens are declared
in `@theme inline` in `globals.css` and consumed as ordinary utilities
(`text-portfolio-accent`, `font-portfolio-heading`, ...). See the Storybook
"Design System" page for the full palette and type scale.

## Code conventions

- TypeScript strict; no `any` without a comment explaining why it's necessary.
- Server Components by default; add `"use client"` only where interactivity
  requires it (forms, the DnD editor, the horizontal-scroll hook, the lightbox).
- Validate all mutation input with the shared `zod` schema in
  `lib/schemas/`, both client-side (form) and server-side (route handler).
- Every image needs `altText`; treat a missing alt as a validation error, not
  a warning.
- New components under `src/components/**` always get a co-located
  `*.stories.tsx` and a basic render test — see `docs/ai/add-component.md`.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, ...),
  enforced by commitlint. Any commit touching `src/`, `prisma/`, or `docs/`
  must also update `CHANGELOG.md` under `Unreleased` in the same commit
  (enforced by a Husky `commit-msg` hook) — see `docs/ai/release-and-changelog.md`.

## AI workflow playbooks (`docs/ai/`)

Each playbook is the canonical description of a recurring workflow. Claude
Code skills/agents and Codex prompts are thin wrappers around these — if you
find yourself duplicating logic in a skill instead of linking to the
playbook, that's a bug.

- `docs/ai/add-component.md` — scaffold a component + story + test.
- `docs/ai/add-album-layout-variant.md` — add a new mosaic layout variant.
- `docs/ai/backfill-exif.md` — (re)extract EXIF on already-uploaded photos.
- `docs/ai/release-and-changelog.md` — cut a release, consolidate the changelog.
- `docs/ai/storybook-audit.md` — find and fix missing/stale Storybook coverage.
