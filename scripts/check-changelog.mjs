#!/usr/bin/env node
// Enforces spec §12: any commit touching src/, prisma/, or docs/ must also
// touch CHANGELOG.md in the same commit. Bypass with a `chore(release)` type
// or a `[skip-changelog]` marker in the commit message (used by the release
// flow, which consolidates Unreleased into a version instead of adding to it).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const messageFile = process.argv[2];
if (!messageFile) {
  console.error("check-changelog: no commit message file provided");
  process.exit(1);
}

const message = readFileSync(messageFile, "utf8");
if (/^chore\(release\)/m.test(message) || message.includes("[skip-changelog]")) {
  process.exit(0);
}

const staged = execSync("git diff --cached --name-only --diff-filter=ACMR")
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean);

const touchesGatedPath = staged.some(
  (f) => f.startsWith("src/") || f.startsWith("prisma/") || f.startsWith("docs/"),
);
const touchesChangelog = staged.includes("CHANGELOG.md");

if (touchesGatedPath && !touchesChangelog) {
  console.error(
    "\nBlocked: this commit touches src/, prisma/, or docs/ but not CHANGELOG.md.\n" +
      "Add an entry under [Unreleased] in CHANGELOG.md, or use `chore(release): ...`\n" +
      "/ include [skip-changelog] in the message if this genuinely doesn't need one.\n",
  );
  process.exit(1);
}

process.exit(0);
