Cut a release: bump the version, consolidate `CHANGELOG.md`'s Unreleased
section into a dated version, tag git.

Read `docs/ai/release-and-changelog.md` (the "Cutting a release" section)
and follow it exactly: decide the semver bump from what's under
`[Unreleased]`, rename that section to `[x.y.z] - YYYY-MM-DD` with a fresh
empty `[Unreleased]` above it, bump `package.json`, commit as
`chore(release): x.y.z`, tag `vx.y.z` locally, confirm `pnpm build` and
`pnpm test` are green on the release commit. Do not push the tag or branch
unless explicitly asked.

This prompt intentionally has no procedure of its own —
`docs/ai/release-and-changelog.md` is the source of truth (same file Claude
Code's `release` skill wraps).
