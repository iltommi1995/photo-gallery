# Playbook: Storybook audit

Used by the `storybook-writer` Claude Code agent, the `storybook-audit`
skill, and the Codex `/storybook-audit` prompt.

## When to use this

Periodically, and always as part of Phase 8 / before a release — to catch
components that shipped without a story, or documentation pages that drifted
from the code they describe.

## Steps

1. **Find components missing a story.** List every file under
   `src/components/**/*.tsx` that exports a component, excluding files
   already ending in `.stories.tsx` or `.test.tsx`. For each one, check for a
   co-located `*.stories.tsx`. Report the gap list before writing anything.

2. **For each gap, write the story** following the same bar as
   `docs/ai/add-component.md` step 4 (states/variants, light+photo-heavy
   background for public components, empty/loading states where relevant).

3. **Find components missing a test.** Same scan, checking for a co-located
   `*.test.tsx`.

4. **Check the MDX docs pages under `stories/docs/`** against the code they
   document:
   - `introduction.mdx` — architecture/stack described still matches
     `AGENTS.md` and `package.json`.
   - `data-model.mdx` — diagram and field list match `prisma/schema.prisma`.
   - `horizontal-scroll.mdx` — described behavior matches
     `src/lib/scroll/useHorizontalScroll.ts`.
   - `admin-editor.mdx` — described flow matches the actual editor in
     `src/components/admin/`.
   - `ai-workflow.mdx` — the list of sub-agents/skills/playbooks matches
     what's actually in `.claude/agents/`, `.claude/skills/`,
     `.codex/prompts/`, `docs/ai/`. This page tends to drift fastest since
     it documents infrastructure rather than app code — check it every time.

5. **Build check.** `pnpm storybook:build` must succeed with no broken
   story/doc references.

6. **Report, don't silently fix everything.** For a large gap list, prefer
   fixing the highest-traffic/most-recently-touched components first and
   reporting the rest, rather than mass-generating shallow stories for
   everything.
