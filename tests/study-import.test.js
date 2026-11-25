import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const shell = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const storageKey = 'scholion:v1';
const browserGlobals = ['window', 'document', 'localStorage'];

async function openWorkspace(t, hash, instance, savedStorage) {
  const { window } = new JSDOM(shell, { url: `http://localhost/${hash}` });
  t.after(() => window.close());
  window.scrollTo = () => {};

  for (const [key, value] of savedStorage ?? []) window.localStorage.setItem(key, value);
  for (const key of browserGlobals) {
    const value = key === 'window' ? window : window[key];
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const app = new URL('../dist/app.js', import.meta.url);
  app.searchParams.set('test-instance', instance);
  await import(app.href);
  return window;
}

function checkCitations(document, fixtures) {
  const details = [...document.querySelectorAll('details.study-source')];
  assert.equal(details.length, fixtures.length);
  details.forEach((source, index) => {
    const { title, pages, text } = fixtures[index];
    const summary = source.querySelector('summary.study-citation');
    const label = summary.textContent.trim();
    assert.ok(label.includes(title), `Expected the citation to show ${title}`);
    if (pages) assert.ok(label.includes(pages), `Expected the citation to show ${pages}`);
    else assert.equal(label, title);

    assert.equal(source.open, false);
    summary.click();
    assert.equal(source.open, true);
    assert.equal(source.querySelector('pre').textContent, text);
  });
}

test('study uploads preserve each edited citation and open its passage after remount', { timeout: 5000 }, async t => {
  const previousGlobals = browserGlobals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  t.after(() => {
    for (const [key, descriptor] of previousGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const fixtures = [
    { name: 'topic-1-2.txt', title: 'Logic & <notes>', pages: '25–28', text: 'Synthetic logic passage.' },
    { name: 'topic-3-4.txt', title: 'Counting notes', pages: '30–33', text: 'Synthetic counting passage.' },
    { name: 'topic-5-6.txt', title: 'Undated handout', pages: '', text: 'Synthetic handout without page labels.' },
  ];
  const window = await openWorkspace(t, '#/workspace', 'upload');
  const form = window.document.querySelector('form[data-study-form="workspace"]');
  const picker = form.elements.namedItem('sources');
  Object.defineProperty(picker, 'files', {
    value: fixtures.map(({ text, name }) => new File([text], name, { type: 'text/plain' })),
  });
  picker.dispatchEvent(new window.Event('change', { bubbles: true }));

  assert.equal(form.querySelectorAll('input[name^="source-title-"]').length, fixtures.length);
  fixtures.forEach(({ name, title, pages }, index) => {
    const titleInput = form.elements.namedItem(`source-title-${index}`);
    const pagesInput = form.elements.namedItem(`source-pages-${index}`);
    assert.equal(titleInput.value, name);
    assert.equal(pagesInput.value, '', 'Filenames must not infer page ranges');
    titleInput.value = title;
    pagesInput.value = pages;
  });
  form.elements.namedItem('title').value = 'Discrete Mathematics';
  const navigated = once(window, 'hashchange');
  form.querySelector('button[type="submit"]').click();
  await navigated;

  const saved = window.localStorage.getItem(storageKey);
  const entry = JSON.parse(saved).entries[0];
  assert.equal(window.location.hash, `#/workspace/${entry.id}`);
  assert.deepEqual(entry.sources.map(({ name, title, pages }) => ({ name, title, pages: pages ?? '' })),
    fixtures.map(({ name, title, pages }) => ({ name, title, pages })));
  for (const source of entry.sources) {
    assert.ok(Array.isArray(source.spans) && source.spans.length > 0,
      'An imported source must store passage spans with exact offsets');
    for (const span of source.spans) assert.equal(source.text.slice(span.start, span.end), span.text);
  }
  checkCitations(window.document, fixtures);

  // Mount a new app and DOM with only the browser storage from the successful form submit.
  const remounted = await openWorkspace(t, window.location.hash, 'reload', [[storageKey, saved]]);
  checkCitations(remounted.document, fixtures);
  assert.equal(remounted.location.hash, window.location.hash);
});
