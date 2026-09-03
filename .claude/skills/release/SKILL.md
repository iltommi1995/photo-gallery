---
name: release
description: Cut a release — bump the version, consolidate CHANGELOG.md's Unreleased section into a dated version, tag git. Use when asked to release/tag/cut a version.
---

This skill is a thin wrapper. The actual procedure is
`docs/ai/release-and-changelog.md` (the "Cutting a release" section) — read
it now.

Follow it in order: decide the semver bump from what's under
`[Unreleased]`, rename that section to `[x.y.z] - YYYY-MM-DD` with a fresh
empty `[Unreleased]` above it, bump `package.json`, commit as
`chore(release): x.y.z`, tag `vx.y.z` locally. Confirm `pnpm build` and
`pnpm test` are green on the release commit. Do not push the tag or the
branch unless explicitly asked.

Do not reimplement the playbook's steps inline here — if this skill and the
playbook ever disagree, the playbook wins and this file is out of date.
