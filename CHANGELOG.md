# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project bootstrap: Next.js 16 (App Router, TypeScript strict, Tailwind CSS v4), pnpm,
  shadcn/ui component primitives.
- Portfolio design tokens (black/white + red accent) layered alongside the shadcn admin
  theme in `src/app/globals.css`.
- Tooling: Prettier, ESLint, Husky + lint-staged, commitlint (Conventional Commits),
  Vitest, Playwright, Storybook.
- Pre-commit/commit-msg hooks enforcing Conventional Commits and requiring a
  `CHANGELOG.md` entry alongside any commit touching `src/`, `prisma/`, or `docs/`.
- AI development scaffold: `AGENTS.md`, `CLAUDE.md`, `docs/ai/` playbooks,
  `.claude/agents/`, `.claude/skills/`, `.codex/prompts/`.
- Prisma data model (`Admin`, `Album`, `Chapter`, `Placement`, `Photo`, `Tag`)
  and initial migration, plus `docker-compose.dev.yml` for a local Postgres
  instance.
- Dev seed script generating placeholder photos (gradient JPEGs via `sharp`,
  fabricated EXIF-like metadata) composed into 3 sample albums/5 chapters,
  and the initial admin user from `.env`.
- Admin authentication: Auth.js Credentials provider against the single
  `Admin` row, JWT sessions, login page at `/admin/login`, an in-memory
  login rate limiter, and a `proxy.ts` (Next.js 16's replacement for
  `middleware.ts`) gating `/admin/**` and mutating `/api/**` routes.
- Photo upload pipeline: `/api/admin/photos` (multipart upload, EXIF
  extraction via `exifr`, `sharp`-generated thumbnail/medium/full JPEG
  variants + LQIP blur placeholder), `/api/admin/photos/[id]` (manual
  metadata edit), `/api/admin/tags` (create-or-get), and `/api/media/[id]/[variant]`
  serving generated variants from the local storage volume through
  `next/image` (which negotiates AVIF/WebP automatically — no separate
  format pre-generation needed).
- Admin `/admin/photos` page: drag-and-drop multi-file upload with
  per-file progress, a photo library grid, and a metadata edit dialog
  (camera/lens/exposure fields, film-stock for analog scans, inline tag
  create/assign). Alt text is required through this form even though it's
  nullable in the DB — a photo can exist unplaced without one.
- Shared `ChapterMosaic` component (`src/components/gallery/`) rendering
  an ordered list of placements as a mixed-size mosaic grid — the single
  renderer used by both the admin live-preview and (from Phase 6) the
  public album page.
- Admin album/chapter/placement editor at `/admin/albums/[id]`: drag
  photos from a library sidebar onto a chapter canvas (`@dnd-kit`), resize
  between SMALL/MEDIUM/LARGE/FULL by click, reorder placements and
  chapters by drag, rename/create/delete chapters, and a live-preview
  toggle that renders the exact shared `ChapterMosaic`. Debounced autosave
  with a saved/unsaved/error status indicator; the whole chapter's
  placement list is replaced atomically on save (`PUT
  /api/admin/chapters/[id]/placements`) rather than diffed, since a
  chapter holds at most a few dozen photos.
- `/admin/albums` list and `/admin` dashboard now show real album/photo
  counts.
