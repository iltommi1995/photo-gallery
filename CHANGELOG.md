# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Admin photo metadata: the Location field is now a type-ahead search
  (`LocationAutocomplete`, built on base-ui's `Combobox`) against
  OpenStreetMap's Nominatim geocoder (proxied through
  `/api/admin/geocode` to attach the required `User-Agent` and apply
  rate limiting), so picking "Montenegro" from a list of real places
  replaces free-typing it — no more typos silently creating duplicate
  places on `/places`. Picking a result also backfills `gpsLat`/`gpsLng`
  when a photo doesn't already have them (EXIF-derived coordinates are
  never overwritten). Public `/places` gains a List/Map toggle: the Map
  view (Leaflet + react-leaflet, plain OpenStreetMap tiles with a CSS
  grayscale filter to keep the muted look — CARTO's free basemap now
  requires an API key, so it's off the table) plots one pin per place
  with at least one geotagged photo, labeled with the place name via a
  permanent tooltip so it's readable without hovering or clicking;
  clicking a pin opens that place's page. No schema change — `Photo.gpsLat`/`gpsLng` already existed and
  were already populated from EXIF on upload. The geocode proxy requests
  English results (`accept-language=en`) — Nominatim otherwise returns a
  place's local-language name (e.g. "Crna Gora / Црна Гора" for
  Montenegro).
- Admin login supports two-factor authentication via an authenticator app
  (TOTP, RFC 6238), from the settings page: scan a QR code, confirm a code,
  get 8 one-time bcrypt-hashed backup codes shown once (for recovery if the
  device is lost — there's no email-based password reset). Sign-in becomes
  a two-step form when 2FA is enabled: the existing `Credentials` provider's
  `authorize()` throws a typed `RequiresTwoFactorError` after a correct
  password when no code was submitted yet, which Auth.js surfaces to the
  client via `signIn(...).code` — no extra pre-login endpoint needed. A
  submitted TOTP code's time-step is remembered (`totpLastUsedStep`) to
  reject replaying the same code within its ~90s acceptance window; a
  backup code is removed from storage once used. The shared login rate
  limit (`src/lib/rate-limit.ts`) moved from 5 to 8 attempts/60s, since a
  2FA login now makes two `authorize()` calls against it. `Admin` model
  gains `totpSecret`, `totpEnabled`, `totpLastUsedStep`, `backupCodes`
  (migration `20260908081633_add_admin_totp_fields`, purely additive).

### Fixed

- `/places`'s List/Map toggle sat in normal document flow below the
  fixed site nav toggle and Leaflet's own zoom control lived inside the
  map's own corner — moved both out to a single fixed cluster
  (`top-6 right-6`, mirroring the nav toggle's own `top-6 left-6`) so
  the zoom buttons sit immediately left of the List/Map switch instead
  of inside the map. Leaflet's built-in zoom control is disabled
  (`zoomControl={false}`) in favor of these, driven via a Leaflet map
  instance `PlacesMap` now hands up through an `onMapReady` callback.
- A place's mosaic (`/places/[slug]`) showed a year label ("UNDATED",
  "2019", ...) above each page and a wide gap between pages — both
  `AlbumScrollView` settings an admin picks per real album
  (`showChapterLabels`, `chapterLayout`), left at their defaults here
  since a place's "chapters" are just synthesized year groupings, not
  curated sections worth calling out. Hardcoded to off/`CONTINUOUS` for
  places specifically.
- `/places`'s Map view rendered blank on an actual phone in portrait,
  despite looking correct in the mobile-emulation checks used to build
  the previous fix below — Leaflet measures its container's pixel size
  once, synchronously, at mount, and the previous fix's flexbox fill
  chain (`flex-1`/`min-h-0` from `<main>` down to the map) needs a
  second layout pass, after `<main>`'s `min-height` clamp resolves, to
  actually grow that div; Leaflet's measurement can land inside that
  gap and read 0. Replaced with a direct `calc(100dvh - <fixed
  offsets>)` height on the map's wrapper (resolved in the first layout
  pass, no race) and an `invalidateSize()` call on mount/resize as a
  safety net (also fixes the map staying blank across an orientation
  change).
- A place's mosaic page with fewer than 4 photos (most often the last
  page of a year) stretched its remaining photo(s) to fill the whole
  page height instead of leaving the missing quadrant of the 2x2 grid
  empty. `ChapterMosaic` gains an opt-in `minRowCount` prop — unused by
  every other caller — that `/places/[slug]` sets to a full page's
  worth of rows regardless of how many photos actually landed on it.
- `/places`'s Map view had two mobile-portrait issues: Leaflet's own
  panes/controls use `z-index` up to 1000 (`leaflet.css`), high enough
  to render above the site nav's fullscreen menu instead of beneath it
  (fixed with `isolate`, containing those values to the map itself);
  and it sat squeezed into the same reserved left rail as the
  text-heavy List view while stopping at a fixed `70vh` regardless of
  how much vertical space was actually available, leaving mismatched
  padding and dead space below it (fixed by dropping the reserved rail
  — `data-gallery-view`, the same mechanism the album viewer uses — and
  stretching to fill the viewport; landscape/desktop sizing is
  unchanged).
- A place's photo mosaic (`/places/[slug]`) still laid four same-sized
  landscape photos out as one full-height row instead of a 2x2 grid,
  even after deriving `rowSpan` from their real aspect ratio (previous
  entry below): at `colSpan: 3`, four photos exactly fill one row width
  (4 \* 3 = 12), and since nothing occupies the row(s) below them, each
  still stretches to the mosaic's full height regardless of `rowSpan`.
  `colSpan: 6` (two per row) makes `resolveGrid`'s auto-flow actually
  wrap extra photos onto new rows.
- A place's photo mosaic (`/places/[slug]`) forced every photo into the
  same square cell (`colSpan: 3, rowSpan: 3`) regardless of its actual
  shape, cropping landscape photos into tall slivers instead of reading
  as the wide shots they are. `rowSpan` is now derived from each photo's
  real aspect ratio (`rowSpanForAspectRatio`, the same helper the admin
  editor's own aspect-locked placements use).
- Deleting or editing an album never actually refreshed the public
  `/albums` (or `/places`) page — `revalidatePublicGalleries()` called
  `revalidatePath("/places", "layout")` / `revalidatePath("/albums",
  "layout")`, but the `"layout"` type argument is only meaningful when it
  matches an actual `layout.tsx` at that exact segment; neither route has
  one (only a `page.tsx`), so both calls were silent no-ops — confirmed
  against Next.js's own docs ("If path is a literal path... omit type")
  and reproduced live: a deleted album kept appearing on `/albums`
  indefinitely (`x-nextjs-cache: HIT`, unaffected by any further edits)
  until the next full rebuild happened to re-query the database fresh.
  Both calls now omit `type`, matching every other call in this file.

- `deploy.yml`'s `.env is missing` check kept failing on the runner even
  after copying `.env` into its checkout path — `actions/checkout`'s
  default `git clean -ffdx` wipes untracked files, including that
  gitignored `.env`, before every single run, discovered live after the
  same copy-once fix didn't survive a second deploy. The `deploy` job's
  checkout step now sets `clean: false`, and `docs/deployment.md`'s
  runner setup no longer suggests symlinking `_work` at `/opt/photo-gallery`
  either — tried live, and `actions/checkout` creates its checkout
  *inside* whatever `_work` resolves to, so that just nested a second
  clone inside the first instead of unifying them.

- `deploy.yml`'s `deploy` job never ran — `runs-on: [self-hosted,
  photo-gallery]` required a custom "photo-gallery" label that the
  self-hosted runner never actually got (its `--labels` flag at
  registration didn't stick), so every push to `main` sat forever at
  "Waiting for a runner to pick up this job...", discovered live once the
  runner was actually registered. Simplified to plain `runs-on:
  self-hosted` — there's only one self-hosted runner on this repo, so a
  custom label added nothing. `docs/deployment.md`'s runner setup step no
  longer passes `--labels` either.

- Admin login 500'd with a generic "Configuration" error on the live
  production domain (behind Nginx Proxy Manager) — Auth.js refuses to
  trust an incoming `Host` header unless `trustHost: true` is set
  explicitly outside of Vercel, which auto-detects and trusts its own.
  Added to `NextAuth({...})` in `src/lib/auth.ts`; safe here since NPM is
  the only thing that can reach the app's port. Fixing that surfaced a
  second, related issue: sign-out redirected to `https://localhost:3000`
  in production instead of the real domain — `trustHost`'s forwarded-header
  detection depends on exactly how the reverse proxy forwards
  `Host`/`X-Forwarded-*`, which turned out not to be reliable enough here.
  `docker-compose.yml`'s `app` service now also sets `AUTH_URL` (Auth.js's
  own recommended fix for self-hosted deployments behind a proxy — an
  explicit canonical URL instead of header-based detection), reusing
  `NEXT_PUBLIC_SITE_URL` rather than a second value to configure.

- `pnpm typecheck` failed on any genuinely fresh checkout (`tsc --noEmit`
  alone) with `Cannot find name 'LayoutProps'` — those ambient route types
  are generated by Next.js only as a side effect of `next dev`/`next build`,
  neither of which the CI `verify` job runs (and can't cheaply: a full
  build needs a live, migrated `DATABASE_URL`, deliberately unavailable on
  that GitHub-hosted runner). Never caught before because every local
  `pnpm typecheck` run happened after an existing, gitignored `.next` from
  a prior `pnpm dev`/`pnpm build` — a truly fresh runner never had one.
  Fixed with `next typegen` (generates just the route types, no DB/build
  needed — this is its documented CI use case): `typecheck` is now
  `next typegen && tsc --noEmit`. Verified with both `.next` and `.env`
  removed, matching the CI runner's checkout exactly.

- `Dockerfile`'s `migrator` stage now runs `prisma generate` at build time.
  `prisma migrate deploy` doesn't need a generated client, but
  `prisma/seed.ts` does (`import { PrismaClient } from "@prisma/client"`)
  — the same image is used to run the seed script per `docs/deployment.md`,
  and without this it fails with "`@prisma/client` did not initialize yet"
  on first boot. Generating only reads the schema file, no live `db`
  connection needed, so it's safe to do at build time here.

- `docker-compose.yml`'s `app.build.network: photo-gallery-net` — recent
  Compose versions build through BuildKit (`docker buildx bake`), which
  only accepts `default`/`none`/`host` there and rejects a named bridge
  network outright, discovered live during a real deployment. Changed to
  `network: host`, which only does what's needed once paired with a
  network-attached buildx builder (`docs/deployment.md` step 5, new): for
  a `docker-container`-driver builder created with `--driver-opt
  network=photo-gallery-net`, BuildKit's `host` mode means "the builder's
  own network," which for that builder *is* `photo-gallery-net` — needed
  once per OS user that runs builds, including the self-hosted CI runner's
  own user.

- `docs/deployment.md`'s recommended LXC memory bumped from "2–4 GB" to a
  flat 4 GB (2 GB is not enough — a real deploy hit swap exhaustion and
  effectively hung during `next build`'s Turbopack compile step at 2 GB
  RAM / 512 MB swap).

- `Lightbox`'s "navigates with the right arrow key" test failed
  deterministically on the GitHub Actions runner (0 calls instead of 1)
  but passed reliably every local run, including under `CI=true` and
  `--no-file-parallelism` — never conclusively root-caused, but
  `user.keyboard()` dispatches to `document.activeElement`, left in an
  unpredictable state by whichever element the previous test in the file
  last focused. `Lightbox`'s keydown listener is intentionally
  window-level (arrow keys work regardless of focus), so the test now
  exercises it the same way — `fireEvent.keyDown(window, ...)` — instead
  of relying on ambient focus.

## [1.0.0] - 2026-09-08

### Added

- CI/CD: `.github/workflows/deploy.yml` runs on every push to `main` — a
  `verify` job (typecheck/lint/test, GitHub-hosted runner) gates a `deploy`
  job that only runs if it passes, on a self-hosted runner living on the
  target host itself (polls GitHub outbound; nothing needs to be reachable
  from the internet for this to work). Deploy repeats the existing manual
  migrate-then-build-then-restart sequence, plus a readiness wait on `db`'s
  healthcheck and on the app actually responding before finishing.
  `docker-compose.yml`'s bundled Caddy `reverse-proxy` service is gone —
  this deployment sits behind an existing reverse proxy elsewhere on the
  network (Nginx Proxy Manager) instead of running its own TLS
  termination, so `app` now just publishes `3000` directly on the host.
  `docs/deployment.md` rewritten around this: Proxmox LXC creation,
  pointing NPM at the container, and the self-hosted runner setup.
  `next/font/google` had no test mock (`src/test/setup.ts`) until this
  pass — the one test file that exercised it was failing for an unrelated
  reason (a build-time-only Next.js transform, unusable as a plain
  function outside a real Next.js build) that would have permanently
  blocked the new `verify` job's `pnpm test` gate; fixed alongside this
  since it's a hard blocker for CI/CD actually working, not a detour from it.

- The nav toggle sits top-left on portrait mobile instead of left-center —
  a vertically-centered fixed button reads as "the start of the horizontal
  scroll," a relationship that only makes sense once `gallery-wide`'s
  album/place scroll view applies; on the portrait fallback it was just a
  button awkwardly floating mid-screen. `RotateDeviceNotice` (also fixed at
  the top, portrait-only) can wrap to 2 lines, so the toggle is pushed down
  below it (`body:has([data-rotate-notice])`) while that's showing, rather
  than overlapping.

- The public site is installable as a PWA: `src/app/manifest.ts` (name,
  standalone display, portfolio ink/paper theme colors) plus a dedicated
  `/icons/[size]` route generating the 192/512/512-maskable PNGs it
  references (a simple red-on-ink "T" mark — a placeholder monogram, not
  final branding), and Next's own `icon.tsx`/`apple-icon.tsx` convention
  for the browser favicon and iOS home-screen icon. `layout.tsx` adds
  `themeColor` (tints the installed app's OS chrome) and `appleWebApp`
  (iOS-specific "Add to Home Screen" meta tags — iOS doesn't read the web
  manifest at all). No service worker/offline caching yet — out of scope
  for "show the install prompt," and a cache layer for a site that
  publishes new photos needs its own invalidation strategy thought through
  separately, not bolted on here.

- `RotateDeviceNotice` now renders once, site-wide, in the public layout
  instead of only inside the album/place scroll view — it shows from the
  first page a mobile visitor lands on, not just once they open an album.

- Mobile now gets the real horizontal-scroll gallery once the phone is
  rotated to landscape, not just at a fixed pixel width: a new
  `gallery-wide` custom variant (`(orientation: landscape) and
  (min-width: 640px)`) replaces the plain `md:`/`sm:` breakpoints across
  `AlbumScrollView`, `ChapterMosaic`, `AlbumHero`, `HorizontalScrollProgress`,
  and the lightbox — a desktop window is always landscape so this is a
  no-op there, but a phone now switches the moment it's turned sideways.
  `useHorizontalScroll`'s desktop-input detection was updated to match.
  Portrait mobile keeps the existing vertical-stacking fallback (rotating
  isn't required, just better) and now shows a dismissible one-line notice
  suggesting landscape, on the album/place view specifically where the
  difference actually matters.

- Lightbox now matches the rest of the public site's design system instead
  of its own dark-theme-with-white-icons look: paper-grain background
  (`bg-portfolio-grain`), red icons (`text-portfolio-accent`, no circle
  backdrop) for close/prev/next like the nav toggle, and the typewriter
  face (`.prose-portfolio-text`) for the caption/EXIF panel and photo
  counter, on dark ink text instead of white. The fixed nav toggle sits at
  the same left-center spot as the lightbox's own prev arrow, so it now
  hides itself (`[data-site-nav-toggle]`) while a photo is open instead of
  overlapping it.

- Admin canvas: drag the corner of a photo or text block to resize it (live
  preview while dragging, committed — through the same `canPlace` collision
  check as the +/- steppers — on release), alongside the existing steppers.

- Visual photo picker replaces the cover dropdown with a thumbnail modal, search,
  cursor-based infinite scrolling, and upload-and-select with required alt text.

- Album editor: visible four-column grid with freely positioned photos, empty
  cells, collision checks, keyboard movement and persisted row/column coordinates.
  Preview and public mosaics share the same layout; existing layouts remain valid.

- Placement sizing is now a free width x height in grid cells (independent
  +/- steppers per photo, up to 4x4) instead of the fixed SMALL/MEDIUM/LARGE/
  FULL presets. `Placement.size` is gone; `colSpan`/`rowSpan` are the source
  of truth everywhere (grid engine, admin canvas, shared mosaic renderer).
  Existing layouts were backfilled from their previous preset and keep their
  current appearance.


- Separate public Albums section for curated, potentially multi-location collections.
- Places now groups published photos by their own location, deduplicated and ordered
  oldest first by capture date, with yearly sections and undated photos last.
- Preserve previous album URLs with redirects; refresh both collections after edits.

- Per-album controls in the album settings form: show/hide chapter titles, and
  choose between separate chapter pages (current spacing) or a continuous,
  gapless flow between chapters (`Album.showChapterLabels`, `Album.chapterLayout`).

- Public site background is a paper-grain texture (SVG noise tile over a
  warmer off-white) instead of flat white, and now reliably covers the full
  viewport height even on short pages (`min-h-dvh` instead of `min-h-full`,
  which only matched the height of its own content). Grain intensity tuned
  up twice (`.bg-portfolio-grain` alpha 0.045 → 0.2) to be clearly visible
  rather than barely-there, and the paper color lightened toward white
  (`--portfolio-paper` `#f0efec` → `#f8f7f5`).

- Per-context mobile layout overrides: an album's chapters — their count,
  labels, order, *and* each one's photos — can now differ independently
  between Web, Mobile horizontal (landscape), and Mobile vertical
  (portrait), not just each chapter's content within an otherwise-shared
  structure. `Chapter` gained a `viewport` field (`WEB` (default) |
  `MOBILE_LANDSCAPE` | `MOBILE_PORTRAIT`, `prisma/schema.prisma`) — a
  chapter belongs to exactly one context, so `Placement` needs no viewport
  of its own (inherited from its parent chapter). By default only Web
  exists; landscape mobile then falls back to replicating Web's chapters as
  a real grid, and portrait mobile falls back to Web's *photos* laid out
  one full-width row each — the existing automatic mobile rendering. An
  admin opts any context into its own independent chapter structure via a
  new **Web / Mobile horizontal / Mobile vertical** switch in the admin
  editor, with ordinary chapter create/rename/reorder/delete now scoped to
  whichever context is active (`viewport` threaded through the chapter
  CRUD routes under `src/app/api/admin/albums/[id]/chapters/`). A new
  **"Clone from Web"** action (`POST
  /api/admin/albums/[id]/chapters/clone`) deep-copies Web's chapters and
  placements as an editable starting point for an empty context, since
  authoring N chapters from a blank canvas is a lot more work than
  restructuring a copy.

  This landed in two passes. The first kept chapters shared and gave each
  one three independent *placement* lists instead — enough to vary a
  chapter's photos per context, but not its existence: every context was
  still stuck with the same chapter count and grouping, which doesn't hold
  up in general (a chapter split that reads well on Web isn't necessarily
  the right split on Mobile). Moving `viewport` up to `Chapter` removed
  that constraint and, as a side effect, undid most of the first pass's
  incidental complexity (a `?viewport=` query param on the placements
  route, composite per-viewport autosave keys in the admin editor) — once
  viewport lives on the chapter you select, "which list to edit" is just
  ordinary chapter selection again.

  `ChapterMosaic` gained a `forceGrid` prop so a curated portrait context
  renders as a real positioned grid (landscape and desktop both get grid
  treatment for free from the `gallery-wide` CSS breakpoint, regardless of
  which chapters are fed in); an album with no overrides renders exactly as
  before either way. Picking which chapter list is "active" for a given
  visitor — and keeping the Lightbox's prev/next in sync with it — happens
  client-side via a new `useDeviceContext` hook
  (`src/lib/scroll/breakpoints.ts`, `"desktop" | "mobile-landscape" |
  "mobile-portrait"`), since a rotated phone needs to be told apart from a
  real desktop window even though both satisfy `gallery-wide`.

### Fixed

- Portrait mobile's mosaic used the gallery-wide `colSpan`/`rowSpan`/grid
  position (a fraction of the 12x12 desktop grid, now up to 12) directly —
  a photo sized for half the desktop grid's height could end up several
  thousand pixels tall on a phone, with huge empty gaps around it, and
  every item's width/gap varied with whatever the desktop layout happened
  to be. Mobile is now a single flat column instead of trying to carry the
  desktop grid's 2D layout at a smaller size: every photo the same width
  and a fixed `aspect-[4/3]`, same gap, independent of desktop
  colSpan/rowSpan/position entirely. Text blocks lost their forced
  `absolute inset-0` on mobile too, so their real content (not a fixed
  box) determines their height instead of being clipped.

- The mosaic fix above still left chapter transitions inconsistent on
  mobile: each `<section>` kept the desktop "framed page" padding
  (`py-12`, plus a `px` that varied with `chapterLayout`/chapter index) at
  every width, so the gap and width at a chapter boundary didn't match the
  uniform gap-4 inside a chapter's own mosaic. That framing is now
  gallery-wide-only; mobile gets one flat `px-4 py-2` for every chapter
  regardless of index or layout setting, so a chapter transition is just
  another 16px gap in the feed — verified pixel-exact (16px/358px)
  across all 11 items of a 4-chapter album.

- The `gallery-wide` treatment (landscape + ≥640px) made a rotated phone
  reuse desktop's exact title sizing/position and chapter padding, but a
  phone in landscape has far less absolute height than a real desktop
  window — the Home/AlbumHero titles' `vw`-only `clamp()` didn't shrink for
  that, and `gallery-wide:py-16` on each chapter ate a large share of the
  little height there was, starving `ChapterMosaic`'s fitHeight rows and
  making photos render squashed (too wide, not tall enough). A new
  `gallery-short` variant (`(orientation: landscape) and (max-height:
  500px)`, matching phones but never real desktop windows) now shrinks both
  hero titles' font size/bottom offset and cuts chapter padding, giving the
  mosaic back the height it needs.

- Follow-up round on the same landscape-phone case, after checking on a real
  device: the nav overlay's link text (`sm:text-6xl`, sized for a desktop
  window that also happens to be "landscape and ≥640px") rendered oversized
  on a phone — now `gallery-short:text-2xl`. The lightbox used `h-screen`
  (`100vh`, the *large* viewport — ignores a mobile browser's address bar),
  so its close button could render above the visible area and be clipped by
  the browser chrome; changed to `h-dvh`, which tracks what's actually
  visible. Its EXIF sidebar (`gallery-wide:w-72`) also ate width the photo
  needed on a narrow phone — narrowed and its icons/spacing tightened under
  `gallery-short`. Chapter padding and the chapter-label size were both cut
  further for the same viewport to claw back a bit more height for the
  mosaic, and the two hero titles' `gallery-short` clamp was raised — the
  first pass had shrunk them further than intended.

- Third round, still on real-device landscape-phone feedback. Tried giving
  each mosaic row a `3rem` floor (`gallery-short`) so a chapter with many
  admin-authored rows (up to 12, sized against a real desktop's height)
  couldn't be crushed paper-thin, with the chapter's own `<section>`
  scrolling vertically when that floor no longer fit the viewport. **This
  broke the mosaic on a real device** — chapters no longer showed their
  curated layout (a few large, deliberately-placed photos), rendering
  instead as a dense strip of small, near-uniform tiles. The likely cause:
  a percentage `height` (`h-full`, several layers deep in a column-flex
  chapter section) combined with `flex-none` to let content grow past its
  flex-allotted space is exactly the kind of nested flex/percentage-height
  interaction browsers resolve inconsistently. Reverted in full — back to
  the `gallery-short` padding/label cuts from the round above, without a
  row floor or per-chapter scroll. The remaining flatter, wider crop is a
  real trade-off of a short landscape viewport rather than a bug to
  engineer away further for now.

  The Albums/Places index pages got the same "landscape phone ≠ desktop"
  treatment as everywhere else and this part held up: at `gallery-short`
  they switch from the plain wrapping grid to a 2-row horizontal scroller
  (`IndexScrollGrid`, shared by both pages) so a handful of cards don't
  leave most of a short landscape viewport empty. This is `gallery-short`,
  deliberately not `gallery-wide` — an earlier pass gated it on
  `gallery-wide` and a fixed card width filling a *real* desktop window's
  full height turned into absurdly tall, narrow slivers; only an actual
  short phone viewport needs this. Caught two more bugs along the way: the
  caption overlay was placed inside the same `grayscale` container as the
  cover photo, so `filter` (which affects an element's entire rendered
  output, not just the parts meant to be filtered) desaturated the red
  label text into unreadable gray — moved `grayscale` onto the `<Image>`
  itself. And the grid was briefly given `data-gallery-view` to match the
  album viewer's own nav-overlap convention, which also strips the CSS
  rule that keeps page content clear of the fixed nav button — on the real
  desktop grid (never gallery-short) that reintroduced the exact overlap
  the rule exists to prevent, so it was removed; only pages that are
  *always* a horizontal gallery (the album/place viewer) should carry it.

- The dev server's cross-origin protection rejected `/_next/hmr`'s
  websocket (a hard "Unauthorized", not just a warning) when the page was
  loaded through a hostname it didn't recognize — the LAN IP (via the
  Windows-to-WSL port-forward) or a cloudflared/localtunnel tunnel — which
  left the page fully rendered but not hydrated, so nothing was
  interactive (the nav menu didn't open). Added `allowedDevOrigins` in
  `next.config.ts` for both.

- The lightbox's close button was already there (`showCloseButton`) but
  effectively invisible: the admin theme's "ghost" button variant has no
  explicit foreground color, so its icon rendered dark-on-dark against the
  lightbox's black background. Replaced with a button styled like the
  existing prev/next arrows (white icon on a translucent circle).

- The new corner-drag resize handle could silently fail to save: its
  pointer-up handler called the parent's resize callback from inside a
  `setResizePreview` updater function, which React flagged ("Cannot update
  a component while rendering a different component") and sometimes just
  dropped. Moved the callback out of the updater to a plain call in the
  handler body.

- A chapter's mosaic no longer scrolls vertically on desktop, ever — its
  rows now size to always exactly fill the space between its top and
  bottom padding (`ChapterMosaic`'s new `fitHeight`: `grid-template-rows:
  repeat(rowCount, minmax(0,1fr))` filling a `md:flex-1` container),
  instead of a fixed height per row that could make a chapter with many
  rows taller than the viewport. Both paddings are always visible at once;
  a chapter with a lot of content just renders its rows shorter rather
  than requiring a scroll no wheel gesture could actually reach (an
  intermediate attempt taught the outer horizontal-scroll handler to let a
  chapter's own scroll consume the wheel first — reverted in favor of this,
  since the real ask was no scroll at all, not a reachable one).

### Changed

- The mobile-override work above went through two data-preserving
  migrations on its way to its final shape, both against the real,
  already-in-use "Montenegro 35mm 2026" album:
  `20260904152809_split_mobile_viewport_by_orientation` renamed the
  original two-value `Viewport` enum's `MOBILE` to `MOBILE_LANDSCAPE` in
  place (`ALTER TYPE ... RENAME VALUE`, not the destructive drop-and-
  recreate Prisma would otherwise generate for an enum value change), and
  `20260904163215_move_viewport_to_chapter` later moved `viewport` from
  `Placement` to `Chapter` — for every chapter with `MOBILE_LANDSCAPE`
  placements, a new sibling `Chapter` row was created (same
  label/order, viewport `MOBILE_LANDSCAPE`) and exactly those placements
  reassigned onto it, rather than losing them to a naive column drop. All
  22 placements across the album's 4 chapters (11 `WEB` + 11
  `MOBILE_LANDSCAPE`) survived both migrations with their content intact.

- The chapter grid is now a fixed 12x12 (`GRID_COLUMNS`, `GRID_MAX_ROWS`,
  `MAX_ITEM_SPAN` in `src/lib/gallery/grid.ts`), not a 4-column canvas that
  grows an "Add rows" button at a time. Every existing placement was
  rescaled to the new grid in place: columns by a flat x3 (4 → 12 divides
  evenly), rows proportionally per chapter to 12 based on that chapter's
  own previous row count — preserving each photo's on-page proportions
  rather than just multiplying blindly. Verified pixel-identical against
  the live album before/after. New drop-in photos and text blocks default
  to a 4x3 span (a third of the width) instead of the old half-width
  default.

- Multi-row/column mosaic placements collapsed to 1x1 on desktop (>=640px)
  while looking correct in the admin canvas: `sm:col-start-*`/`row-start-*`
  only override `grid-column-start`/`grid-row-start`, leaving
  `grid-*-end` at the base rule's `auto` — silently dropping the span.
  `ChapterMosaic` now sets the full `grid-column`/`grid-row` shorthand
  (position + span together) at the `sm:` breakpoint instead.

- `Album.chapterLayout` (PAGED/CONTINUOUS) now controls the right thing:
  left/right framing (the "gap" you see between chapters as the horizontal
  scroll moves from one to the next) — CONTINUOUS drops it so chapters run
  edge-to-edge into each other, PAGED keeps it. Top/bottom framing is
  unrelated to this setting and always stays, on both mobile and desktop —
  two earlier same-day attempts had this backwards (toggling top/bottom
  instead, or forcing it on regardless of the setting).

- In CONTINUOUS layout, the inter-chapter gap doubled to match
  `ChapterMosaic`'s own inter-photo `gap-4` exactly (was smaller, `gap-2`,
  before that also doubled), and the very first chapter gets 5x that gap on
  its left edge — the seam against the cover reads better with more
  separation than one chapter flowing into the next.

- Chapters can now include rich-text blocks (bold/italic/links) alongside
  photos, placed and resized on the same grid via a new "+ Text block"
  control and Tiptap-based editor dialog in the admin canvas. Content is
  sanitized server-side to a fixed allow-list before it's stored
  (`src/lib/sanitize-html.ts`) regardless of what the editor itself permits.
  `Placement.photoId` is now nullable and gained `type` (PHOTO/TEXT) and
  `textContent`.

- Per-photo "preserve original proportions" toggle: instead of always
  cropping to fill its grid cell, a placement can letterbox the photo at
  its real aspect ratio, with the grid's rowSpan auto-computed from the
  photo's width/height so the admin doesn't have to guess a height that
  fits (`Placement.preserveAspectRatio`, `src/lib/gallery/aspect-ratio.ts`).
  The letterboxed area now matches the page's grain background instead of
  showing a plain gray box.

- Continuous-layout albums keep zero gap between chapters, but the very
  first and last chapter no longer sit flush against the hero above or the
  page's end below.

- Text blocks render in a typewriter face (Courier Prime) instead of the
  body sans, in every surface that shows them (public site, admin live
  preview, and the Tiptap editor dialog itself) — `--portfolio-font-mono`.

- Albums and photos can now be deleted from the admin: a "Delete album"
  button on the album settings form, and per-photo delete plus multi-select
  bulk delete on the Photos page. A photo still used as a placement, album
  cover, or the site's hero/about photo is refused with a specific reason
  instead of silently breaking a published page; deleting a photo also
  removes its files from `storage/`.

### Changed (post-launch visual polish, requested live)

- Gallery progress updates in the same frame as scrolling, without a delayed
  width transition or gallery-wide React renders on every scroll event.

- Gallery covers fill the viewport without the left menu rail; the fixed menu
  floats above the scrolling gallery. Index and text pages retain their menu space.

- Album and place galleries now scroll continuously on the X axis, without
  chapter snapping or delayed jumps past the cover. Arrow keys move incrementally.

- Reserve a left menu rail across public content pages and menu links, keeping
  grids, text and scrolling galleries clear of the icon; retain the fullscreen home.

- Home fills the dynamic viewport without scrolling; native scrollbars are
  hidden site-wide while other pages and album tracks remain scrollable.

- Public menu: use a dedicated fullscreen dialog surface and a separate
  viewport-filling backdrop, with no inherited popup zoom or frame.
- Public menu: replace the short dialog zoom and blurred backdrop with a
  smooth opacity transition; respect reduced-motion preferences.

- Public menu toggle: enlarge the hamburger and close icons from 32px to 40px.

- Home hero: larger, responsive Anton typography in a bold, uppercase brutalist style, with the
  admin-managed name above an oversized Photography line.

- Home hero title: red accent color instead of white, and the portfolio
  heading font switched from Archivo to Bebas Neue (a tall condensed
  display face) for a more editorial/magazine masthead feel — affects
  every `font-portfolio-heading` use site-wide (`AccentLabel`, `AlbumHero`,
  `SiteNav`), not just Home.
- `SiteNav`: replaced the two separate hamburger/close buttons with a
  single fixed, left-center-positioned toggle whose icon animates between
  hamburger and X (rotate + cross-fade). Also fixed a real bug: the menu
  overlay rendered as a small centered box instead of full-screen, because
  shadcn's `DialogContent` default `sm:max-w-sm` wasn't being overridden
  by our unprefixed `max-w-none` (Tailwind/CSS cascade — a `sm:`-prefixed
  utility beats an unprefixed one at that breakpoint regardless of source
  order in the class list). Fixed by adding `sm:max-w-none` explicitly, the
  same pattern `Lightbox.tsx` already used correctly.

### Added

- Album editor: visible four-column grid with freely positioned photos, empty
  cells, collision checks, keyboard movement and persisted row/column coordinates.
  Preview and public mosaics share the same layout; existing layouts remain valid. (Phase 10 — Docker Compose deployment)

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

### Added

- Album editor: visible four-column grid with freely positioned photos, empty
  cells, collision checks, keyboard movement and persisted row/column coordinates.
  Preview and public mosaics share the same layout; existing layouts remain valid. (Phase 9 — hardening)

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

### Added

- Album editor: visible four-column grid with freely positioned photos, empty
  cells, collision checks, keyboard movement and persisted row/column coordinates.
  Preview and public mosaics share the same layout; existing layouts remain valid. (Storybook)

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
