Add a new mosaic layout/placement-size variant to the album editor and
public renderer.

Read `docs/ai/add-album-layout-variant.md` and follow it exactly, including
its guidance on when this is a Prisma schema change (new `PlacementSize`
value → migration → sync `src/lib/schemas/`, `prisma/seed.ts`, admin resize
UI) vs. a presentation-only preset (implement directly in
`src/components/gallery/ChapterMosaic.tsx`, no migration).

This prompt intentionally has no procedure of its own —
`docs/ai/add-album-layout-variant.md` is the source of truth (same file
Claude Code's `new-album-layout-variant` skill wraps).
