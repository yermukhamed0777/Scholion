# ALLaroundPREP project roadmap

ALLaroundPREP brings exam preparation, university coursework, and workplace learning into one workspace. A learner can choose a track or bring their own material, then ask GrinderAI for an explanation, make a study plan, take a quiz, and see what to review next.

The citation flow is implemented and tested. GrinderAI can request study material from a selected source, grade a question, and reopen the saved result. The next checkpoint is to verify that flow with the installed local model in a regular browser. [Progress log](hermes-progress.md)

## Verified starting point

| Area | State on November 23, 2026 |
| --- | --- |
| M0 | Text uploads preserve source titles, optional page ranges, and citations across reload. Exam track pages link to official resources. |
| M1 | GrinderAI requests structured output from the local provider. The study plan saves the latest explanation and question, shows grading feedback, and links both results to the selected source. |
| Automated verification | `npm run check` and all 28 `npm test` checks passed. A failing provider returns a JSON error and the same process still serves the homepage. Coverage, glow, server-config, and catalog integrity regressions were added after the M1 push. |
| Browser verification | Repeat the two-file import and reload once in a regular browser against the pushed version. |
| Private materials | `Materials/` is ignored and Git tracks no files under it. The scratch harness, excerpts, and draft GrinderAI notes remained local. |
| Live provider | The most recent attempt found Ollama stopped and returned HTTP 502. The live model result in the app is pending. |

## Who does what

| Owner | Responsibilities |
| --- | --- |
| You | Choose the next course or exam, supply material you can use, and check the educational quality of sample explanations and answers. Approve what gets pushed, deployed, shared, or purchased. |
| Hermes | Implement the active milestone, run checks through the app’s normal entry points, make focused local commits, and record what ran and what remains open. |
| Codex | Independently reproduce flagged issues, review the patch and evidence, and identify gaps before a milestone is marked verified. Implement a targeted unblock or carry out GitHub and release work when you assign it. |

Use one active milestone and one primary editor on its branch. Research, content review, and independent verification can run alongside implementation. Keep code and materials in their respective places. Code and synthetic test fixtures can go into Git. Books, private excerpts, generated notes from private materials, and credentials stay local.

## How we track the work

Use `docs/hermes-progress.md` as the status log. Keep one current entry per milestone with the status, branch and commit, changed files, commands or browser steps, observed results, blockers, and next action. Update that entry in place when evidence changes. A demonstrated result should be reproducible from the recorded commit and fixture.

- **In progress** means implementation or checks are underway.
- **Ready for review** means a local commit exists with the checks Hermes actually ran and any gaps clearly listed.
- **Verified** means Codex or the owner reproduced the milestone’s acceptance checks against that commit.
- **Blocked** means a named dependency prevents remaining work. Record the error and the smallest action that unblocks it.

Before creating a checkpoint, inspect both the staged file list and diff. A private GitHub branch is a place to review approved code. Push after owner authorization, then review a pull request before merging to `main`. Deploy from an agreed release commit after staging verification and owner approval.

## Milestones and acceptance checks

### M0 Repair upload and citations

The repair is on `main`. Selecting TXT or Markdown files creates an editable source title and page range for each file. The original filename is retained and unspecified pages stay blank. The remaining browser check is to save two synthetic attachments, reload the plan, and open each citation to verify its label and passage. Check a blank range and an older plan if available.

### M1 Complete one Discrete Mathematics learning flow

Use one approved excerpt and connect GrinderAI through a server-side provider interface to the configured local GPT-OSS endpoint. Let the learner select the source, ask for an explanation, edit a study plan, and answer one generated question. Both the explanation and the answer rationale should link to the imported excerpt. Validate model output against the active learner’s source IDs, then display and save it through the app.

Acceptance includes one real model response, a correct answer reviewed against the excerpt, persistent progress after reload, and clear behavior when the model is unavailable or the passage does not support an answer. Use a labeled mock for automated failure tests. Browser storage seeded by a script and Markdown samples are useful fixtures with their own evidence.

### M2 Add document import and run the first pilot

Support text-based PDFs with bounded file sizes and extraction. Preserve the file’s page index and printed page label when they differ. Make repeated imports safe and show clear messages for unreadable files and scans that need OCR. Keep private material out of hosted static assets. Test a short synthetic PDF with known text on two pages, then test one approved course file.

Pilot Discrete Mathematics with your chosen material and SAT with original reviewed practice plus official links. Confirm that a learner can discover a track, start study, use an explanation or plan, take a quiz, and revisit results. Keep the current text import working throughout.

### M3 Expand the catalog and assessments

Use a reusable track structure with a syllabus version, language, region, topics, rights evidence, and review status. Expand the international catalog to ACT, AP subjects, and IELTS Academic and General Training where relevant. Add regional coverage for Kazakhstan UNT, Kyrgyzstan ORT, Uzbekistan university admissions, Russia EGE, mainland China Gaokao, and Hong Kong HKDSE. Confirm Gaokao materials against the relevant province and year. Add Introduction to Finance and your current courses as you supply material. Keep the goal-based workspace open to people studying job skills.

Keep official practice link-only when the publisher’s terms do not permit processing or reuse. Label original, source-derived, and official material clearly. Review each answer and explanation. Progress by topic, saved and missed questions, and timed practice belong here. Add full-length simulations and score conversions only for tracks with verified exam structure, sufficient permitted items, and tested scoring. Show the current coverage for every track.

### M4 Finish the browser experience

Use the existing navy, stone-blue, and scarlet direction and the ALLaroundPREP artwork. Add a restrained pointer-follow glow to selected interactive cards. Keep the glow optional on fine-pointer devices, preserve keyboard focus styling, and respect reduced motion. Test phone, tablet, and desktop layouts, keyboard navigation, touch, and loading, empty, error, and offline states. Track any accessibility or performance issue that affects completion of a study task.

### M5 Prepare private accounts and an employer pilot

Before hosting learner materials or syncing progress, add authentication, per-user access checks, persistent storage, and a migration path for browser-local plans. Let a learner delete a source and its derived data. Test access isolation, restore a backup in a test environment, and confirm model endpoints and credentials stay on the server.

Offer workplace learning first through private personal workspaces. Expand to employer teams when the product has invitations, documented team permissions, and tests for employee and employer views. Agree with the owner on what team administrators can access before enabling those views.

### M6 Stage and launch

Run a staging release from a reviewed Git commit. Test sign-in, import, citations, generation, grading, progress, and deletion on the deployed build. Check the allowed catalog content, mobile accessibility, support contact, error handling, backup recovery, and rollback. Publish the advertised feature and track coverage from what was actually verified.

You select the custom `.app` domain and approve registration, pricing, hosting, and production DNS changes. GitHub holds the source and reviewed changes. Hosting serves the user-facing website. Launch counts as complete when a learner can safely complete the supported learning flow at the approved domain and see accurate coverage for the content available to them.

## What to do now

Use a synthetic logic excerpt to test the app with the installed `gpt-oss:20b` model. Verify the keyed answer and citation, then confirm that grading survives a regular-browser reload. Record the observed result in the [progress log](hermes-progress.md).
