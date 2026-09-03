@AGENTS.md

## Claude Code specifics

Everything general — project overview, commands, folder structure, data
model, design system, code conventions — lives in `AGENTS.md` above. This
file only covers what's specific to running this project with Claude Code.

### Sub-agents (`.claude/agents/*.md`)

Scoped-tool agents for the recurring workflows in `docs/ai/`:

- **`ui-component-builder`** — scaffolds a new component per the design
  system, with its story and test. Wraps `docs/ai/add-component.md`.
- **`schema-guardian`** — Prisma schema changes: migration, derived types,
  seed/admin-form updates. Wraps `docs/ai/add-album-layout-variant.md` for
  layout-shape changes and is the general owner of `prisma/schema.prisma`.
- **`storybook-writer`** — finds and fills missing/stale Storybook stories
  and MDX docs. Wraps `docs/ai/storybook-audit.md`.
- **`changelog-writer`** — turns the current diff into a `CHANGELOG.md`
  entry before commit. Wraps `docs/ai/release-and-changelog.md`.
- **`code-reviewer`** — reviews a diff against the conventions in
  `AGENTS.md` (naming, accessibility, image performance, admin-route
  security) before commit.

Invoke via the `Agent` tool with the matching `subagent_type`.

### Skills (`.claude/skills/*/SKILL.md`)

Slash-command-style entry points, one per playbook: `new-component`,
`new-album-layout-variant`, `backfill-exif`, `release`, `storybook-audit`.
Each is a thin wrapper — the actual steps live in `docs/ai/`, not in the
skill file, so Claude Code and Codex CLI stay in sync automatically.
