# Playbook: add a component

Used by the `ui-component-builder` Claude Code agent, the `new-component`
Claude Code skill, and the Codex `/new-component` prompt. All three should
do exactly this — nothing more.

## When to use this

Any new piece of UI under `src/components/**`, whether it's an admin
primitive, a public-site component, or a shared gallery component.

## Steps

1. **Place it correctly.**
   - `src/components/ui/` — generic shadcn-derived primitives only. Prefer
     `pnpm dlx shadcn@latest add <name>` over hand-rolling if a suitable
     primitive exists in the registry.
   - `src/components/gallery/` — anything rendering Album/Chapter/Placement
     data that must look identical in the admin live-preview and the public
     site. There is exactly one mosaic renderer (`ChapterMosaic`) — extend
     it, don't fork it.
   - `src/components/public/` — public-site-only (nav, hero, lightbox, ...).
   - `src/components/admin/` — admin-only (editor canvas, upload forms, ...).

2. **Follow the design system.** Public-facing components use the
   `portfolio-*` tokens (`text-portfolio-accent`, `bg-portfolio-paper`, ...).
   Admin components use the plain shadcn tokens. Never mix the two inside
   one component. See `AGENTS.md` → Design system, and the Storybook
   "Design System" page.

3. **Type the props explicitly.** No implicit `any`. If the component
   renders a `Photo`/`Placement`/`Album`/`Chapter`, import the Prisma-derived
   type rather than redeclaring a shape.

4. **Write the story.** Co-locate `ComponentName.stories.tsx` next to the
   component. Cover: default state, any size/variant props, an empty/loading
   state if applicable, and — for public components — how it looks against
   both a light and a photo-heavy dark background (spec calls for the
   portfolio to be photo-first with lots of negative space).

5. **Write a basic test.** Co-locate `ComponentName.test.tsx` (Vitest +
   Testing Library). A render smoke test plus one behavioral assertion is
   enough for most components — this is not a coverage mandate, it's a
   guard against accidental breakage.

6. **Accessibility check.** Keyboard-operable if interactive, meaningful
   `aria-label`/`alt`, respects `prefers-reduced-motion` if it animates.

7. **Run it.** `pnpm storybook` and eyeball the new story; `pnpm test` for
   the new test file; `pnpm lint` and `pnpm typecheck` clean.

8. **Changelog.** Add an `Unreleased` entry in `CHANGELOG.md` describing the
   new component in one line (what it's for, not its prop list).
