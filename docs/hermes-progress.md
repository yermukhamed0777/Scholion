# Scholion progress

> **Current status — 28 November 2026.** One current automated count: **75 tests, 75 pass, 0 fail** (`npm.cmd test`, Node 24.18.1), with `npm run check`, `npm run lint` and `npm run build` green. The active plan and results are in [`plan/progress.md`](../plan/progress.md). Counts inside the dated entries below (28/34/39/49/52/53/61/63) are historical evidence for those commits, not the current total. M2 is `verified` (the earlier "ready for review" heading was superseded by the independent PASS recorded in that entry). Hosted AI and live Supabase remain unavailable and untested.

## Current status — 25 November 2026

**Status:** M0 visual direction confirmed on desktop; phone viewport still pending. M1 `verified`; M2 `verified`; M5 foundation `verified`. No milestone is marked verified from a screenshot, an HTTP 200 alone, a direct provider call, or a mocked response alone; each has live and independently reproduced checks recorded below.

Owner decisions recorded on 25 November 2026: the repository was made public; Vercel hosting was explicitly authorized; no hosted model provider was approved, so generation stays local-only and the public endpoint returns the documented JSON 502; Supabase work is built with environment placeholders rather than a live project, to be activated when the owner adds keys.

### M1 — verified

1. **Commit:** `f3202cc0f5d4c359707c71339592004f8a0de52f` — `Enable Vercel deployment with a shared generation endpoint`. Files: `.vercelignore`, `api/generate-study.js`, `package.json`, `scripts/serve.mjs`, `scripts/study-endpoint.mjs`, `tests/vercel-endpoint.test.js`, `vercel.json`.
2. **Automated evidence:** `npm run check` passed; `npm test` passed 39 checks at that commit; `git diff --check` clean.
3. **Product evidence:** live POST through the app's own endpoint with a synthetic triangle excerpt; model `gpt-oss:20b`, source ID `synthetic-triangle-1`, correct index `3` checked against the excerpt. On Vercel, static assets returned 200 and the generation endpoint returned JSON 502 because no hosted provider is configured.
4. **Live evidence:** the keyed answer "A scalene triangle has at least one side equal to another side" was checked against "A scalene triangle has three sides of different lengths" and is correct. No direct Ollama generation call was substituted.
5. **Independent result:** PASS. A second agent reproduced all four checks from a clean `git archive` extraction of `66030095104086cca2ad2533b2ce578aebad59fc` (scratch scripts at `C:\Users\erm1h\AppData\Local\Temp\scholion-m1-verify\`): live POST with a synthetic logic excerpt keyed index `2` correctly; real-app jsdom DOM path through form → second source → live generation → grading → both citations → reload; 39/39 tests; outage returning JSON 502 while the same process served the homepage with 200. All five definition-of-done boxes are filled. A human-visible phone/desktop walkthrough remains a separate §4.3 row and is still pending.

### M2 — verified

1. **Commit:** `9e337aeecd87193ccf2e416a7eff7c561bd6aadc` — `Complete M2: passage spans and a three-question drill`. Files: `dist/app.js`, `dist/source-spans.js`, `dist/study.css`, `dist/study.js`, `package.json`, `scripts/study-endpoint.mjs`, and three new tests.
2. **Automated evidence:** `npm run check` passed across all modules including the three account modules; `npm test` passed **49** checks at that commit; `git diff --check` clean.
3. **Product evidence:** live endpoint returned three distinct questions from `gpt-oss:20b` for a synthetic excerpt; short exact quotes become `{start,end}` spans, long or absent quotes are dropped. A DOM run through the real app module created a plan, generated a drill, graded all three questions, recorded three distinct attempts, rejected duplicate grading, and highlighted the exact quoted passage in the source card.
4. **Live evidence:** model `gpt-oss:20b`, source ID `synthetic-m2-live`, three distinct prompts with correct indices `1`, `1`, `2`; the quote-derived offsets were exact substrings of the submitted text.
5. **Independent result:** PASS. A second verifier reproduced the checks from a clean `git archive aa416bc` (scratch harnesses under `C:\Users\erm1h\AppData\Local\Temp\scholion-verify\`): live `gpt-oss:20b` endpoint returned three distinct questions with valid keys and exact quote spans; an independent jsdom drive of the real app module graded all three, recorded three distinct attempts, rejected duplicate grading, and highlighted the exact quoted passage. The verifier found one gap — `buildSpans()` was not called at import — which was fixed in `8bbb9f69df4e51636bfb6d1f035ebc09c0e63ac8` (`Store passage spans at import and refresh the account docs`). Imported sources now persist `{start,end,text}` spans and citations fall back to the first stored span. All five definition-of-done boxes are filled.

### M5 foundation — verified

1. **Commit:** `aa416bcef2849d4e6e88b14a460165b593cdae35` — `Add Supabase-ready accounts, private sync and deletion`. Files: `api/account.js`, `dist/app.js`, `dist/styles.css`, `package.json`, `scripts/account-endpoints.mjs`, `scripts/serve.mjs`, `scripts/supabase.mjs`, `scripts/workspace-state.mjs`, `vercel.json`, `tests/supabase-account.test.js`.
2. **Automated evidence:** `npm run check` passed; `npm test` passed **52** checks; `git diff --check` clean.
3. **Product evidence:** a mock GoTrue/PostgREST backend proved sign-up, session, workspace read/write, one-time local migration, per-user isolation, source deletion with derived attempts, token-guarded backup restore, and a clean 503 when unconfigured. Account UI and sync stay disabled unless `/api/config` reports a configured backend.
4. **Live evidence:** not applicable; no live Supabase project or credentials were used, per the owner's decision. Keys belong in Vercel environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optional `SUPABASE_TABLE`, `WORKSPACE_RESTORE_TOKEN`).
5. **Independent result:** PASS with an independent mock GoTrue/PostgREST server (`m5-verify.mjs` in the verifier's temp folder): account isolation, unauthenticated 401, service-role-only workspace access, derived-only deletion, non-overwriting migration, token-gated restore, 503 degradation, and a client-bundle scan with no key material. The verifier found a gap — the hosted routes had no rewrite to `api/account.js` — fixed in `a68adf0` (`Route hosted account endpoints through the account function`). All five definition-of-done boxes are filled for the foundation. A real Supabase project, RLS policies, backup restore from a real instance, and a browser walkthrough are owner-gated before learner material is hosted; no live credentials were used.

### Follow-up fixes — 25 November 2026

- `a68adf0`: hosted `/api/config`, `/api/auth/*` and `/api/workspace*` now rewrite to `api/account.js` with the original path passed as `?route=`; direct calls to the function return 404 instead of hanging. Verified on Vercel: site 200, `/api/config` → `{"accounts":false,"generation":"local-only"}`, `/api/workspace` → JSON 503, `/api/generate-study` → JSON 502.
- `8bbb9f6`: imported sources store exact passage spans at ingestion; citation fallback uses them when the model omits a quote. README no longer claims accounts do not exist.

**Checks after follow-ups:** `npm run check` passed; `npm test` passed **52** checks; `git diff --check` clean.

### Browser walkthrough — desktop, 25 November 2026

Observed in the in-app Chromium browser against the public Vercel build, with screenshots captured and zero console errors:

- Overview rendered with the brutalist ink/concrete/vermilion/acid palette, square controls, sidebar, exam atlas and labelled offline sandbox. Selecting UNT changed the atlas preview; selecting "SAT reading" changed the sandbox sample and explanation.
- Command palette (`Ctrl/Cmd+K`) opened, filtered to "Progress", and navigated to the Progress page.
- Created a plan through the real form with a note; the plan page showed three generated tasks and toggling one persisted it to `scholion:v1`. A second plan was created by uploading a synthetic `.txt` file; the upload form offered editable title and page label, the saved source carried three exact `{start,end,text}` spans, and Progress showed both plans with correct task counts.
- **Bug found and fixed:** in sprint mode `body[data-mode="sprint"] .topbar-actions { display:none }` hid both the clock and the single control needed to exit sprint, violating §5.3. Fixed in `1207efa` (`Keep sprint exit control visible in the top bar`); after redeploy the sprint screenshot showed the acid clock and a visible SPRINT toggle, and one click returned to desk mode. A regression check was added to `tests/workspace-features.test.js`.
- After the fix, `npm run check` passed and `npm test` passed **53** checks; `git diff --check` clean.

Phone layout was **not** emulated: the available browser tooling has no viewport/device emulation control. The responsive rules are present in `dist/styles.css`, but a real narrow-viewport check remains pending.

### Deployment record

- Production URL: <https://scholion-beta.vercel.app> (public, openable).
- Vercel project `scholion` under account `erm1ham3d2204-2491`, connected to `yermukhamed0777/Scholion`.
- `.vercelignore` excludes `Materials/`, `tmp/`, PDFs, agent scratch files, `*.txt`, conversation transcripts, docs, and tests so private local material is never uploaded.
- Accounts remain local-only until Supabase env vars are set; `/api/config` reports `accounts:false`.

## Previous status — 24 November 2026

**Status:** M0 identity, migration, and design baseline: `in progress` pending owner's visual confirmation. M1 live generation: `open`.

The project was renamed to Scholion across the GitHub repository, package, UI, metadata, docs, prompts, and browser storage; GrinderAI kept its name. GitHub repo: `yermukhamed0777/Scholion`; local remote updated.

Changed in this pass:

- `dist/app.js`, `dist/index.html`: Scholion wordmark and page title, metadata description and theme colour, `scholion:v1` storage key with a one-time migration from `allaroundprep:v1`, separate `scholion:mode` preference, exam atlas, labelled offline sandbox, command palette, sprint/desk modes, and fresh DOM assertions for each interaction.
- `dist/styles.css`, `dist/study.css`: brutalist tokens (ink, concrete, vermilion, acid), square geometry, hairline borders, no glass or drop shadows; restrained pointer accent; sticky citation rail; hint reveal styling.
- `dist/study.js`: source desk labels, cited-passage state on citation activation, and a progressive hint before answer checking.
- `scripts/serve.mjs`: Scholion startup banner.
- `docs/PROJECT_ROADMAP.md`: rewritten with architecture, data contracts, provider boundary, evidence gates, design rationale from Gemini's review, and seven narrow milestones.
- `CHATGPT_NEXT_PROMPT.md`: paste-ready M1 assignment.
- `tests/workspace-features.test.js`: six new checks for migration, atlas, sandbox, focus mode, command palette, and hints.

Checks run:

- `npm run check` — passed.
- `npm test` — 34 checks, all passed (28 before this pass).
- Rendered home view captured from `node scripts/serve.mjs 4183` and inspected; atlas, sandbox, brutalist palette, and square controls are visible and readable.

Not verified: a real `gpt-oss:20b` answer through the app, PDF import, accounts, and hosting. Ollama was not started in this pass. Next action is M1 in `CHATGPT_NEXT_PROMPT.md`.

## M0 Upload and citations

The study plan accepts text and Markdown attachments and saves each source title and optional page range. The import regression verifies distinct citations, blank ranges, and reopening the right excerpt from saved state.

## M1 GrinderAI from one selected source

The app sends the selected excerpt to local Ollama and validates the returned explanation and four-choice question. A learner can open a source citation, check an answer, and revisit the latest generated question and feedback after reload. Progress includes generated quiz attempts. The endpoint returns a structured error when the provider fails and the app continues serving the workspace.

### Verification on November 23, 2026

- `npm run check` passed.
- `npm test` passed all nine checks. They exercise both Ollama response formats with controlled providers, the outage path, normal import and source selection, grading, and reopening saved citations.
- A live attempt found Ollama stopped at the default loopback address. The app returned HTTP 502. The model result and regular-browser check are pending.

### Next check

With local Ollama running, generate from a synthetic logic excerpt through the actual app endpoint. Verify the returned model, source ID, and keyed answer. Then repeat the import, generation, grading, citation, and reload flow in a regular browser. Continue task editing and PDF import from the [project roadmap](PROJECT_ROADMAP.md).

## Follow-up contributions on November 23, 2026

These changes are on `feature/editable-source-info` as focused commits after `87cc4f6`. They do not change the M1 generation path.

### Catalog coverage (M3)

- `182ed96`: the catalog now shows per-track counts of original sample questions and official links, derived from `learning.js` and `source-registry.js` instead of a hard-coded label. Covered by `tests/coverage.test.js`.

### Pointer-follow glow (M4)

- `c7ff28a`: track cards and quick links show a restrained cursor-follow highlight via `dist/glow.js`. It attaches only on fine pointers and switches off for reduced motion, leaving the keyboard focus outline unchanged. Covered by `tests/glow.test.js`.

### Server reliability and hosting

- `b0379ae`: `scripts/serve.mjs` binds `0.0.0.0` when `PORT` is set and loopback for local development, reports `EADDRINUSE` cleanly, and offers an `npm run dev` alias. Config resolution is covered by `tests/server-config.test.js`. A smoke run served the homepage with HTTP 200 and a second instance on the same port exited with a message rather than a crash.
- `05de225`: `tests/catalog.test.js` guards catalog integrity for the M3 expansion (unique ids, valid answer keys, real track references, link-only sources with rights evidence and HTTPS urls).

### Checks run

- `npm run check` passed across all modules including the new `coverage.js`, `glow.js`, and `server-config.js`.
- `npm test` passed 28 checks: the nine earlier checks plus coverage, glow, server-config, and catalog integrity tests.
- Live model generation remains unverified because Ollama is stopped. That is still the next milestone, not a regression from these changes.
