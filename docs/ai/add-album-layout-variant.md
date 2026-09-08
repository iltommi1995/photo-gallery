# Playbook: add a new album layout variant

Used by the `schema-guardian` Claude Code agent, the `new-album-layout-variant`
skill, and the Codex `/new-album-layout-variant` prompt.

## When to use this

The admin editor and public renderer currently support four placement sizes
(`SMALL`/`MEDIUM`/`LARGE`/`FULL`) composed freely within a chapter. This
playbook is for adding a genuinely new _variant_ — e.g. a new size class, a
fixed named layout preset ("triptych", "full-bleed pair"), or a new
`Chapter`-level composition mode.

## Steps

1. **Decide schema vs. presentation.** A new size class (e.g. `WIDE`) is a
   schema change — extend the `PlacementSize` enum in `prisma/schema.prisma`.
   A named preset that's just a specific arrangement of existing sizes is
   presentation-only — it belongs in `src/components/gallery/` as a layout
   helper, no migration needed. Don't reach for a migration if you don't
   need one.

2. **If it's a schema change:**
   - Edit `prisma/schema.prisma`.
   - `pnpm db:migrate` to generate and apply the migration; name it
     descriptively (`add_wide_placement_size`, not `update`).
   - Update `prisma/seed.ts` if the new variant should appear in dev seed data.
   - Update every `zod` schema in `src/lib/schemas/` that enumerates
     `PlacementSize` (form validation must stay in sync with the DB enum).
   - Update the admin resize-handle UI (`src/components/admin/`) to offer
     the new size.

3. **Update the shared renderer.** `src/components/gallery/ChapterMosaic.tsx`
   must handle the new variant — this is the single component both the
   admin live-preview and the public `/places/[slug]` page use. Do not add
   variant-specific branches anywhere else.

4. **Update Storybook.** Add the new variant to `ChapterMosaic.stories.tsx`
   so it's visible without needing real data.

5. **Verify.** `pnpm db:reset` (migration + seed apply cleanly), `pnpm
storybook`, `pnpm test`, and a manual pass through the admin editor to
   confirm the new size is selectable and persists.

6. **Changelog + docs.** `CHANGELOG.md` entry, and update
   `stories/docs/data-model.mdx` if the schema changed.

## Adding a viewport variant (mobile layout overrides)

This playbook predates `Placement.colSpan`/`rowSpan` (see
`stories/docs/data-model.mdx` for the current field list — the size-preset
enum described above was replaced) and predates `Chapter.viewport` (`WEB` |
`MOBILE_LANDSCAPE` | `MOBILE_PORTRAIT`), which lets an admin optionally
author a fully independent _chapter structure_ — count, labels, order, and
each chapter's own placements — for landscape mobile, portrait mobile, or
both, separately from Web. It lives on `Chapter`, not `Placement`: a
placement inherits its viewport from its parent chapter, since a chapter
belongs to exactly one context. This is why chapter counts can differ per
context (Web 3 chapters, Mobile 5), not just each chapter's photo content —
an earlier version of this had `viewport` on `Placement` instead, which
only allowed the _content_ of otherwise-shared chapters to differ; that
turned out not to be enough (a chapter grouping that makes sense on Web
doesn't necessarily make sense on Mobile either).

The steps above still apply to a genuinely new variant; for the viewport
case specifically, the render-time choice lives in `ChapterMosaic`'s
`forceGrid` prop and `AlbumScrollView`'s `useDeviceContext` hook
(`src/lib/scroll/breakpoints.ts`), not in `ChapterMosaic` branching on the
enum directly — it only ever receives whichever one chapter list its
caller already resolved (`groupChaptersByViewport` in
`src/lib/gallery/placement-mapping.ts`, shared by the public and admin
loaders). The admin editor's "Clone from Web" action
(`POST /api/admin/albums/[id]/chapters/clone`) deep-copies Web's chapters
and placements as an editable starting point for an empty mobile context.
