# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project bootstrap: Next.js 16 (App Router, TypeScript strict, Tailwind CSS v4), pnpm,
  shadcn/ui component primitives.
- Portfolio design tokens (black/white + red accent) layered alongside the shadcn admin
  theme in `src/app/globals.css`.
- Tooling: Prettier, ESLint, Husky + lint-staged, commitlint (Conventional Commits),
  Vitest, Playwright, Storybook.
- Pre-commit/commit-msg hooks enforcing Conventional Commits and requiring a
  `CHANGELOG.md` entry alongside any commit touching `src/`, `prisma/`, or `docs/`.
- AI development scaffold: `AGENTS.md`, `CLAUDE.md`, `docs/ai/` playbooks,
  `.claude/agents/`, `.claude/skills/`, `.codex/prompts/`.
- Prisma data model (`Admin`, `Album`, `Chapter`, `Placement`, `Photo`, `Tag`)
  and initial migration, plus `docker-compose.dev.yml` for a local Postgres
  instance.
- Dev seed script generating placeholder photos (gradient JPEGs via `sharp`,
  fabricated EXIF-like metadata) composed into 3 sample albums/5 chapters,
  and the initial admin user from `.env`.
- Admin authentication: Auth.js Credentials provider against the single
  `Admin` row, JWT sessions, login page at `/admin/login`, an in-memory
  login rate limiter, and a `proxy.ts` (Next.js 16's replacement for
  `middleware.ts`) gating `/admin/**` and mutating `/api/**` routes.
