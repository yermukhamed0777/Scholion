import { createStudyPlan, getTrack, sampleQuestions, tracks } from './learning.js';
import { escapeHtml, icon } from './ui.js';

const uploadLimit = 256 * 1024;
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
let practiceSession;

const entryUrl = (id) => `#/workspace/${encodeURIComponent(id)}`;
const practiceUrl = (id) => `#/practice/${encodeURIComponent(id)}`;

function heading(label, title, description, actions = '') {
  return `<header class="view-heading study-heading">
    <div>
      <p class="eyebrow">${label}</p>
      <h1>${title}</h1>
      <p class="muted">${description}</p>
    </div>
    ${actions}
  </header>`;
}

function progressBar(value, maximum, label) {
  return `<progress class="study-progress" value="${value}" max="${maximum}" aria-label="${label}"></progress>`;
}

function workspacePage(entries, entryId, goal) {
  if (entryId) {
    const entry = entries.find(({ id }) => id === entryId);
    if (entry) return studyPlanPage(entry);
    return `${heading('GrinderAI', 'Study plan unavailable', 'Study plans are saved in the browser that created them.')}
      <a class="button button-primary" href="#/workspace">Open study workspace</a>`;
  }

  const recentPlans = entries.length ? `<ul class="study-list">${entries.map((entry) => {
    const completed = entry.tasks.filter((task) => task.done).length;
    return `<li>
      <a class="study-list-link" href="${entryUrl(entry.id)}">
        <span class="study-icon">${icon('list-checks', 18)}</span>
        <span><strong>${escapeHtml(entry.title)}</strong><small>${completed} of ${entry.tasks.length} tasks complete</small></span>
      </a>
    </li>`;
  }).join('')}</ul>` : `<p class="muted">Your study plans will appear here as you create them.</p>`;

  return `${heading('Study workspace', 'GrinderAI', 'Start with a topic, your notes, or a text file and turn it into a study plan.')}
    <div class="study-split">
      <section class="panel study-main">
        <h2 class="section-title">Create a study plan</h2>
        <form class="study-form" data-study-form="workspace">
          <label class="study-field">What are you learning?
            <input name="title" type="text" maxlength="100" value="${escapeHtml((goal || '').slice(0, 100))}" placeholder="e.g. Understand how compound interest works" aria-describedby="study-goal-hint study-form-error">
            <small id="study-goal-hint" class="muted">Enter a topic or attach a file below.</small>
          </label>
          <label class="study-field">Notes <span class="muted">(optional)</span>
            <textarea name="notes" rows="5" maxlength="12000" placeholder="Paste a lecture excerpt or describe what you want to practice."></textarea>
          </label>
          <label class="study-field">Study materials <span class="muted">(optional)</span>
            <input name="sources" type="file" accept=".txt,.md,text/plain,text/markdown" multiple aria-describedby="study-file-hint study-form-error">
            <small id="study-file-hint" class="muted">Plain text or Markdown, up to 256 KB total.</small>
          </label>
          <p class="study-error" id="study-form-error" role="alert" hidden></p>
          <div class="study-form-footer">
            <button class="button button-primary" type="submit">${icon('sparkles', 18)} Create plan</button>
            <small class="muted">Uses a local study plan template. GrinderAI model access is pending.</small>
          </div>
        </form>
      </section>
      <aside class="panel study-aside" aria-labelledby="recent-plan-heading">
        <h2 class="section-title" id="recent-plan-heading">Your study plans</h2>
        ${recentPlans}
      </aside>
    </div>`;
}

function sourcePreview(source) {
  return `<details class="study-source">
    <summary>${icon('file-text', 18)} <span>${escapeHtml(source.name)}</span></summary>
    <pre>${escapeHtml(source.text)}</pre>
  </details>`;
}

function studyPlanPage(entry) {
  const completed = entry.tasks.filter((task) => task.done).length;
  const createdDate = dateFormat.format(new Date(entry.createdAt));
  return `${heading('Study plan', escapeHtml(entry.title), `Created ${escapeHtml(createdDate)}`, '<a class="button button-secondary" href="#/workspace">New study plan</a>')}
    <div class="study-split">
      <section class="panel study-main" aria-labelledby="tasks-heading">
        <div class="study-panel-header">
          <h2 class="section-title" id="tasks-heading">Tasks</h2>
          <span class="muted">${completed} of ${entry.tasks.length} complete</span>
        </div>
        ${progressBar(completed, entry.tasks.length, 'Study tasks completed')}
        <ul class="study-task-list">
          ${entry.tasks.map((task) => `<li><label class="study-task">
            <input type="checkbox" id="task-${escapeHtml(task.id)}" data-action="toggle-study-task"
              data-entry-id="${escapeHtml(entry.id)}" data-task-id="${escapeHtml(task.id)}" ${task.done ? 'checked' : ''}>
            <span>${escapeHtml(task.title)}</span>
          </label></li>`).join('')}
        </ul>
      </section>
      <aside class="panel study-aside" aria-labelledby="plan-materials-heading">
        <h2 class="section-title" id="plan-materials-heading">Study materials</h2>
        ${entry.notes ? `<div class="study-note"><h3>Notes</h3><p>${escapeHtml(entry.notes)}</p></div>` : ''}
        ${entry.sources.map(sourcePreview).join('')}
        ${entry.notes || entry.sources.length ? '' : '<p class="muted">This plan started with a topic.</p>'}
        <a class="button button-secondary" href="#/materials">All materials</a>
      </aside>
    </div>`;
}

function materialsPage(entries) {
  const materialEntries = entries.filter((entry) => entry.sources.length || entry.notes);
  return `${heading('Study library', 'Materials', 'Open the text files and notes attached to your study plans.', '<a class="button button-primary" href="#/workspace">Add study materials</a>')}
    ${materialEntries.length ? `<div class="study-material-grid">${materialEntries.map((entry) => `<section class="panel study-aside">
      <div class="study-panel-header">
        <h2 class="section-title">${escapeHtml(entry.title)}</h2>
        <a class="study-text-link" href="${entryUrl(entry.id)}">Open plan</a>
      </div>
      ${entry.notes ? `<details class="study-source"><summary>${icon('file-text', 18)} <span>Pasted notes</span></summary><pre>${escapeHtml(entry.notes)}</pre></details>` : ''}
      ${entry.sources.map(sourcePreview).join('')}
    </section>`).join('')}</div>` : `<section class="panel study-empty">
      <span class="study-icon">${icon('folder-open', 22)}</span>
      <h2 class="section-title">No materials yet</h2>
      <p class="muted">Attach a text file or paste notes when you create a study plan.</p>
    </section>`}`;
}

function practicePicker() {
  const availableTracks = tracks.filter(({ id }) => sampleQuestions.some((question) => question.trackId === id));
  return `${heading('Question bank', 'Practice', 'Try original sample questions and check the reasoning behind each answer.')}
    <div class="study-practice-grid">${availableTracks.map((track) => {
      const count = sampleQuestions.filter((question) => question.trackId === track.id).length;
      const action = practiceSession?.trackId === track.id && practiceSession.index < count && practiceSession.answers.length
        ? 'Resume practice' : 'Start practice';
      return `<article class="panel study-practice-card">
        <span class="tag">${count} sample ${count === 1 ? 'question' : 'questions'}</span>
        <h2 class="section-title">${escapeHtml(track.name)}</h2>
        <p class="muted">${escapeHtml(track.description)}</p>
        <a class="button button-secondary" href="${practiceUrl(track.id)}">${action}</a>
      </article>`;
    }).join('')}</div>`;
}

function practiceSummary(track, questions, session) {
  const correct = session.answers.filter(({ correct }) => correct).length;
  return `${heading('Sample practice', escapeHtml(track.name), 'You reached the end of this sample set.', '<a class="button button-secondary" href="#/practice">All practice</a>')}
    <section class="panel study-quiz study-empty" id="practice-summary" tabindex="-1">
      <span class="study-icon">${icon('circle-check', 24)}</span>
      <h2 class="section-title">${correct} of ${questions.length} correct</h2>
      <p class="muted">Your answers are saved in Progress.</p>
      <div class="study-actions">
        <button type="button" class="button button-secondary" data-action="restart-practice">Try again</button>
        <a class="button button-primary" href="#/progress">View progress</a>
      </div>
    </section>`;
}

function practiceQuestion(track, questions, session) {
  const question = questions[session.index];
  const answer = session.answers[session.index];
  const feedback = answer ? `<div id="practice-feedback" class="study-feedback ${answer.correct ? 'study-feedback-correct' : 'study-feedback-review'}" tabindex="-1">
    <strong>${icon(answer.correct ? 'circle-check' : 'circle-help', 19)} ${answer.correct ? 'Correct' : 'Review this answer'}</strong>
    <p>${escapeHtml(question.explanation)}</p>
  </div>` : '';
  return `${heading('Sample practice', escapeHtml(track.name), 'Original sample questions for this preview.', '<a class="button button-secondary" href="#/practice">All practice</a>')}
    <section class="panel study-quiz" aria-labelledby="practice-question">
      <div class="study-panel-header"><span class="tag">${escapeHtml(question.topic)}</span><span class="muted">Question ${session.index + 1} of ${questions.length}</span></div>
      ${progressBar(session.answers.length, questions.length, 'Questions answered')}
      <form data-study-form="practice" data-question-id="${escapeHtml(question.id)}" class="study-form">
        <fieldset class="study-choices" ${answer ? 'disabled' : ''}>
          <legend id="practice-question" tabindex="-1">${escapeHtml(question.prompt)}</legend>
          ${question.choices.map((choice, index) => {
            const correct = answer && index === question.correctIndex;
            const selected = answer?.choiceIndex === index;
            const result = correct ? 'Correct answer' : selected ? 'Your answer' : '';
            return `<label class="study-choice ${correct ? 'study-choice-correct' : selected ? 'study-choice-review' : ''}">
              <input type="radio" name="choice" value="${index}" required ${selected ? 'checked' : ''}>
              <span class="study-choice-index" aria-hidden="true">${String.fromCharCode(65 + index)}</span>
              <span class="study-choice-text">${escapeHtml(choice)}</span>
              ${result ? `<small>${result}</small>` : ''}
            </label>`;
          }).join('')}
        </fieldset>
        ${feedback}
        <div class="study-form-footer">
          ${answer ? `<button class="button button-primary" type="button" data-action="next-practice-question">${session.index + 1 < questions.length ? 'Next question' : 'See results'}</button>` : '<button class="button button-primary" type="submit">Check answer</button>'}
        </div>
      </form>
    </section>`;
}

function practicePage(trackId) {
  if (!trackId) return practicePicker();

  const track = getTrack(trackId);
  const questions = sampleQuestions.filter((question) => question.trackId === trackId);
  if (!track || !questions.length) {
    return `${heading('Question bank', track ? escapeHtml(track.name) : 'Practice', 'There are no sample questions for this track yet.')}
      <a class="button button-primary" href="#/practice">Explore sample practice</a>`;
  }
  if (practiceSession?.trackId !== trackId) {
    practiceSession = { trackId, index: 0, answers: [] };
  }
  return practiceSession.index >= questions.length
    ? practiceSummary(track, questions, practiceSession)
    : practiceQuestion(track, questions, practiceSession);
}

function progressPage({ attempts, entries, savedTrackIds }) {
  const totalCorrect = attempts.filter(({ correct }) => correct).length;
  const accuracy = attempts.length ? `${Math.round(totalCorrect / attempts.length * 100)}%` : '—';
  const tasks = entries.flatMap((entry) => entry.tasks);
  const completed = tasks.filter((task) => task.done).length;
  const metrics = [
    ['circle-help', 'Answers checked', attempts.length],
    ['target', 'Practice accuracy', accuracy],
    ['list-checks', 'Completed tasks', `${completed}/${tasks.length}`],
    ['bookmark', 'Saved tracks', savedTrackIds.length],
  ];
  const attemptedTracks = tracks.filter(({ id }) => attempts.some(({ trackId }) => trackId === id));
  return `${heading('Study activity', 'Progress', 'Track your practice answers and study plan completion on this browser.')}
    <div class="study-metric-grid">${metrics.map(([symbol, label, value]) => `<section class="panel study-metric">
      <span class="study-icon">${icon(symbol, 19)}</span><strong>${value}</strong><span class="muted">${label}</span>
    </section>`).join('')}</div>
    <div class="study-split study-progress-panels">
      <section class="panel study-main" aria-labelledby="practice-progress-heading">
        <h2 class="section-title" id="practice-progress-heading">Practice by track</h2>
        ${attemptedTracks.length ? `<ul class="study-progress-list">${attemptedTracks.map((track) => {
          const trackAttempts = attempts.filter(({ trackId }) => trackId === track.id);
          const correct = trackAttempts.filter((attempt) => attempt.correct).length;
          return `<li>
            <div class="study-panel-header"><a class="study-text-link" href="${practiceUrl(track.id)}">${escapeHtml(track.name)}</a><span class="muted">${correct} of ${trackAttempts.length} correct</span></div>
            ${progressBar(correct, trackAttempts.length, `${escapeHtml(track.name)} practice accuracy`)}
          </li>`;
        }).join('')}</ul>` : '<p class="muted">Practice results will appear after you check your first answer.</p><a class="button button-secondary" href="#/practice">Try sample practice</a>'}
      </section>
      <section class="panel study-aside" aria-labelledby="goal-progress-heading">
        <h2 class="section-title" id="goal-progress-heading">Study plans</h2>
        ${entries.length ? `<ul class="study-progress-list">${entries.map((entry) => {
          const done = entry.tasks.filter((task) => task.done).length;
          return `<li>
            <div class="study-panel-header"><a class="study-text-link" href="${entryUrl(entry.id)}">${escapeHtml(entry.title)}</a><span class="muted">${done}/${entry.tasks.length}</span></div>
            ${progressBar(done, entry.tasks.length, `${escapeHtml(entry.title)} task completion`)}
          </li>`;
        }).join('')}</ul>` : '<p class="muted">Create a plan to start tracking study tasks.</p><a class="button button-secondary" href="#/workspace">Create a study plan</a>'}
      </section>
    </div>`;
}

export function renderStudyPage(route, state) {
  switch (route.page) {
    case 'workspace': return workspacePage(state.entries, route.entryId, route.goal);
    case 'materials': return materialsPage(state.entries);
    case 'practice': return practicePage(route.trackId);
    case 'progress': return progressPage(state);
    default: return '';
  }
}

export function handleStudyAction(action, target, { commit, render }) {
  switch (action) {
    case 'toggle-study-task': {
      const { entryId, taskId } = target.dataset;
      const saved = commit((state) => ({
        ...state,
        entries: state.entries.map((entry) => entry.id === entryId ? {
          ...entry,
          tasks: entry.tasks.map((task) => task.id === taskId ? { ...task, done: target.checked } : task),
        } : entry),
      }));
      if (saved === false) {
        target.checked = !target.checked;
      } else {
        render();
        document.getElementById(`task-${taskId}`)?.focus();
      }
      return true;
    }
    case 'next-practice-question':
      if (practiceSession?.answers[practiceSession.index]) {
        practiceSession.index += 1;
        render();
        document.querySelector('#practice-question, #practice-summary')?.focus();
      }
      return true;
    case 'restart-practice':
      if (practiceSession) {
        practiceSession = { trackId: practiceSession.trackId, index: 0, answers: [] };
        render();
        document.getElementById('practice-question')?.focus();
      }
      return true;
    default: return false;
  }
}

function showFormError(form, message, fieldName) {
  const error = form.querySelector('#study-form-error');
  error.textContent = message;
  error.hidden = false;
  if (fieldName) {
    const field = form.elements.namedItem(fieldName);
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }
}

async function addStudyPlan(form, { commit, navigate, notify }) {
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton.disabled) return;
  const titleField = form.elements.namedItem('title');
  const sourcesField = form.elements.namedItem('sources');
  const notes = form.elements.namedItem('notes').value.trim();
  const goal = titleField.value.trim();
  const files = Array.from(sourcesField.files);
  form.querySelector('#study-form-error').hidden = true;
  titleField.removeAttribute('aria-invalid');
  sourcesField.removeAttribute('aria-invalid');

  if (!goal && !notes && !files.length) {
    showFormError(form, 'Enter a topic, paste notes, or attach a study file.', 'title');
    return;
  }
  if (files.some((file) => !/\.(txt|md)$/i.test(file.name))) {
    showFormError(form, 'Choose plain text (.txt) or Markdown (.md) files.', 'sources');
    return;
  }
  if (files.reduce((bytes, file) => bytes + file.size, 0) > uploadLimit) {
    showFormError(form, 'Choose files totaling 256 KB or less.', 'sources');
    return;
  }

  submitButton.disabled = true;
  try {
    const sources = await Promise.all(files.map(async (file) => ({
      id: crypto.randomUUID(), name: file.name, text: (await file.text()).trim(),
    })));
    if (sources.some(({ text }) => !text || text.includes('\0'))) {
      showFormError(form, 'Choose files that contain readable text.', 'sources');
      return;
    }
    if (!form.isConnected) return;
    const title = goal || files[0]?.name.replace(/\.(txt|md)$/i, '').slice(0, 100) || 'Study notes';
    const sourceText = [notes, ...sources.map(({ text }) => text)].filter(Boolean).join('\n\n');
    const entry = {
      id: crypto.randomUUID(), title, notes, sources,
      tasks: createStudyPlan(title, sourceText).map((taskTitle) => ({ id: crypto.randomUUID(), title: taskTitle, done: false })),
      createdAt: new Date().toISOString(),
    };
    const saved = commit((state) => ({ ...state, entries: [entry, ...state.entries] }));
    if (saved === false) {
      showFormError(form, 'Your browser could not save this study plan. Try using a smaller file or freeing up browser storage.');
      return;
    }
    navigate(`/workspace/${entry.id}`);
    notify?.('Study plan created.');
  } catch {
    showFormError(form, 'The study plan could not be created. Check your study files and try again.');
  } finally {
    submitButton.disabled = false;
  }
}

function checkPracticeAnswer(form, { route, commit, render }) {
  if (!practiceSession || practiceSession.trackId !== route.trackId || practiceSession.answers[practiceSession.index]) return;

  const question = sampleQuestions.filter(({ trackId }) => trackId === route.trackId)[practiceSession.index];
  if (!question || question.id !== form.dataset.questionId) return;
  const choiceValue = new FormData(form).get('choice');
  if (choiceValue === null) return;
  const choiceIndex = Number(choiceValue);
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= question.choices.length) return;

  const answer = {
    questionId: question.id, trackId: question.trackId, choiceIndex,
    correct: choiceIndex === question.correctIndex,
    createdAt: new Date().toISOString(),
  };
  if (commit((state) => ({ ...state, attempts: [...state.attempts, answer] })) === false) return;
  practiceSession.answers.push(answer);
  render();
  document.getElementById('practice-feedback')?.focus();
}

export async function handleStudySubmit(form, context) {
  switch (form.dataset.studyForm) {
    case 'workspace': await addStudyPlan(form, context); return true;
    case 'practice': checkPracticeAnswer(form, context); return true;
    default: return false;
  }
}
