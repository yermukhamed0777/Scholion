import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const shell = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const storageKey = 'scholion:v1';
const legacyStorageKey = 'allaroundprep:v1';
const browserGlobals = ['window', 'document', 'localStorage', 'FormData'];

async function openWorkspace(t, hash, instance, storage = []) {
  const { window } = new JSDOM(shell, { url: `http://localhost/${hash}` });
  t.after(() => window.close());
  window.scrollTo = () => {};
  for (const [key, value] of storage) window.localStorage.setItem(key, value);
  for (const key of browserGlobals) {
    const value = key === 'window' ? window : window[key];
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  const app = new URL('../dist/app.js', import.meta.url);
  app.searchParams.set('feature-test', instance);
  await import(app.href);
  return window;
}

function isolateGlobals(t) {
  const previous = browserGlobals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  t.after(() => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
}

test('plans saved under the old project name migrate to the Scholion key', async t => {
  isolateGlobals(t);
  const saved = JSON.stringify({ savedTrackIds: ['sat'], entries: [], attempts: [] });
  const window = await openWorkspace(t, '#/', 'migration', [[legacyStorageKey, saved]]);
  assert.equal(window.localStorage.getItem(storageKey), saved);
  assert.equal(window.localStorage.getItem(legacyStorageKey), null);
});

test('the atlas switches its preview without leaving the page', async t => {
  isolateGlobals(t);
  const window = await openWorkspace(t, '#/', 'atlas');
  const document = window.document;
  const option = document.querySelector('[data-action="atlas-select"][data-track-id="unt"]');
  option.click();
  assert.match(document.querySelector('#atlas-preview h3').textContent, /UNT/);
  assert.equal(option.getAttribute('aria-pressed'), 'true');
  assert.equal(window.location.hash, '#/');
});

test('the labelled sandbox switches samples and reveals a checked answer', async t => {
  isolateGlobals(t);
  const window = await openWorkspace(t, '#/', 'sandbox');
  const document = window.document;
  document.querySelector('[data-action="sandbox-sample"][data-sample-id="sat"]').click();
  assert.match(document.querySelector('#sandbox-preview h3').textContent, /SAT reading/);
  const button = document.querySelector('[data-action="sandbox-answer"]');
  const answer = document.querySelector('[data-sandbox-answer]');
  assert.equal(answer.hidden, true);
  button.click();
  assert.equal(answer.hidden, false);
  assert.match(answer.textContent, /original battery/);
  assert.equal(button.textContent, 'Hide answer');
});

test('focus mode persists and restores the calm desk atmosphere', async t => {
  isolateGlobals(t);
  const window = await openWorkspace(t, '#/', 'focus');
  const document = window.document;
  const toggle = document.querySelector('[data-action="toggle-focus"]');
  assert.equal(document.body.dataset.mode, 'desk');
  toggle.click();
  assert.equal(document.body.dataset.mode, 'sprint');
  assert.equal(window.localStorage.getItem('scholion:mode'), 'sprint');
  assert.equal(toggle.querySelector('[data-focus-label]').textContent, 'Sprint');
  toggle.click();
  assert.equal(document.body.dataset.mode, 'desk');
  assert.equal(window.localStorage.getItem('scholion:mode'), 'desk');
});

test('sprint mode keeps the clock and a single exit control visible', async () => {
  const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /body\[data-mode="sprint"\]\s+\.topbar-actions,\s*\n?\s*body\[data-mode="sprint"\]/,
    'The whole top-bar actions group must not be hidden in sprint mode');
  assert.match(css, /body\[data-mode="sprint"\]\s+\.topbar-actions\s*>\s*:not\(\.focus-clock\):not\(\[data-action="toggle-focus"]\)\s*\{\s*display:\s*none/);
  assert.match(css, /body\[data-mode="sprint"\]\s+\.mobile-menu\s*\{\s*display:\s*none/);
});

test('the command palette finds a track and navigates with Enter', async t => {
  isolateGlobals(t);
  const window = await openWorkspace(t, '#/', 'command');
  const document = window.document;
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  const palette = document.getElementById('command-palette');
  assert.equal(palette.hidden, false);
  const input = document.getElementById('command-query');
  input.value = 'discrete';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  const result = document.querySelector('.command-result');
  assert.match(result.textContent, /Discrete Mathematics/);
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(palette.hidden, true);
  assert.equal(window.location.hash, '#/catalog/discrete-mathematics');
});

test('practice reveals one hint before the answer is checked', async t => {
  isolateGlobals(t);
  const window = await openWorkspace(t, '#/practice/sat', 'hint');
  const document = window.document;
  const button = document.querySelector('[data-action="reveal-hint"]');
  const hint = document.querySelector('[data-hint-for]');
  assert.ok(button);
  assert.equal(hint.hidden, true);
  button.click();
  assert.equal(hint.hidden, false);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.match(hint.textContent, /fixed charge/);
});
