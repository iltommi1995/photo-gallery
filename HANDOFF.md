# Handoff — Claude Code → Codex CLI

Written at the end of a Claude Code session that built this project from an
empty directory through all 10 phases of the original build spec, plus a
short live polish pass. Read this first, then `AGENTS.md` (canonical
conventions/commands/structure — Codex reads it automatically) and
`CHANGELOG.md` (full history, most recent at top). This file itself is a
point-in-time note, not a permanent doc — delete it once you've absorbed it,
or leave it, your call.

## Status: feature-complete per spec, one known gap

Everything in the original build spec is implemented and was verified
working (not just written) — public site with the horizontal-scroll album
viewer, admin panel with drag-and-drop album/chapter/placement editing and
EXIF-aware upload, the AI-dev scaffold (`.claude/`, `.codex/`, `docs/ai/`),
Storybook, `CHANGELOG.md` enforcement, Docker Compose deployment. 44 unit
tests, 8 Playwright E2E tests, all green as of the last commit.

**Known incomplete item**: Storybook coverage. Only 6 of ~34 components
under `src/components/**` have a story + test (the architecturally
significant, reusable ones — `ChapterMosaic`, `HorizontalScrollProgress`,
`AlbumHero`, `SignOutButton`, `PhotoPickerSelect`, `Lightbox`). The rest
(vendored shadcn/ui primitives, the more stateful admin forms and
album-editor internals) are an explicit, reported gap — see
`docs/ai/storybook-audit.md` and the `storybook-writer` agent/skill, which
exist specifically to pick this up. Run `/storybook-audit` (Claude Code) or
the equivalent Codex prompt to continue it.

## What happened after the 10-phase build (this session, live with the user)

The user started testing the running app and asked for visual fixes on the
fly. In order:

1. Seed data was synthetic gradient placeholder JPEGs (by design — see
   `prisma/seed.ts`). User couldn't tell they were photos at all, asked for
   something realistic. Swapped all seeded photos' underlying files for
   real stock photos (picsum.photos) via a one-off script, reusing
   `src/lib/image/variants.ts`'s real pipeline — **not** committed to
   `prisma/seed.ts` itself, so a fresh `pnpm db:reset` reverts to gradients.
   If you want realistic seed data to _stay_ realistic across resets,
   that's a real follow-up: either commit real (rights-cleared) sample
   photos, or teach `seed.ts` to fetch placeholders itself.
2. Found and fixed: Next.js's image-optimization cache is `immutable`
   (correctly, for real usage — a photo's bytes never change post-upload
   in normal app flow) — swapping files under the _same_ photo id without
   busting `.next/cache/images/` serves stale output. Had to clear that
   cache + restart dev server. Not an app bug, just a gotcha of manual
   file swaps outside the normal upload flow.
3. Home hero photo, site title text, and About content are all
   `SiteSettings`-driven (admin-editable, see `/admin/settings`) — updated
   directly in the dev DB rather than hardcoded, which is the correct way
   to change them (don't hardcode site content into components).
4. User uploaded a real B&W photo (a Rome street scene) through
   `/admin/photos` and set it as the hero via `/admin/settings` — this is
   now the live hero photo in the dev DB. It is **not** committed anywhere
   (it's a DB row + a file under `storage/`, both gitignored/local) — if
   this dev database gets reset or a fresh clone is used, that photo is
   gone and needs re-uploading.
5. Fixed a **real, previously-unnoticed bug**: `SiteNav`'s menu overlay
   rendered as a small centered box instead of full-screen. Root cause:
   shadcn's `DialogContent` component ships a default `sm:max-w-sm` class;
   overriding it with an unprefixed `max-w-none` doesn't work because a
   `sm:`-prefixed Tailwind utility beats an unprefixed one at that
   breakpoint via normal CSS cascade (media-query rules come later in the
   stylesheet), _regardless_ of `class` attribute order or what
   `tailwind-merge` decides to keep. `Lightbox.tsx` already had the correct
   `sm:max-w-none` override; `SiteNav.tsx` didn't. **If you add another
   full-screen `Dialog`-based component, check for this same trap.**
6. Replaced `SiteNav`'s two separate hamburger/close buttons with one
   fixed, left-center-positioned toggle whose icon animates between
   hamburger and X.
7. Changed the public site's heading font from Archivo to Bebas Neue (a
   tall condensed display face, more "magazine masthead") and the hero
   title color from white to the red accent. Both are on the shared
   `font-portfolio-heading` design token in `globals.css`, so this is
   site-wide (`AccentLabel`, `AlbumHero`, `SiteNav`'s nav links too), not
   Home-only.

All of the above is committed (see `git log`, top commits `aa1136e` and
`6c96a4a`) **except** the DB-level content changes (steps 1, 3, 4 — those
are local dev data, not code).

## Bugs found during the whole build that are worth knowing about

These were all caught by actually running things (dev server, real
Docker builds, Playwright against a real browser), not by reasoning about
the code — a pattern worth continuing:

- **Drag-and-drop from the admin photo library never worked at all.**
  `PhotoLibrarySidebar` was rendered outside the `DndContext` wrapping the
  canvas. Fixed in `AlbumEditor.tsx`.
- **Every album page loaded on the wrong chapter.** Chromium re-resolves
  `scroll-snap-type: x mandatory` repeatedly as chapter images load,
  landing `scrollLeft` on the second section instead of the first. Fixed
  in `useHorizontalScroll.ts` by disabling `scroll-snap-type` for a short
  window after mount.
- **`PhotoPickerSelect` showed a raw photo id instead of its label** on
  first render — base-ui's `Select.Value` only resolves a label from
  mounted `SelectItem`s, which haven't mounted before the popup opens
  once. Fixed via `Select.Value`'s render-prop.
- **A Prisma race on `SiteSettings`** during concurrent first-request
  static generation (`P2021`/`P2002`-adjacent). Fixed with a
  catch-and-refetch fallback in `src/lib/settings.ts`.
- **pnpm's script wrapper fails as the non-root Docker runtime user**
  (`pnpm start`, `pnpm prisma ...` do a workspace-consistency check that
  writes a temp file `/app` can't accept). Runtime/migration commands in
  the Dockerfile call `next`/`prisma`/`tsx` binaries directly instead.
- **`.env.example` was never actually committed** for most of the build —
  `.gitignore`'s `.env*` pattern matched it too. Fixed with a
  `!.env.example` exception.
- **A Docker Compose project-name collision could have destroyed the dev
  database** — `docker-compose.dev.yml` had no explicit project `name:`,
  so it was inferred from the directory, colliding with
  `docker-compose.yml`'s pinned name. Fixed with an explicit distinct name
  and a pinned volume name.
- **The `SiteNav` `sm:max-w-sm` cascade bug** — see above.

## Current local environment state

- Dev Postgres: running (`docker compose -f docker-compose.dev.yml up -d`,
  container `photo-gallery-dev-db`, host port **5433**, not 5432).
- Dev server: running on **port 3100**, not 3000 — port 3000 is taken by
  an unrelated project (`sdvproductions`) also on this machine. Start with
  `PORT=3100 pnpm dev` if it's not already running (check
  `pgrep -af "next dev"` first).
- Admin login: credentials are in `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
  — not reproduced here since this file is committed to git and `.env`
  correctly isn't.
- The dev DB currently has real content the user added live (a Rome hero
  photo, updated site title) on top of the seeded sample albums (Milan,
  Berlin published; Dresden draft) — don't `pnpm db:reset` without
  checking with the user first, it'll wipe that.

## Suggested next steps

- Ask the user what they want to keep iterating on visually — this was a
  live, ad hoc polish pass and there may be more.
- If continuing UI work on `SiteNav`, `Lightbox`, or any other full-screen
  overlay: grep for `DialogContent` usage and double check `sm:max-w-*`
  isn't silently winning again.
- Real content: the site is currently running on stock placeholder photos
  the user swapped in for visual testing, plus one real photo. At some
  point actual portfolio photos need to go in via `/admin/photos`.
- Storybook gap (see above) — natural task for `storybook-writer`.
- Re-run `pnpm test:e2e` after any further changes to `SiteNav`,
  `AlbumScrollView`, or the album editor — those are exactly the areas the
  E2E suite covers and where the real bugs above were found.
