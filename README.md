# Scholion

![CI](https://github.com/yermukhamed0777/Scholion/actions/workflows/ci.yml/badge.svg)

Scholion is a source-grounded study workspace for exam preparation, university courses, and workplace learning. Bring a goal, choose a track, or attach your own notes; GrinderAI explains a selected passage, proposes tasks, and writes a question whose answer can be traced back to that passage. The AI helper is called **GrinderAI**; the product is **Scholion**.

Repository: <https://github.com/yermukhamed0777/Scholion>

## Run locally

Use Node.js `^22.22.2`, `^24.15.0`, or `>=26.0.0` — the range required by the jsdom test dependency and declared in `package.json`. Node 24.18.1 is the verified version. The browser app has no runtime dependencies.

```bash
npm start
```

Open <http://127.0.0.1:4173>. `npm run dev` is an alias. If the port is occupied, pass another port, for example `node scripts/serve.mjs 4183`. With a hosted `PORT`, the server binds all interfaces for a reverse proxy; without it, it stays on loopback. `npm run check` validates JavaScript syntax.

## Hosted deployment

The public build lives at <https://scholion-beta.vercel.app>. Vercel serves `dist/` as static files and routes `POST /api/generate-study` to `api/generate-study.js`, which imports the same `scripts/study-endpoint.mjs` contract as the local server. `.vercelignore` keeps private local material out of the upload.

The hosted endpoint intentionally rejects non-loopback provider URLs. Without an owner-approved hosted provider, generation returns a JSON 502 while the rest of the workspace (plans, atlas, sandbox, sample practice, progress) works normally. Learner data stays in the browser under `scholion:v1` unless optional Supabase accounts are configured; the server-side storage layer is built and tested but disabled by default.

## Private accounts (optional)

Account features stay off unless the server is configured. Set these as Vercel environment variables (never in client code):

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — required to enable sign-in.
- `SUPABASE_TABLE` — optional workspace table name (default `workspaces`).
- `WORKSPACE_RESTORE_TOKEN` and `WORKSPACE_RESTORE_USER_IDS` — both required for the guarded backup-restore endpoint. The token alone is not enough: the user id must appear in the comma-separated allowlist.

The browser receives only HttpOnly, SameSite cookies (a short-lived session token and a refresh token; `Secure` is added on HTTPS). Workspace reads and writes are resolved against the verified user id on the server with the service-role key; on sign-in, browser-local plans migrate once and are never overwritten by a later migration. Deleting a source removes its generated study and derived attempts. State-changing endpoints reject cross-origin requests and apply fixed-window rate limits. When no keys are set, `/api/config` reports `accounts:false`, `/api/workspace` returns 503, and the local-only workspace keeps working.

## What is in the workspace

- **Overview** with an exam and course atlas: switch between SAT, UNT, ORT, EGE, Gaokao, HKDSE, and Discrete Mathematics previews.
- **A labelled offline sandbox**: try a cited explanation and mini-question on a sample excerpt before uploading anything. It does not call a model and says so on screen.
- **Study plans**: create one from a goal, pasted notes, or `.txt`/`.md` files. Each attachment gets an editable title and optional page range; citations open the exact saved passage.
- **GrinderAI**: select a source in a plan and generate a cited explanation plus a three-question drill with four choices each. Grade all three at once; every answer and rationale links back to the exact quoted passage, highlighted in the source card. Older one-question plans still render and grade normally.
- **Practice and Progress**: original sample questions with hints revealed on demand, plus saved attempts and task completion.
- **Command palette**: press `Ctrl/Cmd+K` to jump to a page, track, or plan.
- **Desk / Sprint**: the top-bar toggle switches between a calm research desk and a minimal exam-sprint view with a clock. It changes the atmosphere only; learner data is untouched.

The visual direction is deliberately brutal: ink and concrete surfaces, hairline rules, square corners, vermilion for action and citation, and acid yellow only for correct answers, progress fill, and the sprint clock. Pointer tracking is a faint accent on fine pointers and is disabled for reduced motion. Keyboard focus styling always wins, including a non-`:has()` fallback for radio choices and a trapped focus in the command palette.

## GrinderAI with local Ollama

Run Ollama locally with `gpt-oss:20b` installed. The app server defaults to `http://127.0.0.1:11434/api/chat`; the OpenAI-compatible `/v1/chat/completions` route also works. Set `MODEL` to change the model or `OLLAMA_URL` to another **loopback** HTTP endpoint. The server rejects non-local or credential-bearing provider URLs.

Create a plan with a text or Markdown excerpt, choose a source, and select **Generate study material**. Read the explanation, reveal nothing until you have checked an answer, and open the citations to verify the passage. The latest generated result is saved with the plan; graded attempts appear in Progress. If Ollama is offline, plans and sample practice still work and generation returns a JSON error.

No learner text or credentials are written to logs or source control.

## Privacy and storage

Learner plans, notes, sources, and attempts are stored **in plain text** in this browser under `scholion:v1`; focus mode is a separate `scholion:mode` preference. Browser-local data is not encrypted and is readable by anyone with access to that browser profile or device. Clearing site data removes it. When optional Supabase accounts are configured, the same workspace is also synced to that account; reads and writes are resolved against the verified user id on the server.

The local app sends a selected excerpt only to the configured **loopback** Ollama endpoint. No learner text or provider credential is written to server logs, and client error bodies are fixed messages rather than upstream provider text. Hosted AI and live Supabase are deliberately unavailable until an owner-approved provider or a real project is configured and tested; the public build reports `generationStatus.status: "unavailable"` and `accounts: false`.

## Tests and build gates

Verified on Node.js 24.18.1; the supported range matches `package.json` and the lockfile (`^22.22.2`, `^24.15.0`, or `>=26.0.0`).

```bash
npm ci
npm test
npm run check
npm run lint
npm run build
npm run bench
```

The suite covers data integrity, derived coverage, real upload and citation flows, generated-answer persistence, provider failure paths, storage migration, account/session security, privacy, rate limiting, and the workspace interactions. `npm run bench` is a labelled synthetic microbenchmark of local helpers — it calls no model and is not evidence of answer quality. A live `gpt-oss:20b` check is documented separately in the [capability matrix](docs/CAPABILITY_MATRIX.md) and must be run with Ollama up.

## Storage and the rename

Learner data now lives under `scholion:v1`. Plans saved under the previous `allaroundprep:v1` key are migrated the first time the app opens and the old key is removed only after a successful copy. The legacy key appears in exactly one place in the code: the migration reader. Focus-mode preference is stored separately under `scholion:mode`.

## Project structure

- `dist/index.html`, `dist/styles.css`, `dist/study.css` — shell, metadata, brutalist design tokens, and components.
- `dist/app.js`, `dist/ui.js`, `dist/study.js` — routing, state adapter, study flows, command palette, focus modes, and browser storage.
- `dist/learning.js`, `dist/source-registry.js`, `dist/coverage.js` — catalog, official link-only resources, derived coverage.
- `dist/glow.js` — optional pointer tracking.
- `scripts/serve.mjs`, `scripts/server-config.js` — static server, generation endpoint, provider adapter, host/port resolution.
- `docs/PROJECT_ROADMAP.md` — architecture, design system, milestones, and evidence gates.

Private books, extracted text, derived notes, credentials, and scratch files stay in `Materials/`, `tmp/`, or local ignore rules and are never committed.

## Planning

Long-term execution planning lives in [plan/README.md](plan/README.md): strategy, roadmap, backlog, decisions and progress. It is the active planning entry point; `docs/PROJECT_ROADMAP.md` and `docs/hermes-progress.md` remain the historical evidence record.

The [capability matrix](docs/CAPABILITY_MATRIX.md) distinguishes what is verified locally, what is public without configuration, and what depends on optional hosted configuration. Public generation is unavailable until an owner-approved provider is configured; the generate control reports that state instead of failing after a click.

## Continue development

Read the [plan](plan/README.md) and the [backlog](plan/backlog.md) first: they name the next executable assignment. [CHATGPT_NEXT_PROMPT.md](CHATGPT_NEXT_PROMPT.md) is a pointer to that plan, not a separate status record. Observed historical evidence lives in the [progress log](docs/hermes-progress.md).
