# TOLC Tracker

Read `CONTEXT.md` for domain language and `docs/adr/` for past decisions.

## Design: wait for reference images

Do not implement visual design (styling, layout, theme, component look) yet. The Admin will add design reference images to the repo once the TanStack Start project is scaffolded. Build functionality with unstyled markup until then, and match those images once they exist.

## Seed catalogs

`seed/skills.json` and `seed/roles.json` are the starter Skill Catalog and Role Catalog. Each entry has a canonical `name` and its `aliases`. Skills may have a `suggestedLayer` (`frontendFramework`, `backendFramework`, `backendLanguage`, `database`), which only decides which Stack Layer dropdown suggests it. Aliases only list genuinely different names, because matching already ignores case, spaces, dots, hyphens, and underscores ("React.js" = "reactjs").

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for lindseydortch/tolc-tracker, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.
