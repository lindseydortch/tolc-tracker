# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Members of TOLC (the Offer Letter Club), a Discord server for people in tech job searches. The primary scene: a recruiter has just reached out to a Member with a role, and the Member opens the Directory to find which other Members fit it (Target Roles, Seniority, Tech Stack, Job Search Status), then reaches out to them on Discord to pass the Referral along. Browsing to get to know the community is secondary.

The Admin (the TOLC server owner) also uses the app to merge duplicate Skills and Target Roles and to hide, reactivate, or delete Members.

## Product Purpose

A members-only Directory of TOLC Members. It turns "who in the server would fit this role?" from scrolling Discord into a fast filtered lookup, so Referrals actually happen. Success: a Member goes from recruiter message to a short list of fitting Members, with their Discord handles, in under a minute.

## Positioning

It is the referral index of one specific job-search community, gated by real membership in its Discord server. Every profile is a peer who is also searching, described in the community's own vocabulary (Preferred Stack, Stack Layers, TypeScript Badge), not a recruiting marketplace or a generic people directory.

## Operating Context

- Sign in with GitHub, then connect Discord; membership in the TOLC server is checked at signup. Non-members land on a members-only page.
- New Members complete a profile at signup; Members edit only their own profile.
- Quick View: a grid of Member cards (name, Discord handle, Job Search Status, Target Roles, Seniority, Primary Skills, TypeScript Badge), searchable by Skills (all must match), Target Roles, Seniority, and Job Search Status (any match). Search state lives in the URL.
- Profile page: card details plus Preferred Stack by Stack Layer, Secondary Skills, and Links.
- Admin page: Merge Skills or Target Roles; hide, reactivate, or delete Members.
- Contact happens off-app, on Discord.

## Capabilities and Constraints

- Stack: TanStack Start (React 19), Drizzle on Neon Postgres, better-auth. Deploying to Netlify (#12).
- Domain terms in `CONTEXT.md` are binding UI vocabulary (Member, Directory, Quick View, Target Role, Seniority, Job Search Status, Preferred Stack, Stack Layer, Primary/Secondary Skill, TypeScript Badge, Link, Merge, Hidden Member).
- Every Member is listed regardless of Job Search Status.
- Pages must work at phone width.

## Brand Commitments

- No logo or fonts exist yet.
- Dark mode (requested by the Admin).
- Palette (binding, from the Admin): `#b0baa3` (sage), `#5a27ba` (violet), `#c12544` (crimson), `#f7ab60` (apricot).
- Avoid typical AI-default fonts.

## Evidence on Hand

- Seed catalogs: `seed/skills.json`, `seed/roles.json`.
- No real Member data, testimonials, or imagery in the repo. Do not fabricate member counts, placement stats, or claims about outcomes.

## Product Principles

1. Lookup speed beats browsing delight: the path from role to fitting Members is the product.
2. Use the community's own vocabulary exactly; never generic recruiting terms.
3. A profile is a peer, not a candidate listing: respectful, scannable, no ranking.
4. Members-only means every page shows nothing to non-members, and says so plainly.

## Accessibility & Inclusion

No product-specific standard was set; WCAG AA contrast applies by default, which matters for the dark palette.
