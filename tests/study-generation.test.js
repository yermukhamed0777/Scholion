import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const shell = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const storageKey = 'scholion:v1';
const browserGlobals = ['window', 'document', 'localStorage', 'FormData'];

async function openWorkspace(t, hash, instance, savedState) {
  const { window } = new JSDOM(shell, { url: `http://localhost/${hash}` });
  t.after(() => window.close());
  window.scrollTo = () => {};
  if (savedState) window.localStorage.setItem(storageKey, savedState);

  for (const key of browserGlobals) {
    const value = key === 'window' ? window : window[key];
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const app = new URL('../dist/app.js', import.meta.url);
  app.searchParams.set('generation-test', instance);
  await import(app.href);
  return window;
}

function waitForElement(window, selector) {
  const element = window.document.querySelector(selector);
  if (element) return Promise.resolve(element);

  return new Promise((resolve, reject) => {
    const observer = new window.MutationObserver(() => {
      const match = window.document.querySelector(selector);
      if (!match) return;
      clearTimeout(timeout);
      observer.disconnect();
      resolve(match);
    });
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Expected the app to render ${selector}`));
    }, 2000);
    observer.observe(window.document.body, { childList: true, subtree: true });
  });
}

function checkGeneratedCitations(document, source, otherSource) {
  const citations = [...document.querySelectorAll('.generated-material [data-action="open-study-source"]')];
  assert.equal(citations.length, 2, 'The explanation and graded rationale must each cite the selected passage');
  const sourceDetails = document.getElementById(`source-${source.id}`);
  const otherDetails = document.getElementById(`source-${otherSource.id}`);
  for (const citation of citations) {
    assert.equal(citation.dataset.sourceId, source.id);
    sourceDetails.open = false;
    citation.click();
    assert.equal(sourceDetails.open, true);
    assert.equal(sourceDetails.querySelector('pre').textContent, source.text);
    assert.equal(otherDetails.open, false);
    assert.equal(document.activeElement, sourceDetails.querySelector('summary'));
  }
}

test('study generation uses the selected source and preserves its graded answer and citations after remount', { timeout: 5000 }, async t => {
  const previousGlobals = browserGlobals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  t.after(() => {
    for (const [key, descriptor] of previousGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const inputs = [
    new File(['A prime number has exactly two positive divisors.'], 'primes.txt', { type: 'text/plain' }),
    new File(['A conjunction is true only when both statements are true.'], 'logic.txt', { type: 'text/plain' }),
  ];
  const window = await openWorkspace(t, '#/workspace', 'upload');
  const document = window.document;
  const upload = document.querySelector('form[data-study-form="workspace"]');
  const picker = upload.elements.namedItem('sources');
  Object.defineProperty(picker, 'files', { value: inputs });
  picker.dispatchEvent(new window.Event('change', { bubbles: true }));
  upload.elements.namedItem('title').value = 'Discrete Mathematics';
  upload.elements.namedItem('source-title-1').value = 'Logic excerpt';
  upload.elements.namedItem('source-pages-1').value = '12–13';
  const navigated = once(window, 'hashchange');
  upload.querySelector('button[type="submit"]').click();
  await navigated;

  const readState = () => JSON.parse(window.localStorage.getItem(storageKey));
  const plan = readState().entries[0];
  const [otherSource, source] = plan.sources;
  const result = {
    sourceId: source.id,
    model: 'gpt-oss:20b',
    explanation: 'For a conjunction P and Q, both statements must be true.',
    question: {
      prompt: 'When is a conjunction true?',
      choices: ['Only when P is true', 'When P and Q are both true', 'When neither statement is true', 'Whenever Q is false'],
      correctIndex: 1,
      rationale: 'The excerpt requires both statements to be true.',
    },
  };
  const request = t.mock.method(globalThis, 'fetch', async () => Response.json(result));
  const generate = document.querySelector('form[data-study-form="generate"]');
  generate.elements.namedItem('sourceId').value = source.id;
  generate.querySelector('button[type="submit"]').click();
  const quiz = await waitForElement(window, 'form[data-study-form="generated-quiz"]');

  assert.equal(request.mock.callCount(), 1);
  const [path, options] = request.mock.calls[0].arguments;
  assert.equal(path, '/api/generate-study');
  assert.equal(options.method, 'POST');
  const body = JSON.parse(options.body);
  assert.equal(body.sourceId, source.id);
  assert.equal(body.title, source.title);
  assert.equal(body.pages, source.pages);
  assert.equal(body.text, source.text);
  assert.equal(quiz.querySelectorAll('input[name="choice"]').length, 4);
  assert.ok(!document.querySelector('.generated-material').textContent.includes(result.question.rationale));

  quiz.querySelector('input[name="choice"][value="1"]').checked = true;
  quiz.querySelector('button[type="submit"]').click();
  await waitForElement(window, '.generated-question-feedback');
  assert.match(document.querySelector('.generated-question-feedback').textContent, /Correct/);
  assert.ok(document.querySelector('.generated-question-feedback').textContent.includes(result.question.rationale));
  const state = readState();
  const saved = state.entries[0].generatedStudy;
  assert.equal(saved.sourceId, source.id);
  assert.equal(saved.model, result.model);
  assert.equal(saved.explanation, result.explanation);
  assert.deepEqual(saved.question, result.question);
  assert.equal(saved.answer.choiceIndex, 1);
  assert.equal(saved.answer.correct, true);
  assert.equal(state.attempts.length, 1);
  assert.equal(state.attempts[0].correct, true);
  const gradedQuiz = document.querySelector('form[data-study-form="generated-quiz"]');
  gradedQuiz.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(readState().attempts.length, 1, 'A checked question must not produce a duplicate attempt');
  checkGeneratedCitations(document, source, otherSource);

  const remounted = await openWorkspace(t, window.location.hash, 'reload', window.localStorage.getItem(storageKey));
  assert.ok(remounted.document.querySelector('.generated-material').textContent.includes(result.explanation));
  assert.match(remounted.document.querySelector('.generated-question-feedback').textContent, /Correct/);
  checkGeneratedCitations(remounted.document, source, otherSource);
  assert.equal(JSON.parse(remounted.localStorage.getItem(storageKey)).attempts.length, 1);
  assert.equal(request.mock.callCount(), 1, 'Restoring a saved plan must not generate a fresh question');

  const progressNavigated = once(remounted, 'hashchange');
  remounted.location.hash = '#/progress';
  await progressNavigated;
  assert.match(remounted.document.querySelector('.study-generated-progress').textContent, /1 of 1 generated questions correct/);
});
