# Scholion capability matrix — 26 November 2026

This matrix separates **locally verified**, **publicly available** and **configuration-dependent** behaviour. Every "verified" cell names a command that was actually run. "Documented" means a doc describes it; it is not proof. No hosted inference provider has been approved or purchased, and the laptop's Ollama is not exposed publicly.

## 1. The three environments

| | 1. Local study workspace | 2. Public Vercel demonstration | 3. Optional hosted AI + accounts |
| --- | --- | --- | --- |
| Purpose | Full workspace with working GrinderAI inference | Public, signed-out exploration and study tools | Configuration-dependent private workspace; **not enabled here** |
| Inference | Loopback Ollama `gpt-oss:20b` (`scripts/study-endpoint.mjs:95-100`) | None. JSON 502 by design | Requires owner-approved provider. No provider code, key or URL exists in the repository; not implemented |
| Accounts | Off by default; mock-verified only | `/api/config` → `accounts:false` | Optional Supabase env vars; not configured on a live project |
| Truth signal | `/api/config` → `generationStatus.status:'available'` when Ollama answers the probe | `/api/config` → `generationStatus.status:'unavailable'` with a public-safe reason | `status:'unavailable'`, reason "Hosted AI requires an owner-approved provider and is not configured in this build" |
| Generate button | Enabled after capability check | **Disabled with an explicit reason** in the working tree (not yet deployed) | Disabled until a provider is approved and implemented |

**Important deployment caveat.** The public origin measured below still serves the pre-change build. It returned `{"accounts":false,"generation":"local-only"}` and kept the generate button enabled; its generation POST returned JSON 502. The truthful capability state added in this sprint is verified locally and by tests, but is **not live until this commit is deployed**. This document does not claim the public site already shows the new state.

## 2. Measured evidence

### Local (loopback Ollama, synthetic material)

| Capability | Status | Exact command / result |
| --- | --- | --- |
| Local inference through the app endpoint | **Verified live** | `npm.cmd run demo:local` → model `gpt-oss:20b`, source `demo-synthetic-triangles`, three questions; keyed answers Equilateral / Isosceles / Scalene all follow the synthetic excerpt; `Structural checks: PASS`, `Citation checks: PASS`, exit 0 |
| Contract validation, exact spans, duplicate prompts | **Verified by tests** | `npm.cmd test` → 75/75 pass, including `tests/study-three-questions.test.js`; Ollama capability is probed with a loopback stub, so the suite is deterministic with no model running |
| Injected instructions in material | **Contract verified** | `node --test tests/source-integrity.test.js` → "instructions embedded in material stay in the data message and cannot change the contract" PASS: injected text appears only in the user/data message; a five-question output is rejected with 502 |
| Provider timeout | **Verified** | same test file → mock provider that never answers returns JSON 504 while the homepage still returns 200 |
| Plans, citations, deletion cascade, duplicate uploads | **Verified by tests** | 75/75 pass; orphan-deletion and duplicate-attachment tests included |
| Syntax, lint and build gates | **Verified** | `npm.cmd run check`, `npm.cmd run lint`, `npm.cmd run build` → exit 0 |

Reproduce the live demo with Ollama running on `127.0.0.1:11434` and `gpt-oss:20b` installed:

```bash
npm ci
npm run demo:local
```

The demo starts the app on a free loopback port, POSTs a synthetic triangle excerpt, prints the model, source ID, explanation, choices, rationale and cited passage, and checks shape and span bounds. It uses no private text. Educational correctness of the keyed answer is a **human check**, explicitly printed by the script.

### Public demonstration (measured 2026-11-26)

| Probe | Result |
| --- | --- |
| `curl.exe -sS -o NUL -w '%{http_code}' https://scholion-beta.vercel.app/` | `200` |
| `curl.exe -sS https://scholion-beta.vercel.app/api/config` | `{"accounts":false,"generation":"local-only"}` — stale, no `generationStatus` |
| `curl.exe -sS -X POST -H 'Content-Type: application/json' --data-binary @probe.json https://scholion-beta.vercel.app/api/generate-study` | `{"error":{"message":"The study model could not generate a response. Check Ollama and try again."}}`, HTTP `502` |
| Desktop browser walkthrough | Documented at `docs/hermes-progress.md:40-50`; phone/touch not verified |

Public non-AI workflows (atlas, labelled sandbox, tracks, command palette, plans, tasks, practice, progress, browser persistence) are implemented and covered by tests; the public browser path for the main flow is recorded in the progress log. Generation is not available and must not be advertised as working.

### Configuration-dependent

| Capability | State | Evidence / blocker |
| --- | --- | --- |
| Private Supabase accounts, per-user ownership, session cookie, migration, source deletion | Implemented and mock-verified; live project not configured | `tests/supabase-account.test.js`; `docs/hermes-progress.md:25-31` |
| Restore endpoint | Server endpoint only; no browser UI | `scripts/account-endpoints.mjs:98-114`; no client call in `dist/` |
| Hosted model inference | Not implemented, not approved, not purchased | No provider env/URL/key in tracked code; `scripts/generation-capability.js` reports unavailable |
| Custom domain, DNS, licence, public pricing | Owner-only | `docs/auth-routing-and-domains.md`, `plan/backlog.md` |

## 3. Release-gate summary

| Gate | Status |
| --- | --- |
| Public catalog access without authentication | Pass (`GET /` → 200, public tests) |
| Non-AI workflows preserved when generation unavailable | Pass by test: with unavailable config the button is disabled, no POST is sent, tasks/sandbox/practice remain |
| Truthful availability state | Pass in code and tests; **pending deployment** on the public origin |
| Unauthorized AI requests rejected | Pass — server allowlist rejects non-loopback URLs; public generation POST returns JSON 502 |
| Generated answers traceable to a passage | Pass structurally: exact verbatim spans, source ID echoed from the request, citation click restores the passage. Educational correctness remains a human gate |
| Provider failures degrade gracefully | Pass for timeout, invalid JSON, outage and malformed output; 504 now fits inside the platform cap |

## 4. Explicitly not verified / human only

- Educational correctness of every model answer (the demo prints answers for human checking).
- Phone/touch walkthrough, screen-reader and zoom passes.
- Live Supabase project, RLS, real backup restore, account deletion with the server secret.
- Any hosted inference provider, purchase, or public Ollama exposure (all deliberately absent).
- Student pilot recruitment and feedback; licence choice; domain ownership.
