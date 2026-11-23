# ALLaroundPREP

ALLaroundPREP is a study workspace for exam prep, university courses, and workplace learning. Start with a goal or add your own material, then turn the topic into a study plan you can work through and track. GrinderAI uses a local model to explain an attached passage and generate a question from it.

## Run locally

Use Node.js 22 or later to run the app. The preview server and browser app have no runtime dependencies.

```bash
npm start
```

Open [ALLaroundPREP in your browser](http://127.0.0.1:4173). `npm run dev` is an alias for `npm start`. Run `npm run check` to check the JavaScript syntax. The static files in `dist/` support the catalog and local study tools. Use the Node server for GrinderAI generation.

For hosted runs that supply a `PORT`, the server binds all interfaces so a reverse proxy can reach it; without `PORT` it stays on `127.0.0.1:4173`. An occupied port produces a clear message instead of a crash.

## Generate study material with Ollama

Run local Ollama with `gpt-oss:20b` installed. The app server defaults to `http://127.0.0.1:11434/api/chat`. Set `MODEL` to use a different installed model or set `OLLAMA_URL` to use another loopback HTTP endpoint. The OpenAI-compatible `/v1/chat/completions` route is supported as well.

Create a plan with a short text or Markdown excerpt. Choose the source in the plan and select **Generate study material**. Read the explanation, check an answer, and open the citations to review the original passage. The plan retains its latest generated quiz and the Progress view includes graded attempts. The server sends the selected excerpt to the local provider. The browser keeps the plan and its results.

If Ollama is offline, the plan and sample practice are still available. Start Ollama and retry generation.

## Test the study flow

Use Node.js 24.15 or later in the Node 24 series for the test dependencies.

```bash
npm ci
npm test
```

Tests use synthetic passages and controlled providers. They check source selection, citation and grading persistence, and whether the server keeps serving the app during a provider failure. Run a separate live request with Ollama running to check the installed model.

## What the foundation supports

- Browse and bookmark SAT, ACT, AP, IELTS, and regional exam tracks, along with university course examples in Discrete Mathematics and Introduction to Finance. Each track shows how many original sample questions and official links are currently available. Exam details link to official resources.
- Create a study plan from a goal, attach `.txt` or `.md` files, and give each attachment a source title and optional page range. Open its citation in the plan or Materials to read the excerpt. Plans use local templates and are saved alongside notes, bookmarks, and progress in the browser for that site address.
- Try original sample questions for SAT, Discrete Mathematics, and Introduction to Finance. Each question includes an explanation after grading.

The regional catalog includes Kazakhstan’s UNT, Kyrgyzstan’s ORT, Russia’s EGE, China’s Gaokao, Hong Kong’s HKDSE, and a separate track for Uzbekistan’s university entrance tests. [Kyrgyzstan’s testing center](https://testing.kg/) · [Uzbekistan’s Ministry of Higher Education](https://gov.uz/en/edu/news/view/142572)

## Project structure

- `dist/index.html`, `dist/styles.css`, and `dist/study.css` define the interface and responsive layout.
- `dist/app.js`, `dist/ui.js`, and `dist/study.js` connect the interface, navigation, study flows, and browser storage.
- `dist/learning.js` holds the track catalog, sample questions, and study plan templates. `dist/source-registry.js` lists official, link-only resources.
- `dist/coverage.js` derives the per-track coverage shown in the catalog; `dist/glow.js` adds the optional pointer-follow highlight.
- `scripts/serve.mjs` serves the app and the generation endpoint; `scripts/server-config.js` resolves its host and port.

## Planned expansion

Add exam and university course materials as they become available, with practice organized by subject or module and linked to its source. Future work includes PDF ingestion, accounts, cloud storage, and progress sync. The production site can use a custom `.app` domain once a name is selected and registered. [Project roadmap](docs/PROJECT_ROADMAP.md)
