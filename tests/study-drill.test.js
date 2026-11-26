import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const shell = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const storageKey = 'scholion:v1';
const browserGlobals = ['window', 'document', 'localStorage', 'FormData'];
const excerpt = 'A conjunction needs both parts. A disjunction needs either part. A conditional has one exception.';
const quote = 'A conjunction needs both parts.';
const result = {
  sourceId: 'set-at-runtime',
  model: 'gpt-oss:20b',
  explanation: 'Three separate facts are given in the excerpt.',
  span: { start: excerpt.indexOf(quote), end: excerpt.indexOf(quote) + quote.length },
  question: {
    prompt: 'Which form needs both parts?',
    choices: ['Conjunction', 'Disjunction', 'Conditional', 'None'],
    correctIndex: 0,
    rationale: 'The first sentence says so.',
    span: { start: excerpt.indexOf(quote), end: excerpt.indexOf(quote) + quote.length },
  },
  questions: [
    {
      prompt: 'Which form needs both parts?',
      choices: ['Conjunction', 'Disjunction', 'Conditional', 'None'],
      correctIndex: 0,
      rationale: 'The first sentence says so.',
      span: { start: excerpt.indexOf(quote), end: excerpt.indexOf(quote) + quote.length },
    },
    {
      prompt: 'Which form needs either part?',
      choices: ['Conjunction', 'Disjunction', 'Conditional', 'None'],
      correctIndex: 1,
      rationale: 'The second sentence says so.',
    },
    {
      prompt: 'Which form has one exception?',
      choices: ['Conjunction', 'Disjunction', 'Conditional', 'None'],
      correctIndex: 2,
      rationale: 'The third sentence says so.',
    },
  ],
};

async function openWorkspace(t, hash, instance, savedState) {
  const { window } = new JSDOM(shell, { url: `http://localhost/${hash}` });
  t.after(() => window.close());
  window.scrollTo = () => {};
  if (savedState) window.localStorage.setItem(storageKey, savedState);
  for (const key of browserGlobals) {
    const value = key === 'window' ? window : window[key];
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  // Enable the app's config path and report a local Ollama capability so the
  // drill test exercises real generation, not the public-demo gate.
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => url === '/api/config'
    ? Response.json({ accounts: false, generation: 'local-ollama', generationStatus: { status: 'available', kind: 'local-ollama', reason: 'Local Ollama is configured for GrinderAI.' } })
    : (globalThis.__scholionFetch ? globalThis.__scholionFetch(url, options) : nativeFetch(url, options));
  t.after(() => { globalThis.fetch = nativeFetch; delete globalThis.__scholionFetch; });
  window.fetch = () => {};
  const app = new URL('../dist/app.js', import.meta.url);
  app.searchParams.set('drill-test', instance);
  await import(app.href);
  return window;
}

function waitForElement(window, selector, count = 1) {
  const matches = () => [...window.document.querySelectorAll(selector)];
  if (matches().length >= count) return Promise.resolve(matches());
  return new Promise((resolve, reject) => {
    const observer = new window.MutationObserver(() => {
      if (matches().length >= count) {
        clearTimeout(timeout);
        observer.disconnect();
        resolve(matches());
      }
    });
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Expected ${count} match(es) for ${selector}`));
    }, 2000);
    observer.observe(window.document.body, { childList: true, subtree: true });
  });
}

test('a three-question drill grades every question once and highlights the cited passage', { timeout: 6000 }, async t => {
  const previousGlobals = browserGlobals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  t.after(() => {
    for (const [key, descriptor] of previousGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });

  const window = await openWorkspace(t, '#/workspace', String(Date.now()));
  const document = window.document;
  const upload = document.querySelector('form[data-study-form="workspace"]');
  const picker = upload.elements.namedItem('sources');
  Object.defineProperty(picker, 'files', {
    value: [new File([excerpt], 'logic.txt', { type: 'text/plain' })],
  });
  picker.dispatchEvent(new window.Event('change', { bubbles: true }));
  upload.elements.namedItem('title').value = 'Logic drill';
  const navigated = once(window, 'hashchange');
  upload.querySelector('button[type="submit"]').click();
  await navigated;

  const readState = () => JSON.parse(window.localStorage.getItem(storageKey));
  const source = readState().entries[0].sources[0];
  const payload = { ...result, sourceId: source.id };
  const calls = [];
  globalThis.__scholionFetch = async (url, options) => { calls.push([url, options]); return Response.json(payload); };
  const generate = document.querySelector('form[data-study-form="generate"]');
  generate.querySelector('button[type="submit"]').click();
  await waitForElement(window, 'form[data-study-form="generated-drill"]');
  assert.equal(calls.filter(call => call[0] === '/api/generate-study').length, 1);

  const drill = document.querySelector('form[data-study-form="generated-drill"]');
  assert.equal(drill.querySelectorAll('fieldset.study-choices').length, 3);
  for (let index = 0; index < 3; index++) {
    assert.equal(drill.querySelectorAll(`input[name="choice-${index}"]`).length, 4);
  }
  assert.equal(document.querySelectorAll('.generated-material [data-action="open-study-source"]').length, 1);

  [0, 1, 2].forEach(index => {
    drill.querySelector(`input[name="choice-${index}"][value="${index}"]`).checked = true;
  });
  drill.querySelector('button[type="submit"]').click();
  const feedback = await waitForElement(window, '.generated-question-feedback', 3);
  assert.equal(feedback.length, 3);
  assert.match(feedback[0].textContent, /Question 1: Correct/);
  assert.match(feedback[2].textContent, /Question 3: Correct/);

  const state = readState();
  const saved = state.entries[0].generatedStudy;
  assert.equal(saved.answers.length, 3);
  assert.ok(saved.answers.every(answer => answer.correct));
  assert.equal(state.attempts.length, 3);
  assert.equal(new Set(state.attempts.map(attempt => attempt.questionId)).size, 3);

  drill.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(readState().attempts.length, 3, 'A completed drill must not create duplicate attempts');

  const citation = document.querySelector('.generated-material [data-action="open-study-source"][data-span-start]');
  assert.ok(citation, 'The explanation citation must carry exact offsets');
  citation.click();
  const mark = document.querySelector(`#source-${source.id} mark.study-citation-highlight`);
  assert.equal(mark?.textContent, quote);
  assert.equal(document.querySelector(`#source-${source.id} pre`).textContent, excerpt);

  const remounted = await openWorkspace(t, window.location.hash, `${Date.now()}-reload`, window.localStorage.getItem(storageKey));
  assert.equal(remounted.document.querySelectorAll('.generated-question-feedback').length, 3);
  assert.equal(JSON.parse(remounted.localStorage.getItem(storageKey)).attempts.length, 3);
  assert.equal(calls.length, 1, 'Restoring a saved drill must not regenerate it');
});
