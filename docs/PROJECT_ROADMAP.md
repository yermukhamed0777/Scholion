# Scholion project roadmap

Scholion is one source-grounded workspace for exam preparation, university coursework, and workplace learning. A learner brings a goal, a track, or their own material; GrinderAI explains the material, proposes tasks, writes a question, and every claim can be traced back to the passage it came from. The AI helper keeps its name, **GrinderAI**. The product name, repository, package, browser storage, UI, and documentation are **Scholion**.

This document replaces the earlier milestone list. It keeps what was verified, removes ambiguous completion language, and adds the architecture and working rules needed to continue development with ChatGPT without repeating the earlier cycle of optimistic reports and failed re-verification.

Repository: <https://github.com/yermukhamed0777/Scholion> · Progress log: [hermes-progress.md](hermes-progress.md) · Next paste-ready assignment: [CHATGPT_NEXT_PROMPT.md](../CHATGPT_NEXT_PROMPT.md)

---

## 1. Product thesis

| Claim | What it means in the product | What would disprove it |
| --- | --- | --- |
| One workspace for many kinds of study | SAT, ACT, AP, IELTS, UNT, ORT, Uzbekistan admissions, EGE, Gaokao, HKDSE, university courses, and self-directed skills share the same plan → explain → quiz → progress flow. | A new exam needs a separate UI or a separate data shape. |
| Grounded answers, not generic tutoring | GrinderAI receives one selected excerpt, returns a structured explanation and question, and both link back to that exact saved source. | An answer survives when its source is deleted, or a citation opens a different passage. |
| The learner stays in control | Source titles and page labels are editable, tasks are editable, attempts are reviewable, and private material never enters the repository. | A model-invented page label is shown as fact, or a book is tracked by Git. |
| Calm by default, focused on demand | The normal interface is a restrained research desk; an exam sprint mode removes navigation and shows a clock for timed work. | Sprint mode changes learner data or cannot be exited with one control. |

Scholion is deliberately **not** a cartoon flashcard app and not a cramped test bank. It borrows the focus of a developer tool and the margin notes of a research desk.

---

## 2. Verified starting point (24 November 2026)

| Area | Actual state | Evidence |
| --- | --- | --- |
| Identity | GitHub repository renamed to `yermukhamed0777/Scholion`; local remote updated; package name `scholion`; UI title, brand, metadata, server banner, docs, prompts, and transcript use Scholion. GrinderAI unchanged. | `gh repo view`, `git remote -v`, repository grep. |
| Learner data | Browser key is `scholion:v1`. Plans saved under `allaroundprep:v1` migrate on first read and the legacy key is removed after a successful copy. | `tests/workspace-features.test.js`. |
| Core flow | TXT/Markdown import with editable title and page range; cited explanation and four-choice question from a selected source; grading; reload persistence; Progress view. | `tests/study-import.test.js`, `tests/study-generation.test.js`. |
| Provider boundary | Server-side `POST /api/generate-study`, local-only Ollama URL allowlist, schema validation, 400/413/415/502/504 errors, same process keeps serving static files after an outage. | `tests/test_provider_failure.test.js`. |
| Automated checks | `npm run check` passes; `npm test` passes **34** checks. | Command output on 24 November 2026. |
| Design layer | Brutalist ink/concrete/vermilion/acid palette, square geometry, exam atlas, labelled offline sandbox, command palette, focus modes, restrained cursor tracking, margin citation rail, progressive hints. | Screenshot of the rendered home view; feature tests. |
| Still open | A real `gpt-oss:20b` response through the app was not observed on 23 November (Ollama stopped). PDF ingestion, full exam simulations, accounts, and hosting are not built. | Progress log and previous live attempt. |

A green test suite is necessary but not sufficient. Live-model and regular-browser checks stay open until they are observed and recorded.

**Owner decision, 25 November 2026:** the repository was made public and hosting on Vercel was explicitly authorized, overriding the default hold in section 3. The build is at <https://scholion-beta.vercel.app>. No hosted model provider was approved, so generation on the public build returns the documented JSON 502; Supabase was built with environment placeholders and mocks rather than a live project. M1 was independently reproduced and is `verified`. M2 (passage spans, three-question drill) and the M5 account foundation have commits and tests but await independent confirmation. PDF import, a live Supabase instance with RLS and backup restore, and a human-visible phone/desktop walkthrough remain owner-gated.

---

## 3. Roles and working process

The earlier transcript shows the same failure pattern several times: a work agent reported a milestone as finished, an independent check ran the real UI or endpoint, and the milestone turned out to be incomplete. The process below exists to remove that ambiguity.

| Role | Owns | Does not do |
| --- | --- | --- |
| Owner | Chooses materials and tracks, approves source rights, judges educational correctness, approves pushes, deployment, purchases, and account/team permissions. | Does not need to debug implementation details. |
| ChatGPT (primary editor) | One milestone at a time: implement through the app's real entry points, add regression tests, run checks, write the evidence entry, commit locally. | Does not mark a milestone verified from a screenshot, a direct API call to Ollama, or state injected into browser storage alone. |
| Independent verifier (owner or a second agent) | Reproduces the acceptance checks from the recorded commit and fixture, using the real UI or the app's own endpoint. Confirms or rejects the milestone. | Does not change implementation code during verification unless assigned a targeted repair. |

### Definition of done for every milestone

A milestone is **done** only when all five boxes are filled in the progress log:

1. **Commit**: full SHA and the exact files changed.
2. **Automated evidence**: commands run and their results (`npm run check`, `npm test`, targeted tests).
3. **Product evidence**: action through the real UI or the app endpoint, with the observed title, page label, passage, answer, or error written down. A fixture name is not evidence that the form was used.
4. **Live evidence when the milestone involves GrinderAI**: model name, selected source ID, and answer checked against the excerpt. A direct Ollama call is labelled as a provider check and never substituted for the app result.
5. **Independent result**: reproduced or explicitly marked pending by the verifier, with the blocker named if it is not reproducible.

Status words: `in progress` → `ready for review` (local commit, evidence recorded) → `verified` (independent reproduction) → `blocked` (named dependency and smallest unblock action). Keep one current entry per milestone in `docs/hermes-progress.md`; do not add duplicate success entries.

### Operating rules

- One active milestone and one primary editor. Research and content review may run alongside implementation.
- Inspect `git status`, the staged file list, and `git diff --cached` before any commit. Commit focused, genuinely useful changes; no empty commits for contribution streaks.
- `Materials/`, `*.pdf`, extracted private text, derived private notes, credentials, scratch harnesses, and `tmp/` stay local. Only synthetic fixtures and code enter Git.
- Ask the owner before pushing, opening a PR, deploying, sending material to another service, or spending money. The rename baseline was pushed on explicit owner instruction; later work follows this rule.
- Never claim a browser check from a stored screenshot copied between steps. Record a fresh assertion or capture for each step.
- Keep private course text local; use synthetic passages for automated tests and live smoke checks unless the owner approves the specific passage.

---

## 4. Technical architecture

The current code is dependency-light ES modules served by a small Node HTTP server. Keep that shape while making the boundaries explicit. The goal is to add exams, providers, and storage backends without rewriting views.

```text
dist/index.html        shell, metadata, skip link, command-palette host
dist/app.js            shell renderer, routing, state adapter, UI actions, focus modes
dist/ui.js             escaping, icon set (single XSS boundary for strings)
dist/learning.js       track catalog, original sample questions, plan templates
dist/source-registry.js  official link-only resources with rights evidence
dist/coverage.js       derived per-track coverage
dist/study.js          study views, citation rail, upload form, quiz rendering
dist/glow.js           optional pointer tracking
dist/styles.css        brutalist design tokens and shell components
dist/study.css         study-specific components
scripts/serve.mjs      static files + same-origin generation endpoint + provider adapter
scripts/server-config.js host/port resolution
tests/                 DOM, data, API, and feature regression checks
```

### 4.1 Data contracts

Keep these shapes versioned in `scholion:v1`. Additive fields are allowed; breaking changes require `scholion:v2` and a migration test.

| Object | Required fields | Rules |
| --- | --- | --- |
| `Source` | `id`, `name`, `title`, `text` | `pages` optional and always learner-supplied; never inferred from a filename. `text` is plain text from an allowed local file. |
| `PlanEntry` | `id`, `title`, `notes`, `sources`, `tasks`, `createdAt` | Tasks are `{ id, title, done }` and remain editable. `generatedStudy` is optional. |
| `GeneratedStudy` | `id`, `sourceId`, `model`, `explanation`, `question`, `answer?` | `sourceId` must match an existing source. Question has four distinct choices, a valid `correctIndex`, and a `rationale`. |
| `Attempt` | `questionId`, `choiceIndex`, `correct`, `createdAt` | Generated attempts also carry `entryId` and `generationId`. Grading is one attempt per question. |
| `Track` | `id`, `name`, `category`, `region`, `description`, `topics`, `tone` | `nativeName`, `syllabusVersion`, `language`, `reviewStatus`, and `rightsStatus` are added as evidence becomes available. |

Storage adapter responsibilities: read new key, migrate a legacy key once, validate shape, write atomically, surface a clear user message when the browser cannot save, and keep focus-mode preference separate from learner plans. The `storage` event must refresh open tabs for both current and legacy keys.

### 4.2 Generation boundary

- The browser only talks to the same-origin `/api/generate-study`. No model key or provider URL reaches client code.
- The server resolves `OLLAMA_URL` and rejects any non-loopback or credential-bearing URL by default. A hosted private endpoint needs an explicit owner decision and a server-side allowlist entry.
- The server owns the prompt, JSON schema, timeout, and output validation. Excerpt text is data: instructions inside it are never executed as system instructions.
- Model output is checked for exactly four distinct choices, a valid keyed answer, non-empty explanation and rationale, and a `sourceId` equal to the submitted one. Unexpected fields are dropped.
- Error taxonomy: `400` malformed client input, `413` oversized request, `415` wrong media type, `502` provider unavailable or invalid output, `504` provider timeout. Every error is JSON with a readable message; the static app keeps responding.
- No learner text, excerpt, or credential in logs or committed fixtures. Record provider name, model name, source ID, and status only.

### 4.3 Test layers

| Layer | What it proves | Current coverage |
| --- | --- | --- |
| Pure data | Catalog ids, answer keys, rights evidence, coverage labels, plan templates | `catalog.test.js`, `coverage.test.js`, part of `study-generation.test.js` |
| DOM/feature | Real form change and submit, edited metadata, citations after remount, atlas/sandbox/focus/command/hint interactions, migration | `study-import.test.js`, `workspace-features.test.js` |
| API contract | Generation with both Ollama wire formats, outage, malformed input, valid output | `test_provider_failure.test.js` |
| Live smoke | One real model answer through the app, answer checked against the excerpt | Pending; owner runs with Ollama up |
| Browser walkthrough | A human-visible path on phone and desktop, keyboard and touch states | Pending; record fresh assertions per step |

Test doubles are labelled in test names and logs. A mocked provider proves the contract, never the educational quality of a real answer.

---

## 5. Design system

Gemini's comparative review was useful for the interaction ideas, but its navy/glass assumptions conflicted with the requested brutal direction. The visual system below keeps the useful mechanics and replaces the polish.

### 5.1 Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--background` / `--sidebar` | `#101010` / `#0b0b0a` | Ink field and darker navigation column. |
| `--surface` / `--field` | `#171715` / `#0b0b0a` | Flat concrete panels and recessed fields. |
| `--border` / `--border-strong` | `#3a3a34` / `#5b5b52` | Hairline rules; the structure of the design. |
| `--text` / `--muted` | `#f2f1ea` / `#a6a49a` | Paper text and secondary copy. |
| `--accent` | `#e5442b` | Vermilion: primary action, active state, citation connector. |
| `--signal` | `#d9f253` | Acid: correct answer, progress fill, focus clock. Never used for decoration. |
| `--radius` | `2px` | Square, engineered corners; no glass, no drop shadows. |

Type: system sans for reading, monospace for labels, controls, and metadata. The hero uses tight, heavy type instead of an illustration; the old hero image remains in the repository but is not rendered. Contrast is checked for body text, muted text, and both signal colours on dark surfaces.

### 5.2 Interaction patterns adopted from the review

| Idea from Gemini | Scholion implementation | Reason / limits |
| --- | --- | --- |
| Exam-authentic practice | Exam sprint mode hides the sidebar and secondary cards, shows a clock, and keeps only the question surface. | Full Bluebook replica waits for a verified track-specific exam format; do not fake timing rules. |
| Three-column cited AI workspace | Tasks stay left; the source desk and GrinderAI output stay in a sticky right rail; citations open the matching passage in place and mark it as cited. | True character-offset highlighting needs source spans from ingestion (M2); current version highlights the passage card. |
| Command palette | `Ctrl/Cmd+K` opens a searchable list of pages, tracks, and plans; arrows and Enter work. | Faster than nested navigation across twelve tracks and many plans. |
| Progressive hint reveals | The existing `hint` field is now shown on demand before the answer is checked. | Keeps the struggle useful without giving away the key. |
| Instant deck conversion | Sandbox shows three pills and a cited mini-question offline; real deck conversion is a roadmap milestone. | An offline demo must be labelled as such; a real 3-question drill needs schema and grading changes. |
| Interactive exam atlas | A strip of live format pills swaps a preview card on the landing view. | Communicates the product's breadth without a decorative globe or unverified flags. |
| Cursor-tracking surface light | Kept, but reduced to a faint vermilion wash plus an accent border on fine pointers only; reduced motion disables it. | "Brutal, not too shiny" means structure first; the keyboard focus ring remains authoritative. |
| Split-screen desk and margin | Source passage and GrinderAI output are side by side with connector pills. | Citation verification should be a glance, not a collapsed toggle. |

Deferred deliberately: cartoon mascot art, glossy gradients, animated globe, and unlabelled demo answers. They would weaken the research-desk character and risk implying model output where none occurred.

### 5.3 Accessibility and responsiveness

- Every new control is a real `button` or `a`, with an accessible name and visible focus style; palette dialog uses `aria-modal`, results use `role="option"`.
- Sprint mode must always be reversible from the top bar; it changes atmosphere only and never deletes or rewrites a plan.
- Pointer glow is gated by `(hover: hover) and (pointer: fine)` and `prefers-reduced-motion`; it never replaces focus styling.
- Phone layout collapses the atlas and sandbox to one column, keeps the citation rail reachable, and preserves the same actions without hover.

---

## 6. Milestones and acceptance gates

Milestones are numbered from the verified baseline. `Done` means owner-approved evidence exists; `open` means the next editor may start.

### M0 — Identity, migration, and design baseline — done

- [x] Repository, package, storage key, UI text, titles, metadata, docs, prompts, and server banner renamed to Scholion; GrinderAI preserved.
- [x] Legacy browser state migrates to `scholion:v1` and is removed only after a successful copy.
- [x] Brutalist tokens, square geometry, atlas, labelled sandbox, command palette, sprint/desk modes, restrained cursor tracking, citation rail, and hint reveal implemented.
- [x] `npm run check` and all 34 tests pass; rendered home view inspected.
- [ ] Owner to confirm the visual direction after using the app on a phone and desktop.

### M1 — Prove one live GrinderAI answer through the app — verified

Connect the app endpoint to the installed local `gpt-oss:20b` and observe one complete result. Required evidence:

1. Ollama running and reachable from the process that runs `scripts/serve.mjs`.
2. A POST to the app's `/api/generate-study` with a short synthetic excerpt; record model name, source ID, explanation, question, and keyed answer.
3. The keyed answer checked by a human against the excerpt; a wrong or unsupported answer is a failed milestone, not a UI success.
4. A plan created through the real form, with the second of two sources selected, explanation and question generated, answer graded, both citations opened, and all of it visible after reload.
5. Outage regression still green: provider down returns JSON 502 and the same process serves the homepage with 200.

If the model is unavailable, record the exact error and keep the milestone open. Do not substitute a direct provider call or a test double.

### M2 — Passage-anchored citation and three-question drill — verified

- Store source spans (`start`, `end`, optional printed page label) with imported text. A citation should highlight the exact sentence or paragraph, not only the passage card.
- Extend the generation schema from one question to three distinct questions with per-question rationales and validated keys; keep one-question results readable for older plans.
- Add an "instant drill" action in the study rail that grades all three questions and records attempts once each.
- Keep M0/M1 regressions green; add tests for offsets, out-of-range spans, and duplicate grading.

### M3 — PDF import with page fidelity — open

- Accept bounded text-based PDFs; preserve file page index and printed page label separately; extract with a local library approved by the owner.
- Scan or unreadable file shows "OCR needed" and is never silently passed to the model.
- Test with a synthetic two-page PDF with known text, then one owner-approved course file stored only in `Materials/`.
- Private extracted text and derived notes stay out of Git and out of static assets.

### M4 — Catalog depth and timed practice — open

- Extend track records with `syllabusVersion`, `language`, `rightsStatus`, and `reviewStatus`; show coverage from data only.
- Review official links for every regional exam; confirm Gaokao province and year before adding any scored material. Keep publisher-restricted content link-only.
- Build timed practice from the verified exam structure of one track at a time; no score conversion without published rules and enough permitted items.
- Test keyboard-only completion, phone layout, empty/loading/error/offline states, and contrast of vermilion and acid on dark surfaces.

### M5 — Private accounts and data ownership — foundation verified

- Before hosting learner material: authentication, per-user access checks, server-side storage, and a tested migration from browser-local plans.
- Let a learner delete a source and all derived explanations, quizzes, and attempts; verify deletion across backups.
- Model endpoints and credentials remain server-side; restore a backup in a test environment before launch.

### M6 — Employer pilot — open

- Private personal workspaces first. Enable team views only after invitations, documented employee/employer permissions, and tests for both roles.
- Owner decides what team administrators may see; no implicit access to employee notes or materials.

### M7 — Staging and launch — open

- Stage from a reviewed commit; test sign-in, import, citations, generation, grading, progress, deletion, and backup recovery on the deployed build.
- Publish only verified track coverage and advertised features. Owner selects and approves the custom `.app` domain, hosting, DNS, and pricing.
- Launch is complete when a learner can finish the supported flow at the approved domain and see accurate coverage.

---

## 7. Immediate sequence

1. M1, M2 and the M5 foundation are verified in `docs/hermes-progress.md` with independent results; do not re-open them without a failing regression.
2. Run a human-visible phone and desktop walkthrough and record fresh assertions per step; this closes M0's visual-direction confirmation and the §4.3 browser row.
3. Add Supabase keys to the Vercel environment and create the `workspaces` table with row-level security; then repeat the account checks against the live project, including a real backup restore.
4. Resume the scoped milestones in order: M3 PDF import, M4 catalog depth and timed practice, then a private M5 pilot. Do not add scored exam material before its rules and rights are reviewed.
5. Keep owner approval for pushing, deploying, spending, and sending learner material to any service.

## Appendix — what changed from the previous plan

| Previous plan | Change and reason |
| --- | --- |
| Milestones M0–M6 with narrative acceptance notes | Replaced with five-part evidence gates and an explicit independent verifier; earlier status language allowed reported success without a working UI path. |
| "Use the existing navy, stone-blue, and scarlet direction" | Replaced with a brutal ink/concrete/vermilion/acid token set at the owner's request; gloss, glass, and the unused hero artwork are no longer the visual direction. |
| Design treated as a final polish milestone | Design mechanics now sit in the baseline: atlas, labelled sandbox, command palette, focus modes, citation rail, and hints are implemented and tested because they change how learners navigate and verify evidence. |
| One monolithic "browser storage" assumption | Versioned storage contracts, one-time legacy migration, and separation of learner data from UI preferences. |
| Provider handled mostly inside the endpoint narrative | Explicit server-side boundary, URL allowlist, error taxonomy, output validation, and a distinction between mocked contract tests and live model evidence. |
| Monolithic progress log with duplicate milestone entries | One current entry per milestone, full SHA, commands, observed UI/API result, live-model result, and named blocker. |
| "Complete version" as a vague end state | Seven narrow milestones with observable exits; no milestone is marked verified by a screenshot, HTTP 200, or a direct provider call alone. |
