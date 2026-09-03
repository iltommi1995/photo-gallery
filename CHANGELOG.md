# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (Phase 10 — Docker Compose deployment)

- `docker-compose.yml`: `db` (Postgres, healthchecked), `app` (this Next.js
  app), `reverse-proxy` (Caddy, automatic Let's Encrypt HTTPS), a pinned
  `photo-gallery` project name, and a named `photo-gallery-net` network.
- Multi-stage `Dockerfile` with a dedicated `migrator` build target,
  because build-time static generation (Home/`/places`/`/about`/published
  albums) needs the schema's tables to already exist, not just a reachable
  connection — verified directly (`P2021` when building against an
  unmigrated database) — and migrations can't run from the `app` image
  itself, since building it is exactly the step that needs them already
  applied. `docker-compose.yml`'s `app.build.network` joins the build to
  `db`'s network. Runtime commands use `node_modules/.bin/{next,prisma,tsx}`
  directly rather than `pnpm start`/`pnpm prisma`/`pnpm db:seed` — pnpm
  wraps script execution in a workspace-consistency check that writes a
  temp file into `/app`, which the non-root runtime user can't do (also
  verified directly, not hypothetical).
- `docs/deployment.md`: first-boot (in the now-required order: `db` up →
  build+run the `migrator` image → optionally seed → build `app` → full
  stack up), updating, and backup/restore, all reflecting the exact
  sequence verified against a real build+run (including the two bugs
  above and their fixes).
- `scripts/backup.sh`: dumps Postgres (gzipped) and tars the
  `photo-storage` volume into `./backups/` (or `$BACKUP_DIR`); cron-ready.
- `.env.example` covers both local dev and production
  (`docker-compose.yml`) variable sets in one file, clearly marked.
- `Caddyfile`, `.dockerignore`.

### Fixed

- **`.env.example` was never actually committed** — the `.gitignore`
  pattern `.env*` (meant for `.env`/`.env.local`) matched the example
  file too, so it sat untracked since Phase 2 despite every "stage
  everything" commit since. Added a `!.env.example` exception.
- **A Compose project-name collision could have destroyed the dev
  database.** `docker-compose.dev.yml` had no explicit project `name:`,
  so Compose inferred it from the directory (`photo-gallery`) — identical
  to `docker-compose.yml`'s pinned name. Running a production-stack
  command while dev containers existed treated them as the same project
  and started recreating the dev `db` container into the production
  shape. Caught while testing this phase, before real data was lost (the
  named volume survived — Docker doesn't delete volumes on container
  recreation — but the container did get replaced). Fixed by giving
  `docker-compose.dev.yml` its own project name (`photo-gallery-dev`) and
  pinning its volume to the name it already had, so the fix itself
  doesn't orphan existing dev data.

### Added (Phase 9 — hardening)

- Playwright E2E suite (`e2e/`): admin login (redirect/reject/success/
  sign-out), full album management (login → upload a real photo → create
  album → create chapter → drag-and-drop it onto the canvas → confirm the
  save persisted across a reload → verify live preview), and public
  horizontal-scroll navigation (wheel remap, keyboard End, lightbox
  open/close, mobile fallback). `playwright.config.ts` runs a dedicated
  dev server on port 3200 to avoid clashing with anything else running
  locally.
- SEO: `src/app/sitemap.ts` and `robots.ts` (Next's metadata-route
  convention), Open Graph tags + `metadataBase` (root layout and the
  album page, cover photo as `og:image`), and `schema.org` `ImageGallery`/
  `Photograph` JSON-LD on published album pages (HTML-escaped against
  admin-entered caption/location text breaking out of the `<script>` tag).
- A short in-code note on `src/lib/auth.ts` documenting why there's no
  separate CSRF token scheme: Auth.js's session cookie defaults to
  `SameSite=Lax` + `HttpOnly` (verified via the actual `Set-Cookie`
  header), which already withholds it from cross-site mutation requests
  for this single-admin app.

### Fixed (found by writing the E2E suite)

- **Drag-and-drop from the photo library never worked.** `PhotoLibrarySidebar`
  (containing the draggable photos) was rendered outside the `DndContext`
  that wrapped the canvas — `useDraggable` requires being a descendant of
  the same context as its sensors/drop targets. This means the admin
  editor's core interaction had never actually functioned; the Phase 5
  manual verification exercised the underlying API routes directly and
  didn't catch it.
- **Every album page loaded on the wrong chapter.** Chromium re-resolves
  `scroll-snap-type: x mandatory` as chapter images load and shift layout,
  repeatedly across several frames, landing `scrollLeft` on the second
  section instead of the first — consistently, on every load.
  `overflow-anchor: none` and a one-time reset didn't hold (the browser's
  re-snap wins a same-frame race against a single write). Fixed by
  disabling `scroll-snap-type` entirely for a short window after mount —
  and restoring it immediately on the visitor's first real interaction —
  so there's nothing to incorrectly snap to while images are still loading.
- Mobile mosaic images rendered with zero height (`next/image fill` needs
  a sized parent; the grid's row height was only set from the `sm:`
  breakpoint up) — added a mobile-width `auto-rows` value to `ChapterMosaic`.

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
- Public album page (`/places/[slug]`): desktop horizontal-scroll viewer
  (`useHorizontalScroll` — wheel `deltaY` remapped to X with inertial
  easing, native trackpad `deltaX` passed through untouched, arrow/Home/End
  keyboard nav, a horizontal progress bar) built on the single-DOM-tree,
  CSS-only responsive pattern: the same chapter markup is a horizontal
  snap-track on desktop and a normal vertical stack below the `md`
  breakpoint (`ChapterMosaic`'s existing 2-column collapse handles the
  mobile mosaic), so nothing is duplicated or JS-detected for the split.
  Reuses the Phase 5 `ChapterMosaic` unmodified for chapter rendering.
- Lightbox (`src/components/public/Lightbox.tsx`): full-resolution image,
  caption, an EXIF panel (`formatExifLines`, unit tested — camera, lens,
  exposure, date, location, film stock for analog), and prev/next through
  the album's full placement order.
- Only `PUBLISHED` albums are reachable at `/places/[slug]`; draft albums
  and unknown slugs 404.
- `SiteSettings` singleton model + migration (home hero photo, site title,
  About Me title/body/photo) — not in the original spec's data-model
  listing, but both the home hero and the About page require somewhere to
  persist admin-edited content, so this is the smallest addition that
  provides it. `getSiteSettings()` handles the concurrent-first-request
  race safely (falls back to a plain read on a unique-constraint hit).
- Public pages: Home (hero photo + site title), `/places` (grid of
  published album covers), `/about` (photo + rich-ish text from
  `SiteSettings`). All three, plus the album page, share a `(public)`
  route group layout with `SiteNav` — the hamburger-triggered full-screen
  overlay menu (Home / About Me / Places).
- Admin: `/admin/settings` (site title, hero photo, About Me content) and
  a cover-photo picker on the album settings form, both via a reusable
  `PhotoPickerSelect`.
- ISR: published albums, `/places`, `/about`, and `/` are statically
  generated (`generateStaticParams` for albums) and revalidated on
  publish/edit via `revalidatePath` in the relevant admin mutation routes,
  with a 1-hour revalidation window as a fallback rather than the primary
  invalidation mechanism.

### Fixed

- `PhotoPickerSelect` showed the raw photo id instead of its label on
  first render (base-ui's `Select.Value` only resolves a label from
  `SelectItem`s that have already mounted, which doesn't happen until the
  popup opens once) — now formats the label itself via `Select.Value`'s
  render-prop, found by a Storybook-audit test.
- Testing Library wasn't auto-cleaning between tests (Vitest globals are
  off), so unrelated tests could see leftover DOM from previous ones —
  added an explicit `afterEach(cleanup)` in the shared test setup.

### Added (Storybook)

- Stories + tests for `ChapterMosaic`, `HorizontalScrollProgress`,
  `AlbumHero`, `SignOutButton`, `PhotoPickerSelect`, and `Lightbox` — the
  highest-value subset of a 34-component gap (per `docs/ai/storybook-audit.md`'s
  own "prioritize, don't mass-generate" guidance). Vendored shadcn/ui
  primitives and the more heavily stateful/fetch-coupled admin
  components (the album editor internals, upload/metadata/settings
  forms) are intentionally not yet covered — a real gap, left for a
  dedicated audit pass rather than padded with shallow coverage.
- Five MDX documentation pages under `stories/docs/`: Introduction,
  Data Model, Horizontal Scroll (with a live interactive demo using the
  real hook), Admin Editor, and AI Workflow (documents `AGENTS.md`, the
  Claude sub-agents/skills, and the Codex prompts — and calls out that
  it, more than any component story, is the page most likely to drift
  from what's actually in `.claude/`/`.codex/`/`docs/ai/`).
