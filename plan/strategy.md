# Scholion — strategy

## Status snapshot (2026-11-28)

| Field | Value |
| --- | --- |
| Stage | **Implementation and hardening sprint complete locally.** All P0 and P1 backlog items are Done; CI workflow and README badge are present. Licence and standard legal files remain absent by owner decision. Hosted AI and live Supabase remain unavailable and untested. |
| Latest measured numbers | `npm.cmd test`: **75 pass / 0 fail**, ~10.3 s. `npm.cmd run check`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run bench`: **exit 0**. CI workflows: **1**. Benchmark: synthetic local microbenchmark only. Legal scaffolding files: **none**. |
| Next action | Published and remotely verified: CI run `46153307737` (commit `fae1379`) is green. Next executable item is **M1-1** (synthetic two-page PDF import); human-only gates (live Supabase, phone walkthrough, pilot, launch) stay owner-gated. |
| Verification baseline | Node `v24.18.1`, npm `11.16.0`. Capability tests were re-run with `OLLAMA_URL=http://127.0.0.1:1/api/chat` to prove the suite is deterministic with no model running: 75/75 pass. Exact commands and commit SHAs in `progress.md`. |

## Market and thesis

The product thesis is stated in `docs/PROJECT_ROADMAP.md:13-20` and implemented in the code: one workspace (plan → explain → quiz → progress) across many exam and course tracks, with every generated answer traceable to a saved passage. The implementation evidence is real: track catalog `dist/learning.js:1-230`, official link-only registry `dist/source-registry.js:1-176`, exact character spans `dist/source-spans.js:5-54`, citation highlighting `dist/study.js:78-124,395-415`, and three-question drill with one attempt per question `dist/study.js:158-190,593-635`.

What is **documented but not yet proven**: educational quality of a real model answer at scale (only single live answers recorded at `docs/hermes-progress.md:13-15,21-22`), real learner retention, and any willingness to pay. No market size, conversion or retention number exists in the repository; none is asserted here.

## Users

| User | Need | Evidence status |
| --- | --- | --- |
| Exam candidate (SAT, UNT, ORT, EGE, Gaokao, HKDSE, IELTS/AP/ACT tracks) | Source-grounded practice without generic tutoring | Catalog and atlas implemented (`README.md:35`, `dist/app.js:293-306`); per-track syllabus rules **not** verified (`docs/PROJECT_ROADMAP.md:214-217`). |
| University / workplace learner with own PDFs and notes | Import private material, get cited explanation | TXT/Markdown import works (`dist/study.js:95-112`); **PDF import is not implemented** (`docs/PROJECT_ROADMAP.md:205-210`). |
| Privacy-conscious owner/learner | Data stays local unless accounts are configured | Browser storage `scholion:v1` (`dist/app.js:93-114`); server-side Supabase adapter built and mocked but no live project (`README.md:23-31`, `docs/hermes-progress.md:30`). |
| Employer running a pilot | Team views with explicit permissions | Only personal workspaces exist; M6 is open (`docs/PROJECT_ROADMAP.md:225-228`). |

## Positioning

A "research desk with an evidence rail", not a flashcard app: restrained brutalist interface (`README.md:43`, `dist/styles.css:15-21,739-744`), local-first by default, citations that open the exact saved passage, and a labelled offline sandbox that never calls a model (`dist/app.js:63-91,335`). The AI helper is GrinderAI; the product is Scholion (`README.md:3`). Public build: <https://scholion-beta.vercel.app> (`README.md:19`), with generation returning JSON 502 until a hosted provider is approved (`README.md:21`, `vercel.json:11-14`).

## Metrics (measured, not projected)

| Metric | Value | Source |
| --- | --- | --- |
| Automated checks passing | 75 / 75 | `npm.cmd test` output, 2026-11-28 |
| Syntax/lint/build gates | exit 0 | `npm.cmd run check`, `npm.cmd run lint`, `npm.cmd run build`, 2026-11-28 |
| Tracked files | see `git ls-files --cached \| Measure-Object -Line` in the verification entry | plan/progress.md |
| CI workflows | 1 | `.github/workflows/ci.yml`, added after owner authorization in this session |
| Benchmark / eval harness | 1 synthetic microbenchmark | `npm.cmd run bench`; labelled `model=none; live=none; learnerText=none`; not model-quality evidence |
| Legal/CI scaffolding files | 0 | root listing, 2026-11-25 |
| Live Supabase instance | 0 | `docs/hermes-progress.md:30` and no env keys in tracked files |
| Known defects entered in backlog | 12 | `backlog.md` P0-1…P1-5 |

No user, revenue, retention or latency metrics exist in the repository. Proposed targets in `roadmap.md` are labelled as proposals, never as measurements.

## Risks

| Risk | Evidence | Mitigation / owner gate |
| --- | --- | --- |
| **High — remote workspace clobbered after login.** `commit()` re-reads stale `localStorage` via `readState(state)` (`dist/app.js:117`) while `initAccount()` sets in-memory `state` from remote without writing the key (`dist/app.js:494,503`). A first post-login mutation PUTs the stale local state (`dist/app.js:126-130`). | Code read directly, 2026-11-25. | P0-2. Must be fixed before live accounts carry real learner data. |
| **High — restore endpoint can overwrite any user.** Shared `x-restore-token` header with plain string compare and caller-supplied `userId` (`scripts/account-endpoints.mjs:98-114`). | Code read directly. | P0-7; owner decision required on restore scope. |
| Medium — hosted generation can be killed mid-flight: provider timeout 90 s (`scripts/study-endpoint.mjs:8`), browser 95 s (`dist/app.js:706`), Vercel `maxDuration` 60 s (`vercel.json:13`). | Three sources read. | P0-3. |
| Medium — local server hangs on unmatched API paths: `serve.mjs:33-35` returns after `handleAccountRequest` returns `false` (`scripts/account-endpoints.mjs:60`) without ending the response; Vercel handles this (`api/account.js:11`). | Code read directly. | P0-1. |
| Medium — no rate limiting on signup/login/generate/workspace/restore; only size caps and timeouts (`scripts/study-endpoint.mjs:7-8,119`, `scripts/account-endpoints.mjs:26`). | Code read directly. | P1-1. |
| Medium — session cookie has HttpOnly + SameSite=Lax but no `Secure`, no CSRF token, fixed 1 h lifetime and no refresh (`scripts/account-endpoints.mjs:20-24`, `scripts/supabase.mjs:75-82`). | Code read directly. | P0-7, P1-1. |
| Medium — no CI gate; Vercel `buildCommand` is a syntax check (`vercel.json:4`, `package.json:10`), so tests never block a deploy. | Audited `.github/` empty. | P0-6 (requires owner authorization). |
| Medium — documentation contradicts code and itself: check counts 34/39/49/52/53 (`docs/PROJECT_ROADMAP.md:32`, `docs/hermes-progress.md:12,20,28,38,48`), M2 "ready for review" vs "verified" (`docs/hermes-progress.md:17,23`, `docs/PROJECT_ROADMAP.md:198`), stale single-question data contract (`docs/PROJECT_ROADMAP.md:103` vs `dist/app.js:717-725`), stale assignment (`CHATGPT_NEXT_PROMPT.md:1,7,12,13`). | Cross-read. | P0-5. |
| Medium — privacy claim nuance: no learner text is logged by app code, but provider/GoTrue error messages are echoed to the client (`scripts/account-endpoints.mjs:41-44`, `scripts/supabase.mjs:49-52`); full source text lives in plaintext `localStorage` (`dist/app.js:10,119`). | Code read directly. | P1-2. |
| Low — accessibility gaps: palette has `aria-modal` with no focus trap or `aria-activedescendant` (`dist/index.html:19-21`, `dist/app.js:638,645-658,866-890`); radio focus depends on `:has()` (`dist/study.css:431-442`). | Code read directly. | P1-4. |
| Low — phone/touch walkthrough never executed; tooling had no viewport emulation (`docs/hermes-progress.md:50`). | Documented. | M2-1 (Human gate). |

## Open questions

1. Will Scholion be sold? Owner chose a **proprietary notice** for the future licence but deferred Phase 2, so no `LICENSE` exists yet. Pricing, billing and refunds are undecided.
2. Will a hosted model provider ever be approved? Current posture is loopback-only (`scripts/study-endpoint.mjs:95-100`, `README.md:47`); no hosted endpoint is configured.
3. Will Supabase keys be added to Vercel and a `workspaces` table created with RLS? `docs/PROJECT_ROADMAP.md:242` requires it; `docs/hermes-progress.md:30` confirms it has not happened.
4. What is the restore-token threat model — operator-only disaster recovery, or per-user self-service? This decides P0-7.
5. Is `CHATGPT_NEXT_PROMPT.md` still the intended "next assignment" file, now superseded by `plan/`? It is tracked (`git ls-files`) and stale (`CHATGPT_NEXT_PROMPT.md:1,7,12,13`).
6. Who performs the independent reproduction required by `docs/PROJECT_ROADMAP.md:46-62` for new milestones?
7. Which PDF extraction library is owner-approved for M1-1 (`docs/PROJECT_ROADMAP.md:207`)?

## Session history — exactly what was done

Rows are the work sessions recorded by `git log -20 --format='%h|%H|%ad|%s'` on 2026-11-25, plus this planning session. Test counts are the counts recorded in `docs/hermes-progress.md` at the time, not re-run at those commits.

| Date | Commit | Exactly what was done | Verification recorded at the time |
| --- | --- | --- | --- |
| 2026-11-25 | this session (see `progress.md`) | Three parallel read-only audits (core/data; UI/i18n/docs; tests/CI/packaging); baseline commands run; `plan/` created with five files + index; root README linked. No publish scaffold, licence file, visibility change or push. | `npm test` 53/53; `npm run check` exit 0; `gh auth status` OK; `gh repo view` PUBLIC. |
| 2026-11-25 | `44c36bd` | Record desktop browser walkthrough and sprint fix. | 53 tests after fix (`docs/hermes-progress.md:48`). |
| 2026-11-25 | `1207efa` | Keep sprint exit control visible in the top bar; CSS fix plus regression assertion. | Walkthrough recheck, zero console errors (`docs/hermes-progress.md:47`). |
| 2026-11-25 | `98c8851` | Ignore local scratch and agent working files in `.gitignore`. | Not separately recorded. |
| 2026-11-25 | `bc19937` | Record independent M2 and M5 verification in progress docs. | Independent PASS recorded (`docs/hermes-progress.md:23,31`). |
| 2026-11-25 | `8bbb9f6` | Store passage spans at import; refresh account docs; citation fallback uses stored spans. | 52 tests (`docs/hermes-progress.md:38`). |
| 2026-11-25 | `a68adf0` | Route hosted account endpoints through `api/account.js` via `?route=`. | Vercel `/api/config` 200, `/api/workspace` 503 (`docs/hermes-progress.md:35`). |
| 2026-11-25 | `aa416bc` | Add Supabase-ready accounts, private sync and deletion; M5 foundation. | 52 tests (`docs/hermes-progress.md:28`). |
| 2026-11-25 | `9e337ae` | Complete M2: passage spans and three-question drill. | 49 tests (`docs/hermes-progress.md:20`). |
| 2026-11-25 | `6603009` | Ignore local Vercel project link. | Not separately recorded. |
| 2026-11-25 | `98ce954` | Record M1 live evidence and Vercel deployment. | Live answer checked (`docs/hermes-progress.md:13-15`). |
| 2026-11-25 | `f3202cc` | Enable Vercel deployment with shared generation endpoint. | 39 tests (`docs/hermes-progress.md:12`). |
| 2026-11-24 | `1887bed` | Rename project to Scholion; rebuild design and roadmap; migrate storage key. | 34 tests (`docs/PROJECT_ROADMAP.md:32`). |
| 2026-11-23 | `9dee13b` | Document coverage, glow and server reliability updates. | 28 tests (`docs/hermes-progress.md:121`). |
| 2026-11-23 | `05de225` | Add catalog data-integrity regression tests. | 28 tests (`docs/hermes-progress.md:116`). |
| 2026-11-23 | `b0379ae` | Harden local server startup and publish binding. | HTTP 200 smoke and duplicate-port message (`docs/hermes-progress.md:115`). |
| 2026-11-23 | `c7ff28a` | Add restrained pointer-follow glow on fine pointers only. | `tests/glow.test.js` (`docs/hermes-progress.md:111`). |
| 2026-11-23 | `182ed96` | Show precise per-track coverage from catalog data. | `tests/coverage.test.js` (`docs/hermes-progress.md:107`). |
| 2026-11-23 | `87cc4f6` | Document local GrinderAI setup and verified milestones. | Not separately recorded. |
| 2026-11-23 | `339f9b1` | Test selected-source generation and quiz persistence. | Earlier suite (`docs/hermes-progress.md:94`). |
| 2026-11-23 | `4bac9b9` | Save generated study material, citations and grading progress. | Earlier suite (`docs/hermes-progress.md:94`). |

## Status snapshot — 2026-11-26 (appended, supersedes earlier numbers)

| Field | Value |
| --- | --- |
| Stage | Final AI architecture / study integrity sprint. Local changes complete and verified; **not deployed** (no push authorized). |
| Latest measured numbers | `npm.cmd test` **63 pass / 0 fail** (5832.7765 ms); `npm.cmd run check` exit 0; live `npm.cmd run demo:local` exit 0 with `gpt-oss:20b`, 3 grounded questions and structural/citation PASS; public origin `/` 200, `/api/config` stale `{"accounts":false,"generation":"local-only"}`, generation POST JSON 502. |
| Next action | Complete the P0-2 sign-in mutation regression test, then seek explicit authorization to push/deploy so the public build shows the truthful capability state. |
| Session history addition | 2026-11-26: server-computed generation capability, disabled/labelled generate control, timeout ordering, orphan deletion cascade, duplicate-upload rejection, prompt-injection and timeout regressions, capability matrix, reproducible local demo. Exact commands and results in `progress.md`. |
