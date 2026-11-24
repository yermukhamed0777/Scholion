# Scholion progress

## Current status — 24 November 2026

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
