# Scholion — roadmap

THE PLAN. Three horizons, each split into what the assistant can do (**Intelligence**) and what only the owner can do (**Human**). A milestone is not done until its exit criteria are observed and the `plan/README.md` convention has been applied in the same commit. Every "target" number below is a **proposal**, not a measurement; measured values are in `strategy.md`.

Current state: 53/53 automated checks pass, syntax check exit 0, 0 CI workflows, no benchmark, no licence file, no live Supabase, no hosted provider. "Implemented" means the code path exists; "verified" additionally requires the evidence gate in `docs/PROJECT_ROADMAP.md:52-62`.

---

## 1. Short term — concrete next steps

These are numbered, deliberately small, and are the steps the assistant takes next. Each has a Done-when line. Full `file:line` detail and status live in `backlog.md`.

1. **P0-1 — Close the local unmatched-API hang.** `scripts/serve.mjs:33-35` returns after `handleAccountRequest` returns `false` (`scripts/account-endpoints.mjs:60`) without writing or ending a response; Vercel handles it at `api/account.js:11`.
   **Done when:** an unmatched `/api/auth/*` or `/api/workspace*` path returns JSON 404 promptly on the local server, and a `tests/` case asserts it.
2. **P0-2 — Stop stale local state from clobbering the remote workspace.** `commit()` re-reads `localStorage` (`dist/app.js:117`) while `initAccount()` replaces in-memory state without persisting it (`dist/app.js:494,503`), then PUTs (`dist/app.js:126-130`).
   **Done when:** a jsdom test with local-then-remote state proves a post-login mutation preserves remote entries.
3. **P0-3 — Align generation timeouts.** 90 s provider (`scripts/study-endpoint.mjs:8`), 95 s browser (`dist/app.js:706`), 60 s Vercel (`vercel.json:13`).
   **Done when:** one authoritative value (or three ordered constants with a test) and no documented path exceeds the platform cap.
4. **P0-4 — Repair the Node engine declaration.** `package.json:13-15` says `>=22`; jsdom requires `^22.22.2 || ^24.15.0 || >=26.0.0` (`package-lock.json:180`); README says both 22+ and 24.15+ (`README.md:9,55`).
   **Done when:** manifest and README agree and `npm ci` + `npm test` pass on Node 24.18.1.
5. **P0-5 — Reconcile documentation contradictions.** Counts 34/39/49/52/53, M2 status, stale data contract, stale live-smoke and next-assignment claims.
   **Done when:** one current count, one milestone status, and a data contract that includes `questions`/`span`/`answers`; no "done" claim without a recorded command.
6. **P0-7 — Harden session and restore.** `Secure` flag, CSRF, refresh, and per-user restore scope (`scripts/account-endpoints.mjs:20-24,86-88,98-114`).
   **Done when:** restore cannot overwrite an arbitrary `userId`; sign-out failure still clears the cookie; tests cover both.
7. **P1-3 — Add real `lint`, `bench`, `build` scripts** so the update convention's step 6 is literal.
   **Done when:** all three scripts exist, pass, and `plan/README.md` no longer records their absence.
8. **P0-6 — Add CI (only after owner authorization).** `npm ci` → `npm test` → `npm run check` → build, Node 24, badge in root README.
   **Done when:** a pushed commit triggers green CI and README shows the badge.

**Intelligence (assistant):**
- Implement P0-1…P0-5, P0-7 and P1-3, each with a regression test and an exact command record.
- Keep `backlog.md`, `progress.md` and `decisions.md` in the same commit as each fix.
- Draft the CI workflow but do not enable or push it until P0-6 is unblocked.
- Extend tests to cover rate limiting and privacy claims (P1-1, P1-2) only after P0 items are green.

**Human (owner):**
- Authorize P0-6 explicitly (CI creation and push are publish activity).
- Decide the restore threat model needed by P0-7: operator-only disaster recovery, or per-user self-service.
- Decide whether `CHATGPT_NEXT_PROMPT.md` remains the "next assignment" file (P1-5).

---

## 2. Midterm — bigger milestones

| Milestone | Exit criteria | Backlog |
| --- | --- | --- |
| **M1-1 — PDF import with page fidelity** | A synthetic two-page text PDF imports with distinct file-page index and printed-page label; a scan-only PDF shows "OCR needed" and is never sent to the model; extracted private text is absent from Git and `dist/`; owner-approved library recorded. | M1-1 |
| **M1-2 — Live accounts and real data ownership** | Supabase keys exist only in Vercel env; RLS denies cross-user reads; real signup/login/session/migration/delete/backup-restore pass against a live project; deletion cascades across backups; no key material in tracked files. | M1-2 |
| **M1-3 — Eval and benchmark harness** | `npm run bench` runs a seeded, labelled suite; output records model name, source ID and latency; mocked provider results are explicitly labelled and never counted as live quality evidence. | M1-3 |
| **M1-4 — Catalog depth and timed practice** | Track records carry `syllabusVersion`, `language`, `rightsStatus`, `reviewStatus` as data; coverage remains derived; timing rules for one track are published and cited before any score conversion; keyboard and phone states pass. | M1-4 |
| **M2-1 — Real phone/touch walkthrough** | Narrow viewport recorded with citation rail reachable, sprint exit visible, keyboard and touch actions working, zero console errors. | M2-1 |
| **M2-2 — Employer pilot** | Personal workspaces remain private; two roles with tested permissions; owner-written document states exactly what administrators may see; pilot agreement signed. | M2-2 |
| **M2-3 — Staging and launch** | A reviewed commit is staged; sign-in, import, citation, generation, grading, progress, deletion and restore all pass at the approved domain; coverage shown is accurate; rollback path recorded. | M2-3 |

**Intelligence (assistant):**
- Implement PDF import, eval harness and catalog depth behind tests (M1-1, M1-3, M1-4).
- Prepare the Supabase schema/RLS SQL, migration scripts and a reproducible restore drill; run them only against a project the owner provides (M1-2).
- Produce keyboard/phone test scripts and a staging checklist (M2-1, M2-3).
- Implement role checks and tests once the owner defines the permission matrix (M2-2).

**Human (owner):**
- Approve the PDF extraction library and supply one course file under `Materials/` (M1-1).
- Create the Supabase project, apply RLS, add Vercel env keys, and approve sending learner material to that service (M1-2).
- Source and review official exam rules and rights evidence per track (M1-4).
- Run or observe the phone walkthrough with a viewport-capable browser, and recommend the demo to pilot users (M2-1, M2-2).
- Choose the domain, DNS, pricing and launch date, and sign pilot agreements (M2-2, M2-3).
- Perform the independent verification required by `docs/PROJECT_ROADMAP.md:46-62` for each milestone.

---

## 3. Long term — the product awaiting

**Shape.** A private-by-default, source-grounded study workspace: one plan → explain → quiz → progress flow across exam and course tracks, with citations that resolve to exact saved spans and a calm desk / exam-sprint interface. It is deliberately not a flashcard app or a cramped test bank (`docs/PROJECT_ROADMAP.md:20`). The deployed shape today is a static `dist/` plus same-origin serverless functions for generation and accounts (`vercel.json:3-18`), with learner data defaulting to browser storage.

**Deployment posture.** Static site on Vercel (current, <https://scholion-beta.vercel.app>) + Vercel Functions + optional Supabase backend; generation stays loopback-only unless the owner approves a hosted provider (`README.md:21,47`, `scripts/study-endpoint.mjs:95-100`). On-prem packaging is an optional parallel path (M3-2). No hosted model provider or live Supabase instance exists today.

**Business model.** Proprietary posture chosen by the owner on 2026-11-25 (see `decisions.md`); no `LICENSE` file yet and Phase 2 was deferred. Whether this is a paid product, and its pricing, remain open questions; the long-term model is *proposed* as direct learner subscription for private workspaces plus an employer pilot tier, subject to M3-1 evidence. No revenue claim is made.

**Quantitative exit criteria — proposed targets, not measured facts:**
- 10 owner-recorded learner/course interviews completed and 3 paying pilot commitments before public launch (proposal for M3-1).
- ≥90% of generated citations resolve to the exact submitted span in the seeded eval suite; 0 cross-user data exposures in the live account drill.
- p95 generation latency below the platform cap after P0-3 alignment; measured, not asserted.
- ≥1 employer pilot with two tested roles and a signed permission document (M2-2).
- Full flow completed at an approved domain with accurate published coverage (M2-3).

**Intelligence (assistant):**
- Build the private-deployment package and keep it test-equivalent (M3-2).
- Produce interview summaries, pricing options and a cost model from data the owner supplies (M3-1).
- Implement team administration only after pilot evidence and the owner's role matrix (M4-1).
- Maintain the eval suite and latency measurement as the product grows.

**Human (owner):**
- Decide paid vs free, price, refunds and billing provider; approve the proprietary licence file in a future Phase 2 (M3-1).
- Conduct interviews, recommend the demo to friends, secure pilot commitments, and approve public launch claims (M3-1, M2-2, M2-3).
- Approve any hosted model provider (would change the core privacy promise) and any spend (M1-2, M3-1).
- Sign employer agreements and define what team administrators may see (M2-2, M4-1).

---

## Expansion — alternatives by job

Each row: the current choice, a credible alternative, and a watch-out. Replace nothing until a measured constraint forces it.

| Job | Current | Alternative(s) | Watch-out |
| --- | --- | --- | --- |
| Static hosting | Vercel `dist/` (`vercel.json:3`) | Netlify; Cloudflare Pages; GitHub Pages; self-hosted nginx | GitHub Pages cannot run the account/generation functions; moving off Vercel means reimplementing `vercel.json:5-10` rewrites. |
| Server DB / vector | Optional Supabase Postgres (`scripts/supabase.mjs`) | Neon; PlanetScale; Turso; local Postgres with pgvector | Service-role key must stay server-side; RLS policies must be tested, not assumed; pgvector adds cost and a migration path. |
| Auth | Supabase GoTrue via server session cookie (`scripts/account-endpoints.mjs:20-24`) | Clerk; Auth0; Lucia; custom session store | Cookie lacks `Secure`/refresh today (P0-7); any switch must preserve HttpOnly, per-user isolation and the one-time local migration. |
| Storage / CDN | Static files in `dist/` | Cloudflare R2; S3; Supabase Storage | Private book text and PDFs must never enter a CDN or Git (`.vercelignore:3-9`); signed URLs expire and need a key boundary. |
| Edge functions | Vercel Functions, 60 s cap (`vercel.json:11-18`) | Cloudflare Workers; Deno Deploy; Fly.io Node | Caps differ widely; P0-3 must be revalidated on any move; `?route=` path recovery is Vercel-specific (`api/account.js:6-11`). |
| Observability | None | Sentry; Grafana Cloud; Axiom; self-hosted Loki | Never log learner text or credentials (`README.md:51`); client-side error capture may include excerpt text. |
| Product analytics | None | PostHog; Plausible; Umami | Consent and PII: plan/attempt events can identify a learner; prefer aggregated counters and keep source text out of events. |
| AI / eval | Local Ollama `gpt-oss:20b`, loopback-only (`scripts/study-endpoint.mjs:85,95-100`) | Hosted OpenAI-compatible provider (needs owner approval); promptfoo; Braintrust | A hosted provider sends learner passages off-machine and breaks the current privacy promise; mocks prove contract, not answer quality (`docs/PROJECT_ROADMAP.md:128`). |
| Payments | None | Stripe; Lemon Squeezy; Paddle | Requires the licence/pricing decision first; tax/VAT and refunds are owner obligations; no payment code exists today. |
| Email | None | Resend; Postmark; plain SMTP | Transactional email carries PII; no consent or unsubscribe flow exists; do not add until an actual user need is recorded. |
| Docs | `README.md`, `docs/`, `plan/` | Docusaurus; MkDocs; GitHub Wiki | `docs/` is excluded from deployment (`.vercelignore:10`); private course excerpts must stay local; a wiki would change the public/private boundary. |
| Feature flags | None; env-based config only | Unleash; Statsig; simple checked-in config | Config drift between local and Vercel already exists (engine and timeout mismatches); prefer one checked-in source of truth. |
| On-prem packaging | None | Node server + `dist/` tarball; Docker image; Tauri/Electron desktop | Must preserve local-only generation and the no-keys-in-client rule; proprietary licence terms must permit distribution. |
| CI / supply chain | None (`.github/` empty) | GitHub Actions; GitLab CI; local script | Pin action versions and use `npm ci` with the committed lockfile; do not add a workflow that skips tests. |

**Selection rule:** choose the cheapest boring option that preserves the product's core promise — source-grounded answers, private-by-default learner data, and local-only generation unless the owner explicitly approves a hosted provider. Today that means keeping Vercel static + functions, optional Supabase, and `npm test` + `npm run check` until a measured constraint (latency, cost, capacity, or a signed requirement) justifies a change. A cheaper option that leaks learner text, weakens citations, or adds an unapproved provider is not cheaper.
