---
name: new-album-layout-variant
description: Add a new mosaic layout/placement-size variant to the album editor and public renderer. Use when asked to add a new photo size class or a new named chapter layout preset.
---

This skill is a thin wrapper. The actual procedure is
`docs/ai/add-album-layout-variant.md` — read it now, including its guidance
on when this is a schema change vs. a presentation-only addition.

Delegate schema changes to the `schema-guardian` sub-agent
(`.claude/agents/schema-guardian.md`). For presentation-only presets (no
`PlacementSize` enum change), you can implement directly in
`src/components/gallery/ChapterMosaic.tsx` following the playbook's step 3.

Do not reimplement the playbook's steps inline here — if this skill and the
playbook ever disagree, the playbook wins and this file is out of date.
