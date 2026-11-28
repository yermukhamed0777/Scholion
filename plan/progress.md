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

## 2026-11-26 — Final AI architecture and study integrity sprint

**Scope.** Three parallel read-only audits (architecture/availability, source integrity, workspace reliability) plus implementation of verified defects only. No new exam tracks, no redesign, no licence/visibility change, no push, no hosted provider, no purchase. Local Ollama was started on loopback for the reproducible demo.

**Exactly what changed.**
- `scripts/generation-capability.js` (new): pure resolver plus optional loopback probe; returns status/kind/model/public-safe reason and never a URL or key.
- `scripts/account-endpoints.mjs`: `/api/config` now returns `generation` (kind) and `generationStatus`; accounts and AI availability are independent.
- `scripts/serve.mjs` / `api/account.js`: local runtime probes Ollama; hosted runtime is explicitly marked unavailable; unmatched local API paths now return JSON 404 (P0-1).
- `dist/app.js` / `dist/study.js`: capability state, truthful badge, disabled generate button with visible reason, request guard; remote/migrated state written to `scholion:v1` (P0-2 fix), browser timeout 75 s, stricter generated-study validation, no crash when only `questions` is present.
- `scripts/study-endpoint.mjs`: provider timeout 45 s with `GENERATION_TIMEOUT_MS` override; ordering verified by test (P0-3).
- `scripts/workspace-state.mjs`: deletion cascade now removes orphaned generated study and derived attempts.
- `dist/study.js`: duplicate attachments rejected before commit.
- `scripts/demo-local.mjs` (new) and `npm run demo:local`: reproducible non-sensitive `gpt-oss:20b` demo through the app endpoint.
- `docs/CAPABILITY_MATRIX.md` (new), linked from README; `plan/backlog.md` statuses P0-1/P0-3 Done, P0-2 in progress; `plan/decisions.md` appended.
- Tests added: `tests/generation-availability.test.js`; `tests/source-integrity.test.js`; harness updates in `tests/study-generation.test.js` and `tests/study-drill.test.js` to supply an explicit local capability before generation.

**Exact commands and results.**
| Command | Result |
| --- | --- |
| `node --version` / `npm.cmd --version` | `v24.18.1` / `11.16.0` |
| `git status --short --branch` at start | `## main...origin/main [ahead 1]` |
| `curl.exe --max-time 5 http://127.0.0.1:11434/api/tags` | initially exit 7, HTTP 000 (Ollama stopped) |
| Ollama started on loopback; same probe | HTTP 200, `gpt-oss:20b` present |
| `npm.cmd run check` | exit 0 before and after the changes |
| `npm.cmd test` (final) | **63 tests, 63 pass, 0 fail**, 5832.7765 ms |
| `node --test tests/generation-availability.test.js tests/source-integrity.test.js` | **10 tests, 10 pass, 0 fail** (after adding timeout-ordering and local-404 regressions) |
| `npm.cmd run demo:local` (first run) | HTTP 504, model cold start exceeded 45 s; local override added |
| `npm.cmd run demo:local` (final) | model `gpt-oss:20b`, source `demo-synthetic-triangles`, 3 questions; keyed answers Equilateral / Isosceles / Scalene; `Structural checks: PASS`, `Citation checks: PASS`, exit 0 |
| `curl.exe -sS https://scholion-beta.vercel.app/api/config` | `{"accounts":false,"generation":"local-only"}` — current public build is stale; no `generationStatus` |
| `curl.exe -sS -X POST ... /api/generate-study` | JSON 502 with the documented provider message |
| `curl.exe -sS -o NUL -w '%{http_code}' https://scholion-beta.vercel.app/` | `200` |

**What remains open (mapped to backlog).** P0-2 still needs the full sign-in mutation regression test; P0-4 (engine declaration), P0-5 (doc contradictions), P0-6 (CI, gated), P0-7 (restore threat model, owner decision) remain open. Human-only: live Supabase/RLS/real restore (M1-2), phone/touch walkthrough (M2-1), student pilot (M2-2), launch/domain/pricing (M2-3), and educational checking of every model answer. The public origin has not received this commit; no push was authorized.

## 2026-11-28 — P0/P1 completion, deterministic capability tests and public readiness

**Scope.** Finish every remaining P0 item and the relevant P1 items, make the test suite independent of a running Ollama, add working CI and build gates, then publish a green reviewed state. No hosted model provider and no live Supabase project were configured or contacted. No new exam tracks or redesign.

**Exactly what changed.**

| Surface | Change |
| --- | --- |
| `tests/supabase-account.test.js` | Added a loopback capability stub with explicit available/unavailable answers; the account test no longer depends on a real Ollama. Added cases for HTTP-vs-HTTPS cookie flags, cross-origin CSRF rejection, access-token refresh, restore scope, and sign-out failure clearing cookies. |
| `tests/account-sync.test.js` (new) | P0-2 regression: stale localStorage is seeded, the real app module signs in against a mock remote workspace, a real save-track mutation is clicked, and the single PUT body is asserted to keep the remote entry. |
| `package.json`, `package-lock.json`, `README.md` | P0-4: `engines.node` is now `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` in both manifests; README has one supported-range statement. |
| `scripts/account-endpoints.mjs`, `scripts/supabase.mjs` | P0-7: conditional `Secure`, cross-origin rejection, JSON content-type enforcement, refresh-token cookie and renewal, fixed upstream error messages, scoped restore via `WORKSPACE_RESTORE_USER_IDS`, and cookie clearing on sign-out failure. |
| `scripts/rate-limit.js` (new), `scripts/study-endpoint.mjs`, `scripts/supabase.mjs` | P1-1: fixed-window limiters for generation/auth/workspace/restore with `Retry-After`, env overrides, and no verbatim upstream error bodies. |
| `tests/rate-limit.test.js`, `tests/privacy.test.js` (new) | P1-1/P1-2: quota, retry header, error-bound and no-learner-text-in-logs regressions. |
| `scripts/lint.mjs`, `scripts/bench.mjs`, `scripts/build.mjs` (new), `package.json`, `vercel.json`, `.gitignore`, `.vercelignore` | P1-3/P0-6: real `lint`, `bench` and `build` gates; Vercel `buildCommand` runs the build; generated `build/` is ignored by Git and deployment. |
| `dist/index.html`, `dist/app.js`, `dist/learning.js`, `dist/styles.css`, `dist/study.css`, `tests/workspace-features.test.js` | P1-4: combobox `aria-activedescendant`, Tab focus trap and focus return, `lang` on native track names, `:focus-within` fallback, acid `--signal` limited to correct/progress/clock. The unreferenced hero `<img>` was removed from the DOM. |
| `CHATGPT_NEXT_PROMPT.md`, `README.md`, `plan/decisions.md` | P1-5: the tracked prompt file is now a short pointer to `plan/`; decision appended. |
| `docs/PROJECT_ROADMAP.md`, `docs/hermes-progress.md`, `docs/CAPABILITY_MATRIX.md`, `plan/*.md` | P0-5: one current count (75), one M2 status (`verified`), current data contract, live-smoke and hero claims corrected, plan named as entry point, historical counts labelled per commit. |
| `.github/workflows/ci.yml` | P0-6: `npm ci` → `npm test` → `npm run check` → `npm run lint` → `npm run build` on Node 24.18, push to `main` and PRs. The uncommitted badge in `README.md` was preserved. |

**Exact commands and results (Node v24.18.1, npm.cmd 11.16.0).**

| Command | Result |
| --- | --- |
| `git status --short --branch` at start | `## main...origin/main [ahead 2]`; ` M README.md`, `?? .github/` — the two local commits and the uncommitted badge/workflow were preserved |
| `npm.cmd test` (baseline, before code changes) | 63 tests, 63 pass, 0 fail — only passed because a local Ollama happened to answer the probe; this was the 62/63 flake to remove |
| `node --test tests/supabase-account.test.js` | 5 tests, 5 pass, 0 fail after the stub and security changes |
| `node --test tests/account-sync.test.js` | 1 test, 1 pass, 0 fail |
| `node --test tests/rate-limit.test.js` | 4 tests, 4 pass, 0 fail |
| `node --test tests/privacy.test.js` | 2 tests, 2 pass, 0 fail |
| `node --test tests/workspace-features.test.js` | 10 tests, 10 pass, 0 fail after accessibility changes |
| `npm.cmd ci` | `added 28 packages, and audited 29 packages in 13s`; `found 0 vulnerabilities` |
| `npm.cmd test` (final) | **75 tests, 75 pass, 0 fail**, 15.47 s |
| `npm.cmd test` with `OLLAMA_URL=http://127.0.0.1:1/api/chat` | **75 tests, 75 pass, 0 fail** — determinism proven with no reachable model; the unavailable capability state is asserted explicitly |
| `npm.cmd run check` | exit 0; all 16 `node --check` invocations passed |
| `npm.cmd run lint` | `Lint passed: 41 JavaScript files checked; browser bundles carry no server secrets.` |
| `npm.cmd run build` | `Build passed: 4 deployable files; manifest written to build/manifest.json.` |
| `npm.cmd run bench` | exit 0; labelled `model=none; live=none; learnerText=none` |
| `git diff --check` | exit 0 (only LF→CRLF autocrlf warnings on Windows) |

**What remains open (mapped to backlog).** All P0 and P1 backlog items are Done locally. Remote CI result must be confirmed after the reviewed push. Owner/human gates remain: live Supabase project with RLS and real restore (M1-2), phone/touch walkthrough (M2-1), employer pilot (M2-2), staging and launch/domain/pricing (M2-3), licence decision, and educational checking of every model answer. Hosted AI and live Supabase are deliberately unavailable and untested; no credentials or private material are tracked.

## 2026-11-28 — Publication and remote CI confirmation

**Exactly what changed.** After the green local gates, commit `4f5041b` was pushed with the two earlier local commits (`15e347a`, `ec2ae01`) preserved. The first CI run (`46153164780`) failed only at the lint step: `scripts/lint.mjs` built Windows paths with `join()`, so its `startsWith('scripts/')` filter matched on Linux CI but not on the Windows authoring host, where the privacy rule was silently skipped. Commit `fae1379` normalised path separators and limited the no-log rule to the four request-handling server modules; tooling scripts are allowed to print their own results. `plan/backlog.md` now records the observed remote run.

**Exact commands and results.**

| Command | Result |
| --- | --- |
| `git push origin main` | `44c36bd..4f5041b main -> main`; `git status --short --branch` → `## main...origin/main`; all three local commits published |
| `gh run list --workflow=ci.yml --limit=3` | run `46153164780` (commit `4f5041b`) `failure`; run `46153307737` (commit `fae1379`) `in_progress` |
| `gh run view 46153164780 --log-failed` | lint failure listed only tooling `console` calls (`bench.mjs`, `build.mjs`, `demo-local.mjs`, `lint.mjs`); no test or build failures |
| `npm.cmd run lint` (after fix) | `Lint passed: 41 JavaScript files checked; browser bundles carry no server secrets.` |
| `npm.cmd test` (after fix) | 75 tests, 75 pass, 0 fail |
| `git commit -m "Make lint path matching cross-platform for CI"` / `git push origin main` | `4f5041b..fae1379 main -> main`; working tree clean |
| `gh run watch 46153307737 --exit-status --interval 10` | **success** — checkout, Node 24.18 setup, `npm ci`, `npm test`, `npm run check`, lint and build all green in 27 s. Only annotation: the standard Node 20 action-runner deprecation notice |

**What remains open.** Owner/human gates only: live Supabase with RLS and real restore (M1-2), phone/touch walkthrough (M2-1), employer pilot (M2-2), staging/launch/domain/pricing (M2-3), licence decision and educational checking of model answers. Hosted AI and live Supabase stay explicitly unavailable and untested; no private material or credentials were published.
