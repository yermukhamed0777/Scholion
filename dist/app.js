import { getTrack, tracks } from './learning.js';
import { coverageLabel, trackCoverage } from './coverage.js';
import { getTrackSources } from './source-registry.js';
import { handleStudyAction, handleStudySourceChange, handleStudySubmit, renderStudyPage } from './study.js';
import { escapeHtml, icon } from './ui.js';

const root = document.querySelector('#app');
const announcement = document.querySelector('#announcement');
const storageKey = 'allaroundprep:v1';
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

function readState(fallback = { savedTrackIds: [], entries: [], attempts: [] }) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored && Array.isArray(stored.savedTrackIds) && Array.isArray(stored.entries) && Array.isArray(stored.attempts)) {
      return stored;
    }
  } catch {
    return fallback;
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
  return `<article class="track-card" data-tone="${track.tone}">
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
  return `<a class="quick-link" href="${path}">
    <span class="quick-icon" data-tone="${tone}">${icon(symbol, 19)}</span>
    <span class="quick-copy"><strong>${title}</strong><small>${text}</small></span>
  </a>`;
}

function dashboard() {
  const latestPlan = state.entries[0];
  return `
    ${pageHeading('Study workspace', 'Your exams, courses, and new skills in one place.',
      '<a class="button button-secondary" href="#/materials">' + icon('folder-open', 17) + ' My materials</a>', 'dashboard-heading')}
    <section class="hero" aria-labelledby="hero-heading">
      <img class="hero-art" src="./assets/study-hero.jpg" alt="" width="1672" height="941" fetchpriority="high">
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
      ${track.nativeName ? `<p class="track-meta">${escapeHtml(track.nativeName)}</p>` : ''}
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

function sidebar(page) {
  return `<aside class="sidebar" id="workspace-sidebar">
    <a class="brand" href="#/" aria-label="ALLaroundPREP overview">
      <span class="brand-symbol">${icon('orbit', 22)}</span>
      <span class="brand-wordmark">ALLaround<b>PREP</b></span>
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
      <div class="sidebar-status">${icon('monitor', 19)}<div><strong>Local workspace</strong><small>Saved in this browser</small></div></div>
    </div>
  </aside>`;
}

function render({ focus = false } = {}) {
  const route = currentRoute();
  const label = navGroups.flatMap(([, links]) => links).find(([key]) => key === route.page)?.[1] ?? 'Page unavailable';
  root.dataset.page = route.page;
  document.title = `${label} · ALLaroundPREP`;
  root.innerHTML = `<div class="app-shell">
    ${sidebar(route.page)}
    <div class="main-shell">
      <header class="topbar">
        <button class="mobile-menu" type="button" data-action="toggle-menu" aria-expanded="false" aria-controls="workspace-sidebar" aria-label="Toggle navigation">${icon('menu', 23)}</button>
        <div class="breadcrumbs"><span>Workspace</span>${icon('chevron-right', 14)}<strong>${label}</strong></div>
        <div class="topbar-actions">
          <a class="topbar-action" href="#/catalog">${icon('search', 18)}<span>Find a track</span></a>
          <span class="local-badge">Local preview</span>
        </div>
      </header>
      <main class="main-content" id="main-content" tabindex="-1">${pageContent(route)}</main>
    </div>
  </div>`;
  syncGenerationForm();
  if (focus) {
    window.scrollTo(0, 0);
    root.querySelector('#main-content').focus({ preventScroll: true });
  }
}

function context() {
  return { state, commit, navigate, notify, render, route: currentRoute() };
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
  form.setAttribute('aria-busy', String(generating));
  form.querySelector('button[type="submit"]').disabled = generating;
  form.querySelector('select[name="sourceId"]').disabled = generating;
  form.querySelector('[data-generation-status]').hidden = !generating;
}

function isGeneratedStudy(value, sourceId) {
  const question = value?.question;
  return value?.sourceId === sourceId && typeof value.model === 'string' && typeof value.explanation === 'string' &&
    typeof question?.prompt === 'string' && typeof question.rationale === 'string' &&
    Array.isArray(question.choices) && question.choices.length === 4 && question.choices.every(choice => typeof choice === 'string') &&
    Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < question.choices.length;
}

async function generateStudy(form) {
  const entryId = form.dataset.entryId;
  const entry = readState(state).entries.find(item => item.id === entryId);
  const sourceId = form.elements.namedItem('sourceId').value;
  const source = entry?.sources.find(item => item.id === sourceId);
  if (!source || generatingPlans.has(entryId)) return;

  generatingPlans.add(entryId);
  syncGenerationForm();
  let saved = false;
  try {
    const response = await fetch('/api/generate-study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, title: source.title || source.name, pages: source.pages, text: source.text }),
      signal: AbortSignal.timeout(95_000),
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
      question: result.question,
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

window.addEventListener('hashchange', () => render({ focus: true }));
window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return;
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

render();
