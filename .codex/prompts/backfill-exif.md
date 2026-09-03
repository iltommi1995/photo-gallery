Re-extract or backfill EXIF metadata on already-uploaded photos.

Read `docs/ai/backfill-exif.md` and follow it exactly: reuse
`src/lib/exif/extract.ts` rather than reimplementing extraction, never touch
fields on rows an admin has hand-edited (especially `isAnalog: true` rows),
default to a dry run that reports what would change, and only write to the
database on an explicit instruction to do so.

This prompt intentionally has no procedure of its own —
`docs/ai/backfill-exif.md` is the source of truth (same file Claude Code's
`backfill-exif` skill wraps).
