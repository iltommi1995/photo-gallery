---
name: storybook-audit
description: Audit src/components/** for missing/stale Storybook stories, tests, and MDX docs, and fix what's found. Use before a release or after a batch of component work.
---

This skill is a thin wrapper. The actual procedure is
`docs/ai/storybook-audit.md` — read it now.

Delegate to the `storybook-writer` sub-agent
(`.claude/agents/storybook-writer.md`) for the scan and the writing.

Do not reimplement the playbook's steps inline here — if this skill and the
playbook ever disagree, the playbook wins and this file is out of date.
