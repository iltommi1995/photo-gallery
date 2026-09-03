Audit `src/components/**` for missing/stale Storybook stories, tests, and
MDX docs, and fix what's found.

Read `docs/ai/storybook-audit.md` and follow it exactly: list the gaps
first, write stories/tests to the bar defined in `docs/ai/add-component.md`
step 4, cross-check `stories/docs/*.mdx` (especially `ai-workflow.mdx`)
against the actual code/infra it describes, then `pnpm storybook:build`
must succeed before you're done. For a large gap list, prioritize and
report rather than mass-generating shallow stories.

This prompt intentionally has no procedure of its own —
`docs/ai/storybook-audit.md` is the source of truth (same file Claude Code's
`storybook-audit` skill wraps).
