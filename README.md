# ALLaroundPREP

ALLaroundPREP is a study workspace for exam prep, university courses, and workplace learning. Start with a goal or add your own material, then turn the topic into a study plan you can work through and track. GrinderAI is the planned tutor for explaining difficult concepts, organizing coursework, and creating quizzes from your sources.

## Run locally

Use Node.js 22 or later to run the app. The preview server and browser app have no runtime dependencies.

```bash
npm start
```

Open [ALLaroundPREP in your browser](http://127.0.0.1:4173). Run `npm run check` to check the JavaScript syntax. The `dist/` directory contains the browser app and assets and can be served by any static host.

## Test the study flow

Use Node.js 24.15 or later in the Node 24 series for the test dependencies.

```bash
npm ci
npm test
```

The regression test opens the app in a simulated browser environment, selects synthetic attachments, submits the plan, and checks that citations still open the matching passages after the app is mounted again with the saved state.

## What the foundation supports

- Browse and bookmark SAT, ACT, AP, IELTS, and regional exam tracks, along with university course examples in Discrete Mathematics and Introduction to Finance. Exam details link to official resources.
- Create a study plan from a goal, attach `.txt` or `.md` files, and give each attachment a source title and optional page range. Open its citation in the plan or Materials to read the excerpt. Plans use local templates and are saved alongside notes, bookmarks, and progress in the browser for that site address.
- Try original sample questions for SAT, Discrete Mathematics, and Introduction to Finance. Each question includes an explanation after grading.

The regional catalog includes Kazakhstan’s UNT, Kyrgyzstan’s ORT, Russia’s EGE, China’s Gaokao, Hong Kong’s HKDSE, and a separate track for Uzbekistan’s university entrance tests. [Kyrgyzstan’s testing center](https://testing.kg/) · [Uzbekistan’s Ministry of Higher Education](https://gov.uz/en/edu/news/view/142572)

## Project structure

- `dist/index.html` and `dist/styles.css` define the interface and responsive layout.
- `dist/app.js`, `dist/ui.js`, and `dist/study.js` connect the interface, navigation, study flows, and browser storage.
- `dist/learning.js` holds the track catalog, sample questions, and study plan templates.
- `scripts/serve.mjs` serves the app for local development.

## Planned expansion

Add exam and university course materials as they become available, with practice organized by subject or module and linked to its source. Future infrastructure includes accounts, cloud storage and sync, PDF ingestion, and a live model for GrinderAI. The production site can use a custom `.app` domain once a name is selected and registered.
