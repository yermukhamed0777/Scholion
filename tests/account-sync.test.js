import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const shell = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const storageKey = 'scholion:v1';
const globals = ['window', 'document', 'localStorage', 'FormData', 'fetch'];

// P0-2: a stale browser copy must never replace a signed-in workspace on the
// first mutation. The test drives the real app module through jsdom and inspects
// the exact PUT body rather than injected in-memory state.
test('signing in keeps the remote workspace when the next mutation syncs', { timeout: 15_000 }, async t => {
  const previous = globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  t.after(() => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });

  const { window } = new JSDOM(shell, { url: 'http://localhost/#/' });
  t.after(() => window.close());
  window.scrollTo = () => {};
  const localState = {
    savedTrackIds: [],
    entries: [{
      id: 'stale-local', title: 'Stale local plan', notes: '', createdAt: new Date().toISOString(),
      tasks: [], sources: [], attempts: [],
    }],
    attempts: [],
  };
  const remoteState = {
    savedTrackIds: [],
    entries: [{
      id: 'remote-plan', title: 'Remote plan', notes: '', createdAt: new Date().toISOString(),
      tasks: [], sources: [{ id: 'remote-source', name: 'a.txt', title: 'A', text: 'Remote passage.' }],
    }],
    attempts: [],
  };
  window.localStorage.setItem(storageKey, JSON.stringify(localState));

  const puts = [];
  const fetchStub = async (url, options = {}) => {
    if (url === '/api/config') {
      return {
        ok: true,
        json: async () => ({
          accounts: true,
          generation: 'none',
          generationStatus: { status: 'unavailable', kind: 'none', reason: 'No provider in this test.' },
        }),
      };
    }
    if (url === '/api/auth/session') {
      return { ok: true, json: async () => ({ user: { id: 'user-1', email: 'learner@example.com' } }) };
    }
    if (url === '/api/workspace' && (!options.method || options.method === 'GET')) {
      return { ok: true, json: async () => ({ state: remoteState }) };
    }
    if (url === '/api/workspace' && options.method === 'PUT') {
      puts.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: false, json: async () => ({ error: { message: 'unexpected request' } }) };
  };
  for (const key of globals) {
    const value = key === 'window' ? window : key === 'fetch' ? fetchStub : window[key];
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  window.fetch = fetchStub;
  const app = new URL('../dist/app.js', import.meta.url);
  app.searchParams.set('sync-test', 'remote');
  await import(app.href);
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.equal(window.localStorage.getItem(storageKey), JSON.stringify(remoteState),
    'The signed-in remote state must become the browser copy before any mutation');
  const button = window.document.querySelector('[data-action="save-track"][data-track-id="sat"]');
  assert.ok(button, 'A real mutation control must be available');
  button.click();
  await new Promise(resolve => setTimeout(resolve, 50));

  assert.equal(puts.length, 1, 'One mutation must send exactly one workspace PUT');
  assert.ok(puts[0].savedTrackIds.includes('sat'));
  assert.equal(puts[0].entries[0].id, 'remote-plan', 'The PUT must keep the remote entries');
  assert.equal(puts[0].entries.some(entry => entry.id === 'stale-local'), false,
    'Stale localStorage must not clobber the account workspace');
});
