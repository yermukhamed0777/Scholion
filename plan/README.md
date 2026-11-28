# Plan index — Scholion

Created 2026-11-25. No root `PLAN.md` existed at creation time (checked with `Test-Path PLAN.md` → false), so no file was moved; this folder was built from the audited repository state. This is the single source of truth for execution planning. The older `docs/PROJECT_ROADMAP.md` and `docs/hermes-progress.md` remain as historical evidence records; where they conflict with these files, these files win and the conflict is itself a backlog item.

## The five files

| File | Purpose | Mutability |
| --- | --- | --- |
| [strategy.md](strategy.md) | Market/thesis, users, positioning, metrics, risks, open questions, status snapshot, and a condensed session-history table. | Updated each session when horizon, milestone or work split changes. |
| [roadmap.md](roadmap.md) | THE PLAN: exactly three horizons (short term, midterm, long term), each split into Intelligence / Human work, plus an expansion catalogue of host/database alternatives. | Updated when horizon, milestone or work split changes. |
| [backlog.md](backlog.md) | Ordered executable tasks with stable IDs, `file:line` references, a Done-when criterion for each, and a horizon map. | Ticked, split or added every session. |
| [decisions.md](decisions.md) | Append-only decision log: date, decision, why. | **Append only. Never rewrite old rows.** |
| [progress.md](progress.md) | Append-only session log: exactly what changed, exact verification commands and results, and remaining open items mapped to backlog IDs. | **Append only. Never rewrite old rows.** |

## Binding update convention

After EVERY work session, in the SAME commit as the work:

1. Tick, split or add items in `backlog.md`.
2. Append a `progress.md` entry with exact changes, commands and results.
3. Append to `decisions.md` if direction, scope or cost changed.
4. Update `roadmap.md` and the session-history table in `strategy.md` if the horizon, milestone or work split changed.
5. Update the status snapshot (stage, latest measured numbers, next action) in `strategy.md`.
6. Re-run tests, benchmark/lint and build; record results in `progress.md`.

Research or scoping sessions still produce a plan entry. A session with no code change still appends a short entry naming what was inspected and what remains open.

### Exact verification commands today

As of 28 November 2026 `package.json` defines real `start`, `dev`, `check`, `test`, `lint`, `bench` and `build` scripts, and `.github/workflows/ci.yml` runs them. Step 6 is satisfied by these exact commands; all were green in the verification session recorded in `progress.md`:

```bash
npm ci            # install/dev-dependency gate, Node 24.18.1
npm test          # node --test tests/*.test.js — 75/75 pass
npm run check     # explicit node --check chain
npm run lint      # syntax + publish-safety rules (scripts/lint.mjs)
npm run build     # validates deployable files, writes build/manifest.json
npm run bench     # labelled synthetic microbenchmark, no model, no learner text
```

On this Windows host `npm.ps1` is blocked by the PowerShell execution policy; use `npm.cmd` instead (environment quirk, not a project defect). The build script produces a manifest under the ignored `build/` directory; the benchmark is never presented as live-model evidence.

Root link: [README.md](../README.md).
