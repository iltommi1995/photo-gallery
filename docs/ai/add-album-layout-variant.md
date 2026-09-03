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
