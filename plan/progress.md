# Progress — Scholion

Append-only session log. Add new entries at the top or bottom? **Append at the bottom only.** Never edit or delete an existing entry.

## 2026-11-25 — Phase 1 audit + plan creation (research/planning session)

**Scope.** Plan-only, by owner decision: Phase 1, Phase 3, Phase 4 and verification. Phase 2 (licence file, CI, push, settings) explicitly skipped. Docs language: English. Repo visibility unchanged (public). No code behaviour was changed.

**Exactly what changed (files / surfaces):**

| Surface | Change |
| --- | --- |
| `plan/README.md` | Created: index of the five files + binding update convention + exact verification commands (including the honest "no benchmark/lint/build script" note). |
| `plan/strategy.md` | Created: status snapshot, thesis, users, positioning, measured metrics, risks, open questions, 21-row session-history table. |
| `plan/roadmap.md` | Created: three horizons with per-horizon Intelligence/Human splits, Done-when / exit criteria, and the alternatives-by-job expansion with selection rule. |
| `plan/backlog.md` | Created: 20 stable-ID tasks (P0-1…P1-5, M1-1…M4-1) with `file:line` refs and Done-when criteria, plus horizon map. |
| `plan/decisions.md` | Created with 9 append-only rows recording owner choices and planning scope. |
| `plan/progress.md` | This entry. |
| `README.md` | Added a `## Planning` section linking `plan/README.md`; updated `## Continue development` to name the plan first. No other README claims were edited. |

No source, test, `dist/`, `scripts/`, `api/`, `vercel.json`, `.gitignore` or `.vercelignore` content was changed. No LICENSE/THIRD_PARTY_NOTICES/CONTRIBUTING/CHANGELOG/SECURITY, no `.github/workflows`, no repo settings change, no push.

**Exact commands run and results (baseline, before writing plan files):**

| Command | Result |
| --- | --- |
| `Get-ChildItem -Force` in repo root | 25 root entries; `.github`, `.vercel`, `api`, `dist`, `docs`, `Materials`, `scripts`, `testdir`, `tests`, `tmp` present. |
| `git status --short --branch` | `## main...origin/main` — clean, in sync. |
| `git log --oneline -15` | HEAD `44c36bd`; recent subjects recorded in `strategy.md` session history. |
| `git remote -v` | `origin https://github.com/yermukhamed0777/Scholion.git` (fetch/push). |
| `git branch -a` | `main`, branches `codex/grinderai-first-excerpt`, `feature/editable-source-info`, `remotes/origin/main`. |
| `Test-Path plan` | False — no `plan/` folder existed. |
| `Test-Path PLAN.md` | False — no root `PLAN.md` to move. |
| `node --version` | `v24.18.1`. |
| `npm --version` | Failed: PowerShell execution policy blocks `npm.ps1` (environment quirk). |
| `npm.cmd --version` | `11.16.0`. |
| `node -p "require('./node_modules/jsdom/package.json').engines"` | `{ node: '^22.22.2 || ^24.15.0 || >=26.0.0' }`. |
| `npm.cmd run check` (baseline) | exit 0; all 16 `node --check` invocations passed. |
| `npm.cmd test` (baseline) | `tests 53`, `pass 53`, `fail 0`, `duration_ms 5564.8347`, exit 0. |
| `gh auth status` | Logged in as `yermukhamed0777`; token scopes `delete_repo`, `gist`, `read:org`, `repo`, `workflow`; exit 0. |
| `gh repo view yermukhamed0777/Scholion --json ...` | `visibility: PUBLIC`, `isPrivate: false`, `defaultBranchRef: main`, exit 0. |
| `git ls-files` | 42 tracked files; no `.env`, no secrets; `tmp/`, `Materials/`, `testdir/`, `HERMES_*.txt`, `Scholion-conversation.md`, `.workbuddy-ai/`, `.vercel/` correctly untracked; `tests/test_provider_failure.js` ignored. |
| `Get-Content .gitignore`, `.vercelignore` | 22 and 14 lines respectively; private material excluded from Git and deployment. |
| `Get-ChildItem -Recurse .github` | Empty — 0 CI workflows. |
| `git log --format='%h\|%H\|%ad\|%s' --date=short -20` | 20 dated commits used for the session-history table. |
| `git rev-parse HEAD` | `44c36bdd45b044ba5dc985017ea796eb21b4ddc2`. |

**Audits (parallel, read-only):** three subagents inspected (a) core/data layer, (b) UI/i18n/styles/docs, (c) tests/CI/packaging. Their highest-severity claims were independently re-read before entering the backlog:

- `dist/app.js:93-114,116-133` + `dist/app.js:487-507` — stale localStorage can overwrite the remote workspace after sign-in → **P0-2** (verified by direct read).
- `scripts/serve.mjs:33-35` + `scripts/account-endpoints.mjs:58-60` + `api/account.js:11` — unmatched local API path never gets a response → **P0-1** (verified by direct read).
- `scripts/study-endpoint.mjs:8`, `dist/app.js:706`, `vercel.json:11-14` — 90 s / 95 s / 60 s timeout mismatch → **P0-3** (verified by direct read).
- `scripts/account-endpoints.mjs:20-24,98-114` — cookie flags and cross-user restore scope → **P0-7** (verified by direct read).
- `package.json:13-15` vs `package-lock.json:180` vs `README.md:9,55` — engine declaration mismatch → **P0-4** (verified by direct read and `node -p`).
- `docs/PROJECT_ROADMAP.md:32,38,103,125,148,155,158,198,240` and `docs/hermes-progress.md:12,17,20,28,38,48` — contradictory check counts/statuses → **P0-5** (verified by direct read).
- `.github/` empty, `package.json:7-12`, `vercel.json:4` — no CI, no benchmark/lint/build script, syntax check used as build command → **P0-6**, **P1-3** (verified by direct read and directory listing).

Audits also reported: no i18n system (`dist/index.html:2`, inline English strings), palette accessibility gaps (`dist/index.html:19-21`, `dist/app.js:638,645-658,866-890`), no rate limiting (`scripts/account-endpoints.mjs:26`), and no live Supabase/Ollama evidence (`docs/hermes-progress.md:30`). These are entered as **P1-1**, **P1-4**, **M1-2**, **M1-3**; they were not re-executed live in this session and are labelled as code/documentation findings, not runtime proofs.

**Exact commands run and results (final verification, after all plan files were written):**

| Command | Result |
| --- | --- |
| `npm.cmd test` | `tests 53`, `pass 53`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`, `duration_ms 5803.567`, exit code 0. |
| `npm.cmd run check` | exit code 0; no syntax errors. |
| `git diff --check` | exit code 0; no whitespace errors. |
| `git status --short --branch` | `## main...origin/main`; ` M README.md`, `?? plan/`. |

No CI exists, so there is no CI run to confirm. Push was deliberately not performed.

**What remains open (mapped to backlog IDs):**

- Immediate next actions: **P0-1**, **P0-2**.
- Authorization / owner gates: **P0-6** (CI), **P0-7** (restore threat model), **P1-5** (prompt-artifact policy), **M1-2** (live Supabase keys), **M2-1** (phone walkthrough), **M2-2** (pilot), **M2-3** (launch/domain/pricing).
- Publish scaffold still absent by design: licence, third-party notices, contributing, changelog, security policy, CI badge — future Phase 2 only.
- Status snapshot and session-history table in `strategy.md` reflect this session's measured numbers and commit.
