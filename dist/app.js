import { getTrack, tracks } from './learning.js';
import { coverageLabel, trackCoverage } from './coverage.js';
import { bindPointerGlow } from './glow.js';
import { getTrackSources } from './source-registry.js';
import { handleStudyAction, handleStudySourceChange, handleStudySubmit, renderStudyPage } from './study.js';
import { escapeHtml, icon } from './ui.js';

const root = document.querySelector('#app');
const announcement = document.querySelector('#announcement');
const storageKey = 'scholion:v1';
// Read-only migration path for plans saved before the project rename. The old
// key stays in this one place so existing learners do not lose their work.
const legacyStorageKey = 'allaroundprep:v1';
const featuredIds = ['sat', 'ielts', 'unt'];
const categories = [
  ['all', 'All tracks'],
  ['international', 'International'],
  ['regional', 'Regional exams'],
  ['university', 'University'],
  ['saved', 'Saved'],
];
const categoryLabels = {
  international: 'International exam',
  regional: 'Regional exam',
  university: 'University course',
};
const navGroups = [
  ['Workspace', [
    ['home', 'Overview', 'layout-dashboard'],
    ['workspace', 'GrinderAI', 'sparkles'],
    ['materials', 'My materials', 'folder-open'],
  ]],
  ['Learning', [
    ['catalog', 'Explore tracks', 'compass'],
    ['practice', 'Practice', 'list-checks'],
    ['progress', 'Progress', 'chart-no-axes-column'],
  ]],
];
const filters = {
  home: { category: 'all', query: '' },
  catalog: { category: 'all', query: '' },
};
let state = readState();
let toastTimer;
const generatingPlans = new Set();

// Stable feature state: the atlas remembers the selected format, the sandbox
// runs on labelled offline samples, and focus mode is stored separately from
// learner plans so changing the atmosphere never touches study data.
const focusKey = 'scholion:mode';
const atlasIds = ['sat', 'unt', 'ort', 'ege', 'gaokao', 'dse', 'discrete-mathematics'];
let atlasId = atlasIds[0];
let sandboxId = 'logic';
let focusMode = readFocusMode();
let focusStartedAt;
let focusTimer;
let commandMatches = [];
let commandIndex = 0;
let commandTrigger = null;
// Accounts stay off until /api/config confirms a configured backend. Local
// plans and the offline sandbox work exactly as before when it is absent.
const account = { configured: false, user: null, ready: false, mode: 'login' };
// AI availability is reported by the server, never inferred in the browser.
// Until /api/config answers, the truthful state is "unavailable".
let generation = { status: 'unavailable', kind: 'none', reason: 'AI generation availability is not known yet.' };

const sandboxSamples = {
  logic: {
    label: 'Propositional logic',
    excerpt: 'A conjunction P ∧ Q is true only when both P and Q are true. If either statement is false, the conjunction is false.',
    explanation: 'Read the two claims as a pair: the excerpt grants truth to the whole statement only in the case where both parts hold.',
    prompt: 'When is P ∧ Q false?',
    choices: ['Only when P is false', 'Only when Q is false', 'When at least one of P or Q is false', 'When both are false'],
    correctIndex: 2,
    rationale: '“Either statement is false” is exactly the negation of “both are true”.',
  },
  sat: {
    label: 'SAT reading',
    excerpt: 'The trial measured energy use before the battery was replaced. The earlier reading therefore describes the original battery, not the new one.',
    explanation: 'The time marker “before” fixes which battery each measurement belongs to; the conclusion must not swap them.',
    prompt: 'What does the earlier energy reading describe?',
    choices: ['The replacement battery', 'The original battery', 'Both batteries', 'Neither battery'],
    correctIndex: 1,
    rationale: 'The excerpt ties the earlier reading to the battery used at that time.',
  },
  onboarding: {
    label: 'Corporate onboarding',
    excerpt: 'A new employee may request equipment after the account is approved. Approval is required, but it is not sufficient on its own because the stock check must also pass.',
    explanation: 'Two conditions are necessary here; satisfying one of them does not complete the request.',
    prompt: 'Is account approval enough to receive equipment?',
    choices: ['Yes, always', 'Yes, if the employee asks', 'No, the stock check must also pass', 'No, approval is never needed'],
    correctIndex: 2,
    rationale: 'The excerpt says approval is required but the stock check must also pass.',
  },
};

function readState(fallback = { savedTrackIds: [], entries: [], attempts: [] }) {
  const keys = [storageKey, legacyStorageKey];
  for (const key of keys) {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      if (stored && Array.isArray(stored.savedTrackIds) && Array.isArray(stored.entries) && Array.isArray(stored.attempts)) {
        if (key !== storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(stored));
            localStorage.removeItem(key);
          } catch {
            // Keep the old copy readable if the browser cannot write the new key.
          }
        }
        return stored;
      }
    } catch {
      // Try the next key; a corrupt record should not block the workspace.
    }
  }
  return fallback;
}

function commit(updater) {
  const next = updater(readState(state));
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    notify('This browser could not save the change. Check that storage is enabled and has space.');
    return false;
  }
  state = next;
  if (account.user && account.ready) {
    fetch('/api/workspace', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => notify('Your changes are saved here but could not sync to your account. Try again soon.'));
  }
  return true;
}

function notify(message) {
  clearTimeout(toastTimer);
  announcement.hidden = false;
  announcement.textContent = message;
  toastTimer = setTimeout(() => {
    announcement.hidden = true;
    announcement.textContent = '';
  }, 4200);
}

function readFocusMode() {
  try {
    return localStorage.getItem(focusKey) === 'sprint';
  } catch {
    return false;
  }
}

function applyFocusMode() {
  document.body.dataset.mode = focusMode ? 'sprint' : 'desk';
  const toggle = document.querySelector('[data-action="toggle-focus"]');
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(focusMode));
    const label = toggle.querySelector('[data-focus-label]');
    if (label) label.textContent = focusMode ? 'Sprint' : 'Desk';
  }
  const clock = document.querySelector('[data-focus-clock]');
  if (!clock) return;
  if (!focusMode) {
    clearInterval(focusTimer);
    focusTimer = undefined;
    clock.hidden = true;
    clock.textContent = '00:00';
    return;
  }
  if (focusTimer) return;
  clock.hidden = false;
  focusStartedAt = Date.now();
  const tick = () => {
    const seconds = Math.floor((Date.now() - focusStartedAt) / 1000);
    clock.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  tick();
  focusTimer = setInterval(tick, 1000);
}

function currentRoute() {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') return { page: 'home' };
  if (hash === '#main-content') return { page: root.dataset.page || 'home' };
  const [path, query] = hash.slice(2).split('?');
  const [page, id, ...extra] = path.split('/');
  if (!hash.startsWith('#/') || extra.length) return { page: 'missing' };
  const params = new URLSearchParams(query);
  if (page === 'workspace') return { page, entryId: id || undefined, goal: params.get('goal') };
  if (page === 'catalog' || page === 'practice') return { page, trackId: id || undefined };
  if ((page === 'materials' || page === 'progress') && !id) return { page };
  return { page: 'missing' };
}

function navigate(path) {
  const hash = path.startsWith('#') ? path : '#' + path;
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}

function trackIcon(track) {
  if (track.id === 'ielts') return 'languages';
  if (track.category === 'regional') return 'globe';
  if (track.category === 'university') return 'book-open';
  return 'graduation-cap';
}

function goalLink(track) {
  return '#/workspace?goal=' + encodeURIComponent(track.name);
}

function trackSaveButton(track) {
  const saved = state.savedTrackIds.includes(track.id);
  return `<button type="button" class="icon-button" data-action="save-track" data-track-id="${track.id}"
    aria-pressed="${saved}" aria-label="Bookmark ${escapeHtml(track.name)}" title="Bookmark ${escapeHtml(track.name)}">
    ${icon('bookmark', 18)}
  </button>`;
}

function trackCard(track) {
  return `<article class="track-card" data-tone="${track.tone}" data-glow>
    <div class="track-card-top">
      <span class="track-mark">${icon(trackIcon(track), 23)}</span>
      ${trackSaveButton(track)}
    </div>
    <div class="track-card-body">
      <span class="track-meta">${escapeHtml(track.region)}</span>
      <h3><a href="#/catalog/${track.id}">${escapeHtml(track.name)}</a></h3>
      <p>${escapeHtml(track.description)}</p>
    </div>
    <div class="track-card-foot">
      <span class="track-status">${coverageLabel(track.id)}</span>
      <a class="track-open" href="#/catalog/${track.id}" aria-label="View ${escapeHtml(track.name)} track">View track</a>
    </div>
  </article>`;
}

function filterButtons(page) {
  return `<div class="filters" role="group" aria-label="Filter tracks">
    ${categories.filter(([key]) => key !== 'saved' || page === 'catalog').map(([key, label]) =>
      `<button type="button" class="filter" data-action="filter-tracks" data-category="${key}" aria-pressed="${filters[page].category === key}">${label}</button>`
    ).join('')}
  </div>`;
}

function visibleTracks(page) {
  const { category, query } = filters[page];
  const search = query.trim().toLocaleLowerCase();
  if (page === 'home' && category === 'all') return featuredIds.map(getTrack);

  const matching = tracks.filter(track => {
    if (category === 'saved' && !state.savedTrackIds.includes(track.id)) return false;
    if (category !== 'all' && category !== 'saved' && track.category !== category) return false;
    return [track.name, track.id, track.nativeName, track.region, ...track.topics]
      .filter(Boolean)
      .some(term => term.toLocaleLowerCase().includes(search));
  });
  return page === 'home' ? matching.slice(0, 3) : matching;
}

function trackGrid(page) {
  const results = visibleTracks(page);
  if (results.length) return results.map(trackCard).join('');
  return `<p class="empty-state panel">${filters[page].category === 'saved'
    ? 'Bookmark a track to save it here.'
    : 'No tracks match this search.'}</p>`;
}

function pageHeading(title, subtitle, action = '', extraClass = '') {
  return `<div class="view-heading ${extraClass}">
    <div class="heading-copy"><h1>${title}</h1><p>${subtitle}</p></div>
    ${action}
  </div>`;
}

function quickLink(path, symbol, title, text, tone) {
  return `<a class="quick-link" href="${path}" data-glow>
    <span class="quick-icon" data-tone="${tone}">${icon(symbol, 19)}</span>
    <span class="quick-copy"><strong>${title}</strong><small>${text}</small></span>
  </a>`;
}

function atlasPreview(track) {
  if (!track) return '';
  return `<div>
    <span class="atlas-meta">${escapeHtml(track.region)} · ${escapeHtml(categoryLabels[track.category])}</span>
    <h3>${escapeHtml(track.name)}${track.nativeName ? ` · <span lang="${escapeHtml(track.nativeLanguage || 'en')}">${escapeHtml(track.nativeName)}</span>` : ''}</h3>
    <p>${escapeHtml(track.description)}</p>
  </div>
  <a class="button button-secondary" href="#/catalog/${encodeURIComponent(track.id)}">Open track →</a>`;
}

function atlasSection() {
  return `<section class="atlas" aria-labelledby="atlas-heading">
    <div class="atlas-head">
      <h2 id="atlas-heading">Exam &amp; course atlas</h2>
      <span class="atlas-meta">One workspace · ${atlasIds.length} formats in view</span>
    </div>
    <div class="atlas-strip" role="group" aria-label="Preview an exam or course format">
      ${atlasIds.map(id => {
        const track = getTrack(id);
        return `<button type="button" class="atlas-option" data-action="atlas-select" data-track-id="${id}"
          aria-pressed="${id === atlasId}">${escapeHtml(track?.name || id)}</button>`;
      }).join('')}
    </div>
    <div class="atlas-preview" id="atlas-preview">${atlasPreview(getTrack(atlasId))}</div>
  </section>`;
}

function sandboxPreview(sampleId) {
  const sample = sandboxSamples[sampleId] || sandboxSamples.logic;
  const choices = sample.choices.map((choice, index) =>
    `<li>${String.fromCharCode(65 + index)}. ${escapeHtml(choice)}</li>`).join('');
  const answer = sample.choices[sample.correctIndex];
  return `<div>
    <span class="sandbox-label">GrinderAI explanation · offline demo</span>
    <h3>${escapeHtml(sample.label)}</h3>
    <p>${escapeHtml(sample.explanation)}</p>
    <blockquote>${escapeHtml(sample.excerpt)}</blockquote>
  </div>
  <div>
    <span class="sandbox-label">Mini question</span>
    <h3>${escapeHtml(sample.prompt)}</h3>
    <ol>${choices}</ol>
    <button type="button" class="study-hint-button" data-action="sandbox-answer" aria-pressed="false">Show answer</button>
    <p class="study-hint" data-sandbox-answer hidden><strong>${escapeHtml(answer)}</strong> — ${escapeHtml(sample.rationale)}</p>
    <p class="muted" style="margin-block-start:.8rem">Attach your own excerpt in a study plan for a real cited answer.</p>
  </div>`;
}

function sandboxSection() {
  return `<section class="sandbox" aria-labelledby="sandbox-heading">
    <div class="atlas-head">
      <h2 id="sandbox-heading">See a cited answer before you upload</h2>
      <span class="sandbox-label">Offline demo · no model call</span>
    </div>
    <div class="sandbox-pills" role="group" aria-label="Choose a sample excerpt">
      ${Object.entries(sandboxSamples).map(([id, sample]) => `<button type="button" class="sandbox-pill"
        data-action="sandbox-sample" data-sample-id="${id}" aria-pressed="${id === sandboxId}">${escapeHtml(sample.label)}</button>`).join('')}
    </div>
    <div class="sandbox-card" id="sandbox-preview">${sandboxPreview(sandboxId)}</div>
  </section>`;
}

function dashboard() {
  const latestPlan = state.entries[0];
  return `
    ${pageHeading('Study workspace', 'Your exams, courses, and new skills in one place.',
      '<a class="button button-secondary" href="#/materials">' + icon('folder-open', 17) + ' My materials</a>', 'dashboard-heading')}
    <section class="hero" aria-labelledby="hero-heading">
      <div class="hero-content">
        <span class="hero-badge">${icon('sparkles', 16)} GrinderAI</span>
        <h2 id="hero-heading">What are you<br><span>preparing for?</span></h2>
        <p>Start with a goal, lecture notes, or a topic you need to understand. Build a plan and tackle it one step at a time.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#/workspace">${icon('plus', 18)} Start a study plan</a>
          <a class="button button-secondary" href="#/catalog">Browse tracks</a>
        </div>
      </div>
    </section>
    ${atlasSection()}
    ${sandboxSection()}
    <div class="dashboard-lower">
      <section class="tracks-section" aria-labelledby="featured-heading">
        <div class="section-header">
          <div class="heading-copy">
            <h2 id="featured-heading">Explore study tracks</h2>
            <p>Find an exam or a university course.</p>
          </div>
          <a class="text-link" href="#/catalog">View all tracks</a>
        </div>
        ${filterButtons('home')}
        <div class="track-grid" id="track-results">${trackGrid('home')}</div>
      </section>
      <aside class="quick-panel panel" aria-labelledby="quick-heading">
        <div class="section-header">
          <div class="heading-copy"><h2 id="quick-heading">Quick actions</h2></div>
        </div>
        <div class="quick-list">
          ${latestPlan
            ? quickLink('#/workspace/' + encodeURIComponent(latestPlan.id), 'clipboard-list', 'Continue your plan', escapeHtml(latestPlan.title), 'blue')
            : quickLink('#/workspace', 'file-text', 'Add study notes', 'Paste notes or add a text file', 'blue')}
          ${quickLink('#/practice', 'target', 'Try sample practice', 'Check answers with explanations', 'red')}
          ${quickLink('#/progress', 'chart-no-axes-column', 'Check your progress', state.attempts.length
            ? `${state.attempts.length} ${state.attempts.length === 1 ? 'answer' : 'answers'} recorded`
            : 'See tasks and practice activity', 'mint')}
        </div>
      </aside>
    </div>`;
}

function catalog() {
  return `${pageHeading('Explore study tracks', 'Browse international tests, regional exams, and university courses.')}
    <div class="catalog-controls">
      ${filterButtons('catalog')}
      <label class="search-field">${icon('search', 20)}
        <input type="search" id="catalog-search" aria-label="Search tracks" placeholder="Search tracks or subjects" value="${escapeHtml(filters.catalog.query)}">
      </label>
    </div>
    <div class="track-grid" id="track-results">${trackGrid('catalog')}</div>`;
}

function trackDetail(track) {
  if (!track) return missingPage('This track could not be found.');
  const hasPractice = trackCoverage(track.id).questions > 0;
  const sources = getTrackSources(track.id);
  return `<div class="track-detail" data-tone="${track.tone}">
    ${pageHeading(escapeHtml(track.name), `${escapeHtml(categoryLabels[track.category])} · ${escapeHtml(track.region)}`,
      '<a class="button button-secondary" href="#/catalog">All tracks</a>')}
    <section class="track-detail-header panel" aria-labelledby="track-overview">
      <div class="track-card-top"><span class="track-mark">${icon(trackIcon(track), 23)}</span>${trackSaveButton(track)}</div>
      <h2 id="track-overview">Track overview</h2>
      ${track.nativeName ? `<p class="track-meta" lang="${escapeHtml(track.nativeLanguage || 'en')}">${escapeHtml(track.nativeName)}</p>` : ''}
      <p>${escapeHtml(track.description)}</p>
      <div class="start-links">
        <a class="button button-primary" href="${goalLink(track)}">${icon('plus', 18)} Build a study plan</a>
        ${hasPractice ? `<a class="button button-secondary" href="#/practice/${track.id}">Try sample practice</a>` : ''}
      </div>
      ${hasPractice ? '' : '<p class="muted">Practice materials for this track are pending. You can start with your own notes.</p>'}
    </section>
    <section class="track-detail-topics panel" aria-labelledby="track-topics">
      <h2 id="track-topics">Topics to organize</h2>
      <ul>${track.topics.map(topic => `<li>${escapeHtml(topic)}</li>`).join('')}</ul>
    </section>
    ${sources.length ? `<section class="track-detail-topics panel" aria-labelledby="track-sources">
      <h2 id="track-sources">Official resources</h2>
      <ul>${sources.map(source => `<li><a class="text-link" href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a>
        <span class="muted"> · ${escapeHtml(source.publisher)}</span></li>`).join('')}</ul>
    </section>` : ''}
  </div>`;
}

function missingPage(message = 'This page could not be found.') {
  return pageHeading('Page unavailable', message, '<a class="button button-secondary" href="#/">Back to overview</a>');
}

function pageContent(route) {
  if (route.page === 'home') return dashboard();
  if (route.page === 'catalog') return route.trackId ? trackDetail(getTrack(route.trackId)) : catalog();
  if (route.page === 'missing') return missingPage();
  return renderStudyPage(route, state);
}

function accountFormMarkup() {
  const signup = account.mode === 'signup';
  return `<form class="account-form" data-account-form="${account.mode}">
    <label class="study-field"><span>Email</span><input type="email" name="email" required autocomplete="email"></label>
    <label class="study-field"><span>Password</span><input type="password" name="password" minlength="8" required autocomplete="${signup ? 'new-password' : 'current-password'}"></label>
    <button class="button button-primary" type="submit">${signup ? 'Create account' : 'Sign in'}</button>
    <button type="button" class="text-link" data-action="account-mode" data-mode="${signup ? 'login' : 'signup'}">${signup ? 'Have an account? Sign in' : 'Create an account'}</button>
  </form>`;
}

function accountMarkup() {
  if (account.user) {
    const sources = state.entries.flatMap(entry => entry.sources);
    return `<div class="sidebar-status">${icon('monitor', 19)}<div><strong>${escapeHtml(account.user.email || 'Signed in')}</strong><small>Synced to your account</small></div></div>
      ${sources.length ? `<form class="account-form" data-account-form="delete-source">
        <select name="sourceId" aria-label="Source to delete">${sources.map(source => `<option value="${escapeHtml(source.id)}">${escapeHtml(source.title || source.name)}</option>`).join('')}</select>
        <button class="button button-secondary" type="submit">Delete source</button>
      </form>` : ''}
      <button type="button" class="text-link" data-action="account-logout">Sign out</button>`;
  }
  if (account.configured) return accountFormMarkup();
  return `<div class="sidebar-status">${icon('monitor', 19)}<div><strong>Local workspace</strong><small>Saved in this browser</small></div></div>`;
}

function renderAccount() {
  const panel = root.querySelector('.sidebar-footer');
  if (panel) panel.innerHTML = accountMarkup();
}

async function initAccount() {
  // jsdom has no window.fetch: account startup is a real-browser feature and
  // must never interfere with the DOM test harness.
  if (typeof window.fetch !== 'function') return;
  try {
    const configResponse = await fetch('/api/config');
    if (!configResponse.ok) return;
    const config = await configResponse.json();
    if (config?.generationStatus && typeof config.generationStatus === 'object') {
      generation = config.generationStatus;
    } else if (config?.generation === 'local-ollama') {
      generation = { status: 'available', kind: 'local-ollama', reason: 'Local Ollama is configured for GrinderAI.' };
    } else {
      generation = { status: 'unavailable', kind: 'none', reason: 'This deployment does not report AI generation availability.' };
    }
    render();
    if (!config.accounts) return;
    account.configured = true;
    const sessionResponse = await fetch('/api/auth/session');
    const session = sessionResponse.ok ? await sessionResponse.json() : { user: null };
    account.user = session.user || null;
    if (account.user) {
      const remoteResponse = await fetch('/api/workspace');
      if (remoteResponse.ok) {
        const remote = await remoteResponse.json();
        const hasRemote = remote?.state && (remote.state.entries?.length || remote.state.attempts?.length);
        const local = readState(state);
        if (hasRemote) {
          state = remote.state;
          // Keep the browser copy in step with the account, otherwise the next
          // commit() re-reads stale localStorage and overwrites the account.
          try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* local copy is optional */ }
        } else if (local.entries.length || local.attempts.length) {
          const migratedResponse = await fetch('/api/workspace/migrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: local }),
          });
          if (migratedResponse.ok) {
            const migrated = await migratedResponse.json();
            if (migrated?.state) {
              state = migrated.state;
              try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* local copy is optional */ }
            }
          }
        }
      }
      account.ready = true;
    }
  } catch {
    // Remain in local-only mode; a failed account check never blocks study.
  }
  renderAccount();
  render();
}

async function submitAccountForm(form) {
  const mode = form.dataset.accountForm;
  try {
    if (mode === 'delete-source') {
      const sourceId = form.elements.namedItem('sourceId')?.value;
      const response = await fetch('/api/workspace/delete-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      if (!response.ok) throw new Error('The source could not be deleted.');
      const { state: next } = await response.json();
      state = next;
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* local copy is optional */ }
      notify('Source and its generated material were deleted.');
      render();
      return;
    }
    const email = form.elements.namedItem('email')?.value;
    const password = form.elements.namedItem('password')?.value;
    const response = await fetch(`/api/auth/${mode === 'signup' ? 'signup' : 'login'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result?.error?.message || 'Sign in failed.');
    }
    await initAccount();
    notify(mode === 'signup' ? 'Account created.' : 'Signed in.');
  } catch (error) {
    notify(error?.message || 'That account action could not be completed.');
  }
}

async function logoutAccount() {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* clear locally anyway */ }
  account.user = null;
  account.ready = false;
  notify('Signed out. Your local workspace is still here.');
  renderAccount();
  render();
}

function sidebar(page) {
  return `<aside class="sidebar" id="workspace-sidebar">
    <a class="brand" href="#/" aria-label="Scholion overview">
      <span class="brand-symbol">${icon('orbit', 22)}</span>
      <span class="brand-wordmark">SCHOL<b>ION</b></span>
    </a>
    <div class="sidebar-body">
      ${navGroups.map(([group, links]) => `
        <div class="nav-label" id="nav-${group.toLowerCase()}">${group}</div>
        <nav class="nav-group" aria-labelledby="nav-${group.toLowerCase()}">
          ${links.map(([key, label, symbol]) => `<a class="nav-link" href="#/${key === 'home' ? '' : key}"${page === key ? ' aria-current="page"' : ''}>
            ${icon(symbol, 19)}<span>${label}</span>${page === key ? '<span class="nav-indicator" aria-hidden="true"></span>' : ''}
          </a>`).join('')}
        </nav>`).join('')}
    </div>
    <div class="sidebar-footer">
      ${accountMarkup()}
    </div>
  </aside>`;
}

function render({ focus = false } = {}) {
  const route = currentRoute();
  const label = navGroups.flatMap(([, links]) => links).find(([key]) => key === route.page)?.[1] ?? 'Page unavailable';
  root.dataset.page = route.page;
  document.title = `${label} · Scholion`;
  root.innerHTML = `<div class="app-shell">
    ${sidebar(route.page)}
    <div class="main-shell">
      <header class="topbar">
        <button class="mobile-menu" type="button" data-action="toggle-menu" aria-expanded="false" aria-controls="workspace-sidebar" aria-label="Toggle navigation">${icon('menu', 23)}</button>
        <div class="breadcrumbs"><span>Workspace</span>${icon('chevron-right', 14)}<strong>${label}</strong></div>
        <div class="topbar-actions">
          <span class="focus-clock" data-focus-clock hidden>00:00</span>
          <button class="focus-toggle" type="button" data-action="toggle-focus" aria-pressed="${focusMode}" aria-label="Toggle exam sprint mode">${icon('clock', 15)}<span data-focus-label>${focusMode ? 'Sprint' : 'Desk'}</span></button>
          <button class="focus-toggle" type="button" data-action="open-command" aria-label="Open quick switcher">${icon('search', 15)}<span>Ctrl K</span></button>
          <a class="topbar-action" href="#/catalog">${icon('search', 18)}<span>Find a track</span></a>
          <span class="local-badge" data-capability-badge>${generation.status === 'available' ? 'Local · GrinderAI' : (account.configured ? 'Hosted workspace' : 'Demo · no AI')}</span>
        </div>
      </header>
      <main class="main-content" id="main-content" tabindex="-1">${pageContent(route)}</main>
    </div>
  </div>`;
  applyFocusMode();
  syncGenerationForm();
  if (focus) {
    window.scrollTo(0, 0);
    root.querySelector('#main-content').focus({ preventScroll: true });
  }
}

function context() {
  return { state, commit, navigate, notify, render, route: currentRoute() };
}

function commandItems() {
  const pages = navGroups.flatMap(([, links]) => links).map(([key, label]) => ({
    label, path: key === 'home' ? '#/' : `#/${key}`, type: 'Page',
  }));
  const examItems = tracks.map(track => ({
    label: track.name, path: `#/catalog/${track.id}`, type: 'Track',
  }));
  const planItems = state.entries.map(entry => ({
    label: entry.title, path: `#/workspace/${encodeURIComponent(entry.id)}`, type: 'Plan',
  }));
  return [...pages, ...examItems, ...planItems];
}

function setCommandIndex(index) {
  const input = document.getElementById('command-query');
  const container = document.getElementById('command-results');
  if (!input || !container) return;
  commandIndex = (index + commandMatches.length) % Math.max(1, commandMatches.length);
  container.querySelectorAll('.command-result').forEach((item, position) => {
    item.setAttribute('aria-selected', String(position === commandIndex));
  });
  const active = commandMatches[commandIndex];
  if (active) input.setAttribute('aria-activedescendant', `command-option-${commandIndex}`);
  else input.removeAttribute('aria-activedescendant');
}

function renderCommandResults(query = '') {
  const container = document.getElementById('command-results');
  if (!container) return;
  const needle = query.trim().toLocaleLowerCase();
  commandMatches = commandItems()
    .filter(item => !needle || item.label.toLocaleLowerCase().includes(needle) || item.type.toLocaleLowerCase().includes(needle))
    .slice(0, 9);
  container.innerHTML = commandMatches.length
    ? commandMatches.map((item, index) => `<button type="button" class="command-result" id="command-option-${index}"
        role="option" aria-selected="${index === 0}" tabindex="-1"
        data-action="command-result" data-path="${escapeHtml(item.path)}">
        <span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.type)}</small>
      </button>`).join('')
    : '<p class="command-empty">No matching pages, tracks, or plans.</p>';
  setCommandIndex(0);
}

function openCommandPalette() {
  const palette = document.getElementById('command-palette');
  const input = document.getElementById('command-query');
  if (!palette || !input) return;
  commandTrigger = document.activeElement;
  palette.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  input.value = '';
  renderCommandResults();
  input.focus();
}

function closeCommandPalette() {
  const palette = document.getElementById('command-palette');
  const input = document.getElementById('command-query');
  if (!palette) return;
  palette.hidden = true;
  if (input) {
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  if (commandTrigger?.isConnected) commandTrigger.focus();
  commandTrigger = null;
}

function toggleMenu(button, open) {
  root.querySelector('.app-shell').classList.toggle('sidebar-open', open);
  button.setAttribute('aria-expanded', String(open));
}

function refreshTrackResults(page) {
  const results = document.querySelector('#track-results');
  if (results) results.innerHTML = trackGrid(page);
}

function syncGenerationForm() {
  const form = root.querySelector('form[data-study-form="generate"]');
  if (!form) return;
  const generating = generatingPlans.has(form.dataset.entryId);
  const unavailable = generation.status !== 'available';
  form.setAttribute('aria-busy', String(generating));
  const button = form.querySelector('button[type="submit"]');
  button.disabled = generating || unavailable;
  button.title = unavailable ? (generation.reason || 'AI generation is not available here.') : '';
  form.querySelector('select[name="sourceId"]').disabled = generating;
  form.querySelector('[data-generation-status]').hidden = !generating;
  const notice = form.querySelector('[data-generation-unavailable]');
  if (notice) {
    notice.hidden = !unavailable;
    notice.textContent = unavailable ? (generation.reason || 'AI generation is not available here.') : '';
  }
}

function isGeneratedStudy(value, sourceId) {
  const questions = Array.isArray(value?.questions) && value.questions.length
    ? value.questions
    : [value?.question];
  const validQuestion = item => typeof item?.prompt === 'string' && item.prompt.trim() !== '' &&
    typeof item.rationale === 'string' && item.rationale.trim() !== '' &&
    Array.isArray(item.choices) && item.choices.length === 4 &&
    item.choices.every(choice => typeof choice === 'string' && choice.trim() !== '') &&
    new Set(item.choices.map(choice => choice.trim().toLowerCase())).size === 4 &&
    Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex < item.choices.length;
  return value?.sourceId === sourceId && typeof value.model === 'string' && typeof value.explanation === 'string' &&
    validQuestion(value?.question) &&
    (questions.length === 1 || (questions.length <= 3 && questions.every(validQuestion)));
}

async function generateStudy(form) {
  const entryId = form.dataset.entryId;
  const entry = readState(state).entries.find(item => item.id === entryId);
  const sourceId = form.elements.namedItem('sourceId').value;
  const source = entry?.sources.find(item => item.id === sourceId);
  if (generation.status !== 'available') {
    notify(generation.reason || 'AI generation is not available here.');
    return;
  }
  if (!source || generatingPlans.has(entryId)) return;

  generatingPlans.add(entryId);
  syncGenerationForm();
  let saved = false;
  try {
    const response = await fetch('/api/generate-study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, title: source.title || source.name, pages: source.pages, text: source.text }),
      signal: AbortSignal.timeout(75_000),
    });
    const result = await response.json();
    if (!response.ok) {
      notify(typeof result?.error?.message === 'string' ? result.error.message : 'GrinderAI could not generate study material.');
      return;
    }
    if (!isGeneratedStudy(result, sourceId)) {
      notify('GrinderAI returned an invalid result. Try again.');
      return;
    }
    const generatedStudy = {
      id: crypto.randomUUID(),
      sourceId,
      model: result.model,
      explanation: result.explanation,
      ...(result.span ? { span: result.span } : {}),
      question: result.question,
      ...(result.questions ? { questions: result.questions } : {}),
    };
    saved = commit(current => ({
      ...current,
      entries: current.entries.map(item => item.id === entryId && item.sources.some(material => material.id === sourceId)
        ? { ...item, generatedStudy }
        : item),
    }));
  } catch (error) {
    notify(error.name === 'TimeoutError'
      ? 'GrinderAI took too long to respond. Try again.'
      : 'GrinderAI could not respond. Check the local app server and try again.');
  } finally {
    generatingPlans.delete(entryId);
    const route = currentRoute();
    if (saved && route.page === 'workspace' && route.entryId === entryId) {
      render();
      root.querySelector('#generated-material-heading')?.focus();
    } else {
      syncGenerationForm();
    }
  }
}

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) {
    const menu = root.querySelector('.mobile-menu[aria-expanded="true"]');
    if (menu && (event.target.closest('.nav-link, .brand') || !event.target.closest('.sidebar'))) {
      toggleMenu(menu, false);
    }
    return;
  }
  const { action, trackId, category } = target.dataset;
  const { page } = currentRoute();

  if (action === 'toggle-menu') {
    toggleMenu(target, target.getAttribute('aria-expanded') !== 'true');
  } else if (action === 'filter-tracks') {
    filters[page].category = category;
    target.closest('.filters').querySelectorAll('[data-category]').forEach(button => {
      button.setAttribute('aria-pressed', String(button === target));
    });
    refreshTrackResults(page);
  } else if (action === 'save-track' && getTrack(trackId)) {
    if (!commit(current => ({
      ...current,
      savedTrackIds: current.savedTrackIds.includes(trackId)
        ? current.savedTrackIds.filter(id => id !== trackId)
        : [...current.savedTrackIds, trackId],
    }))) return;
    const saved = state.savedTrackIds.includes(trackId);
    if (page === 'catalog' && filters.catalog.category === 'saved' && !currentRoute().trackId) {
      refreshTrackResults(page);
      root.querySelector('[data-category="saved"]').focus();
    } else {
      target.setAttribute('aria-pressed', String(saved));
    }
    notify(saved ? 'Track saved.' : 'Track removed from saved tracks.');
  } else if (action === 'atlas-select' && getTrack(target.dataset.trackId)) {
    atlasId = target.dataset.trackId;
    target.closest('.atlas-strip').querySelectorAll('[data-track-id]').forEach(button => {
      button.setAttribute('aria-pressed', String(button === target));
    });
    const preview = root.querySelector('#atlas-preview');
    if (preview) preview.innerHTML = atlasPreview(getTrack(atlasId));
  } else if (action === 'sandbox-sample' && sandboxSamples[target.dataset.sampleId]) {
    sandboxId = target.dataset.sampleId;
    target.closest('.sandbox-pills').querySelectorAll('[data-sample-id]').forEach(button => {
      button.setAttribute('aria-pressed', String(button === target));
    });
    const preview = root.querySelector('#sandbox-preview');
    if (preview) preview.innerHTML = sandboxPreview(sandboxId);
  } else if (action === 'sandbox-answer') {
    const answer = target.closest('.sandbox-card')?.querySelector('[data-sandbox-answer]');
    if (!answer) return;
    answer.hidden = !answer.hidden;
    target.setAttribute('aria-pressed', String(!answer.hidden));
    target.textContent = answer.hidden ? 'Show answer' : 'Hide answer';
  } else if (action === 'toggle-focus') {
    focusMode = !focusMode;
    try {
      localStorage.setItem(focusKey, focusMode ? 'sprint' : 'desk');
    } catch {
      // The mode still applies for this session if storage is unavailable.
    }
    applyFocusMode();
    notify(focusMode ? 'Exam sprint mode on.' : 'Calm study mode on.');
  } else if (action === 'open-command') {
    openCommandPalette();
  } else if (action === 'command-result') {
    closeCommandPalette();
    navigate(target.dataset.path);
  } else if (action === 'account-mode') {
    account.mode = target.dataset.mode === 'signup' ? 'signup' : 'login';
    renderAccount();
  } else if (action === 'account-logout') {
    logoutAccount();
  } else {
    handleStudyAction(action, target, context());
  }
});

root.addEventListener('input', event => {
  if (event.target.id !== 'catalog-search') return;
  filters.catalog.query = event.target.value;
  refreshTrackResults('catalog');
});

root.addEventListener('submit', event => {
  if (event.target.matches('form[data-account-form]')) {
    event.preventDefault();
    submitAccountForm(event.target);
    return;
  }
  if (!event.target.matches('form[data-study-form]')) return;
  event.preventDefault();
  if (event.target.dataset.studyForm === 'generate') {
    generateStudy(event.target);
    return;
  }
  handleStudySubmit(event.target, context()).catch(() => {
    notify('This action could not be completed. Please try again.');
  });
});

root.addEventListener('change', event => {
  const target = event.target;
  if (target.matches('input[type="file"][name="sources"]') && target.form?.dataset.studyForm === 'workspace') {
    handleStudySourceChange(target);
  }
});

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  root.querySelector('#main-content').focus();
});

document.addEventListener('input', event => {
  if (event.target.id === 'command-query') renderCommandResults(event.target.value);
});

document.addEventListener('keydown', event => {
  const palette = document.getElementById('command-palette');
  const key = (event.key || '').toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'k') {
    event.preventDefault();
    if (palette && !palette.hidden) closeCommandPalette();
    else openCommandPalette();
    return;
  }
  if (!palette || palette.hidden) return;
  if (key === 'tab') {
    // The dialog has one tab stop: its combobox. Keeping Tab inside the open
    // dialog is the modal focus trap; options are reached with arrow keys.
    event.preventDefault();
    document.getElementById('command-query')?.focus();
  } else if (key === 'escape') {
    event.preventDefault();
    closeCommandPalette();
  } else if ((key === 'arrowdown' || key === 'arrowup') && commandMatches.length) {
    event.preventDefault();
    setCommandIndex(commandIndex + (key === 'arrowdown' ? 1 : -1));
    palette.querySelector(`#command-option-${commandIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  } else if (key === 'enter' && commandMatches[commandIndex]) {
    event.preventDefault();
    closeCommandPalette();
    navigate(commandMatches[commandIndex].path);
  }
});

window.addEventListener('hashchange', () => render({ focus: true }));
window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== legacyStorageKey && event.key !== null) return;
  state = readState();
  if (!root.contains(document.activeElement) || !document.activeElement.matches('input, textarea, button')) {
    render();
  }
});
window.addEventListener('keydown', event => {
  const menu = root.querySelector('.mobile-menu[aria-expanded="true"]');
  if (event.key === 'Escape' && menu) {
    toggleMenu(menu, false);
    menu.focus();
  }
});

applyFocusMode();
render();
bindPointerGlow(root);
initAccount();
