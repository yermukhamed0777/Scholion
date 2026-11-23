# ALLaroundPREP progress

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
