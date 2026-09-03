# Playbook: changelog entries and releases

Used by the `changelog-writer` Claude Code agent (per-commit) and the
`release` skill / Codex `/release` prompt (per-version).

## Per-commit changelog entries

Every commit that touches `src/`, `prisma/`, or `docs/` must add/update a
line under `## [Unreleased]` in `CHANGELOG.md` in the _same_ commit — a
Husky `commit-msg` hook (`scripts/check-changelog.mjs`) blocks the commit
otherwise. To write the entry:

1. Look at the staged diff (`git diff --cached`), not just the commit
   message — the entry should describe the user-visible or
   developer-visible effect of the change, not restate the diff.
2. Put it under the right Keep-a-Changelog heading inside `[Unreleased]`:
   `Added`, `Changed`, `Fixed`, `Removed`, `Security`. Create the heading if
   it doesn't exist yet this cycle.
3. One line, plain language, no ticket numbers or internal jargon — this
   file is also what a future maintainer reads to understand history.
4. Bypass only for commits that are genuinely exempt: `chore(release): ...`
   (see below) or a commit whose message includes `[skip-changelog]` for a
   rare case where a `src/`/`prisma/`/`docs/` change truly has no
   user/dev-visible effect (e.g. pure formatting) — use this sparingly and
   never to dodge writing an entry you don't feel like writing.

## Cutting a release

1. Decide the version bump (semver: breaking → major, feature → minor,
   fix-only → patch) based on everything currently under `[Unreleased]`.
2. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [x.y.z] - YYYY-MM-DD`
   and add a fresh empty `## [Unreleased]` above it.
3. Bump `"version"` in `package.json` to match.
4. Commit as `chore(release): x.y.z` (this message bypasses the
   per-commit changelog hook, since the changelog _is_ the change here).
5. Tag: `git tag vx.y.z`. Do not push the tag unless explicitly asked.
6. Verify `pnpm build` and `pnpm test` are green on the release commit
   before considering it done.
