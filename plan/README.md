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

`package.json:7-12` currently defines only `start`, `dev`, `check` and `test`. There is **no** benchmark, lint or build script, and `.github/workflows` does not exist. Therefore steps 6 is satisfied by running these exact commands and explicitly recording that no benchmark/lint/build script exists:

```bash
npm ci            # not re-run in the creation session; node_modules already present
npm test          # node --test tests/*.test.js
npm run check     # syntax-only node --check chain; also used as Vercel buildCommand (vercel.json:4)
```

On this Windows host `npm.ps1` is blocked by the PowerShell execution policy; use `npm.cmd` instead (environment quirk, not a project defect). Adding a real `lint`, `bench` and `build` script is backlog item **P1-3**; until then do not claim a benchmark or build gate exists.

Root link: [README.md](../README.md).
