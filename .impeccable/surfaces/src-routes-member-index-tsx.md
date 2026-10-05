---
version: 1
slug: "src-routes-member-index-tsx"
primary_target: "src/routes/_member/index.tsx"
related_targets: ["src/routes"]
---

# Surface brief: TOLC Tracker app (all pages)

Scope: every page (Quick View, profile, signup, edit profile, admin, sign-in, connect Discord, members-only, not found). Mode: Operate.
Audience/job: a Member with a recruiter's role in hand finds fitting Members and their Discord handles fast. Admin merges catalogs and manages Members.
Constraints: dark mode; pinned palette #b0baa3 #5a27ba #c12544 #f7ab60; no AI-default fonts; phone width works; CONTEXT.md vocabulary.

## Direction contract

THESIS: The Directory is a conference badge wall: every Member is an attendee badge with a punched lanyard slot, big condensed first name, and a colored status ribbon at its foot. It refuses the category default of neutral dark SaaS cards with one neon accent.

OWN-WORLD: Violet-black ground (#121016) under warm off-white badge-stock surfaces rendered dark (#1d1a22). Ribbons carry the palette at full strength: Actively Looking apricot, Employed and Looking crimson, Employed and Open to Offers violet, Not Looking sage. Archivo condensed heavy for names, Atkinson Hyperlegible Next for body, Atkinson Hyperlegible Mono for Discord handles. TypeScript Badge is a round sticker on the badge.

STORY: The Member sees the whole wall, narrows it with the filter rail, reads ribbons and chips to judge fit, opens a badge for Links, and copies the Discord handle to reach out.

FIRST VIEWPORT: Slim top bar (wordmark left; Directory, Edit profile, Admin, member chip, Sign out right). Left sticky filter rail ~300px with Skills, Target Roles, Seniority, Job Search Status and Search/Clear. Main: heading "Directory" plus Member count, then a 4-column badge grid at 1440. On phones the rail folds into a "Filters" disclosure above the grid.

FORM: Conference Badge Wall, impeccable's pick (rank 1 of 7 on my list), chosen by the Admin over the roll. Seed key c0056b75. Signature interaction: badges hang from their slot and swing a few degrees on hover/focus (pivot at the slot), instant under reduced motion. Raises kept: density (4 columns), whole-cell grid, strict state vocabulary.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
