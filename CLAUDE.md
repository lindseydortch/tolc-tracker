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

## Branching

Each ticket from #2 to #10 gets its own branch and merges to `main` through its own PR. Tickets #11 (Design pass) and #12 (Deploy) don't follow this rule.

Before writing any code for a ticket (including under `/implement`), check the current branch:

- If it is already `feat/<n>-*` for this ticket, continue.
- Otherwise, run `git checkout main && git pull`, then `gh issue develop <n> --name feat/<n>-<slug> --base main --checkout`. This creates the branch and links it to the issue.
- Never commit ticket work directly to `main`.

## Commit messages and PR descriptions

End every commit message and PR description with its own body text. Leave out all Claude attribution: no `Co-Authored-By: Claude` or `Claude-Session` trailers, no "Generated with Claude Code" footer, no session links. This applies to every commit and PR in this project, including squash-merge messages.

## Ticket lifecycle

1. **Build**: `/implement #<n>` on the ticket's branch (TDD, typecheck, tests).
2. **Review**: `/code-review` against `main`. Fix the findings the Admin accepts.
3. **Commit and open a PR**: commit to the ticket branch, push, and open a PR to `main` whose body says `Closes #<n>`. Stop there: the agent never merges.
4. **Approve and merge**: the Admin reviews the PR on GitHub and squash-merges it into `main`, which closes the issue and deletes the branch.
5. **Clean up**: once the ticket branch is deleted, stop everything the ticket started: dev servers, test runs and watchers, and the test Chrome (quit it as in Live testing below). Confirm port 3000 is free.
6. **Next ticket**: every new ticket branch starts from the freshly pulled `main`.

Don't start a ticket until every ticket that blocks it is merged into `main`. Never branch from another ticket's unmerged branch. Tickets that unblock at the same time (such as #7 and #8 after #6) can run in parallel, each on its own branch from `main`.

## Live testing

The chrome-devtools MCP's test Chrome uses one profile, `~/.cache/chrome-devtools-mcp/chrome-profile`, which only one session can have open at a time. Quit that Chrome as soon as each live test ends, even mid-ticket:

```sh
pkill -f "user-data-dir=$HOME/.cache/chrome-devtools-mcp/chrome-profile"
pgrep -f "user-data-dir=$HOME/.cache/chrome-devtools-mcp/chrome-profile" || echo "test Chrome closed"
```

The MCP relaunches it on the next browser call, still signed in.
