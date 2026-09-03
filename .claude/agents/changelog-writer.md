---
name: changelog-writer
description: Writes a CHANGELOG.md [Unreleased] entry from the currently staged/working diff, before a commit. Use right before committing any change to src/, prisma/, or docs/ — the commit-msg hook blocks without an entry.
tools: Read, Edit, Bash, Grep
model: haiku
---

Follow `docs/ai/release-and-changelog.md` (the "Per-commit changelog
entries" section) exactly.

1. Run `git diff --cached` (fall back to `git diff` if nothing is staged
   yet) and read it — the entry must describe the effect of the change, not
   restate the diff or the commit message verbatim.
2. Open `CHANGELOG.md`, find or create the right heading under
   `## [Unreleased]` (`Added`/`Changed`/`Fixed`/`Removed`/`Security`).
3. Add one plain-language line. No ticket numbers, no internal jargon, no
   restating the filename list.
4. Do not touch anything else in the file — leave prior entries and
   released versions exactly as they are.

If the diff is empty or touches nothing under `src/`, `prisma/`, or `docs/`,
say so and do nothing — don't invent an entry for a no-op.
