---
name: backfill-exif
description: Re-extract or backfill EXIF metadata on already-uploaded photos, e.g. after fixing the extractor or importing photos outside the normal upload flow. Defaults to a dry run.
---

This skill is a thin wrapper. The actual procedure is
`docs/ai/backfill-exif.md` — read it now.

No dedicated sub-agent for this one; run it directly (general-purpose
agent-level task), reusing `src/lib/exif/extract.ts` rather than
reimplementing extraction. Default to dry-run/report-only per the playbook;
only write to the database on an explicit instruction to do so.

Do not reimplement the playbook's steps inline here — if this skill and the
playbook ever disagree, the playbook wins and this file is out of date.
