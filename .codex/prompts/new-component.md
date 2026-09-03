Scaffold a new component under `src/components/**` with its Storybook story
and test, following this repo's design system.

Read `docs/ai/add-component.md` and follow it exactly — placement rules
(`ui/`, `gallery/`, `public/`, `admin/`), design-system token usage
(`portfolio-*` for public, shadcn tokens for admin, never both), explicit
prop types reusing Prisma-derived types for domain data, the co-located
story and test, the accessibility check, then `pnpm storybook`, `pnpm test`,
`pnpm lint`, `pnpm typecheck` on what you touched, then a one-line
`CHANGELOG.md` entry under `[Unreleased]`.

This prompt intentionally has no procedure of its own — `docs/ai/add-component.md`
is the source of truth (same file Claude Code's `new-component` skill wraps).
