# TOLC Tracker

A members-only Directory of the TOLC (the Offer Letter Club) Discord server. Domain language lives in `CONTEXT.md`; decisions in `docs/adr/`.

## Local setup

1. `pnpm install`
2. Paste the Neon `development` branch's pooled connection string into `DATABASE_URL` in `.env.local` (created from `.env.example`, git-ignored)
3. `pnpm db:migrate` to create the tables
4. `pnpm db:seed` to load the Skill Catalog and Role Catalog (safe to re-run)
5. `pnpm dev` and open http://localhost:3000

## Scripts

- `pnpm test`: Directory module tests against an in-memory Postgres (PGlite), no Neon needed
- `pnpm typecheck`
- `pnpm db:generate`: create a migration after changing the Drizzle schema
- `pnpm build`
