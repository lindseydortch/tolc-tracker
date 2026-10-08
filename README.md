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

## Deploy

The app runs on Netlify (free tier), using the TanStack Start adapter (`@netlify/vite-plugin-tanstack-start`) and a production Neon database. `netlify.toml` holds the build settings.

Run `bash scripts/deploy-wizard.sh` from the repo root. It walks through every dashboard step, which are:

1. Get the Neon `production` connection string, then migrate and seed the database
2. Create the Netlify site from this repo
3. Register a production GitHub OAuth app. GitHub allows one callback URL per app, so production can't share the development app.
4. Add the production redirect to the Discord app
5. Import the env vars into Netlify, redeploy, and check sign-in, the membership gate, and the Directory

The production values are saved to `.env.production.local` (git-ignored). To run a later migration against production: `DATABASE_URL=<production URL> pnpm db:migrate`.
