import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { deleteSourceFromWorkspace, isValidWorkspace } from '../scripts/workspace-state.mjs';

const state = (sourceId = 'source-1') => ({
  savedTrackIds: ['sat'],
  entries: [{
    id: 'entry-1', title: 'Synthetic plan', notes: '', createdAt: new Date().toISOString(),
    tasks: [{ id: 'task-1', title: 'Read', done: false }],
    sources: [{ id: sourceId, name: 'a.txt', title: 'A', text: 'Synthetic text.' }],
    generatedStudy: { id: 'gen-1', sourceId, model: 'gpt-oss:20b', explanation: 'Synthetic.', question: { prompt: 'Q?', choices: ['a', 'b', 'c', 'd'], correctIndex: 0, rationale: 'r' } },
  }],
  attempts: [
    { questionId: 'gen-1', generationId: 'gen-1', entryId: 'entry-1', sourceId, choiceIndex: 0, correct: true, createdAt: new Date().toISOString() },
    { questionId: 'sample-1', choiceIndex: 1, correct: false, createdAt: new Date().toISOString() },
  ],
});

async function startApp(t, env) {
  const script = fileURLToPath(new URL('../scripts/serve.mjs', import.meta.url));
  const child = spawn(process.execPath, [script, '0'], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'inherit'],
    windowsHide: true,
  });
  const lines = createInterface({ input: child.stdout });
  t.after(async () => {
    lines.close();
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit', { signal: AbortSignal.timeout(5_000) });
    child.kill();
    await exited;
  });
  const [line] = await once(lines, 'line', { signal: AbortSignal.timeout(10_000) });
  const match = line.match(/http:\/\/127\.0\.0\.1:\d+/);
  assert.ok(match, `The app must report its URL: ${line}`);
  return match[0];
}

// Minimal GoTrue + PostgREST surface. It records which token and which user id
// reached each route so the test can prove per-user access checks.
function mockSupabase(t) {
  const users = new Map();
  const tokens = new Map();
  const workspaces = new Map();
  const seen = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const send = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(body));
    };
    const chunks = [];
    for await (const chunk of request.iterator()) chunks.push(chunk);
    let body = {};
    try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; } catch { body = {}; }

    if (url.pathname === '/auth/v1/signup' || url.pathname === '/auth/v1/token') {
      const user = url.pathname.endsWith('signup')
        ? { id: `user-${users.size + 1}`, email: body.email }
        : [...users.values()].find(item => item.email === body.email && item.password === body.password);
      if (!user) return send(401, { msg: 'Invalid credentials' });
      users.set(user.id, { ...user, password: body.password });
      const token = `token-${user.id}`;
      tokens.set(token, user.id);
      return send(200, { user: { id: user.id, email: user.email }, access_token: token });
    }
    if (url.pathname === '/auth/v1/user') {
      const token = (request.headers.authorization || '').replace(/^Bearer /, '');
      const userId = tokens.get(token);
      seen.push({ route: 'user', userId });
      return userId ? send(200, { id: userId, email: users.get(userId)?.email }) : send(401, { msg: 'Not authenticated' });
    }
    if (url.pathname === '/auth/v1/logout') {
      tokens.delete((request.headers.authorization || '').replace(/^Bearer /, ''));
      return send(200, {});
    }
    if (url.pathname === '/rest/v1/workspaces') {
      const key = request.headers.apikey;
      seen.push({ route: 'rest', key });
      if (request.method === 'GET') {
        const userId = url.searchParams.get('user_id')?.replace(/^eq\./, '');
        return send(200, userId && workspaces.has(userId) ? [{ data: workspaces.get(userId) }] : []);
      }
      if (request.method === 'POST') {
        workspaces.set(body.user_id, body.data);
        return send(201, {});
      }
    }
    return send(404, { msg: 'Not found' });
  });
  t.after(() => {
    server.close();
    server.closeAllConnections();
  });
  server.listen(0, '127.0.0.1');
  return { server, seen, workspaces };
}

function request(origin, path, { method = 'GET', body, cookie, headers = {} } = {}) {
  return fetch(origin + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8_000),
  });
}

const cookieFrom = response => (response.headers.get('set-cookie') || '').split(';')[0];

test('account endpoints keep workspaces private, migrate once, delete derived data and restore backups', { timeout: 30_000 }, async t => {
  const supabase = mockSupabase(t);
  await once(supabase.server, 'listening');
  const origin = await startApp(t, {
    SUPABASE_URL: `http://127.0.0.1:${supabase.server.address().port}`,
    SUPABASE_ANON_KEY: 'anon-test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-test-key',
    WORKSPACE_RESTORE_TOKEN: 'restore-test-token',
  });

  const config = await (await request(origin, '/api/config')).json();
  assert.equal(config.accounts, true);
  // Accounts and AI availability are independent server-reported facts.
  assert.equal(config.generation, 'local-ollama');
  assert.equal(config.generationStatus.status, 'available');
  assert.equal(config.generationStatus.kind, 'local-ollama');

  const signupA = await request(origin, '/api/auth/signup', { method: 'POST', body: { email: 'a@example.com', password: 'password123' } });
  assert.equal(signupA.status, 200);
  const cookieA = cookieFrom(signupA);
  assert.ok(cookieA.startsWith('scholion_session='));
  const sessionA = await (await request(origin, '/api/auth/session', { cookie: cookieA })).json();
  assert.equal(sessionA.user.email, 'a@example.com');

  const empty = await (await request(origin, '/api/workspace', { cookie: cookieA })).json();
  assert.deepEqual(empty.state, { savedTrackIds: [], entries: [], attempts: [] });

  assert.equal((await request(origin, '/api/workspace', {
    method: 'PUT', cookie: cookieA, body: state(),
  })).status, 200);
  const stored = await (await request(origin, '/api/workspace', { cookie: cookieA })).json();
  assert.equal(stored.state.entries[0].sources.length, 1);
  assert.equal(stored.state.attempts.length, 2);

  const signupB = await request(origin, '/api/auth/signup', { method: 'POST', body: { email: 'b@example.com', password: 'password123' } });
  const cookieB = cookieFrom(signupB);
  const isolated = await (await request(origin, '/api/workspace', { cookie: cookieB })).json();
  assert.equal(isolated.state.entries.length, 0, 'A second account must not read the first account data');

  const migrated = await (await request(origin, '/api/workspace/migrate', {
    method: 'POST', cookie: cookieB, body: { state: state('source-b') },
  })).json();
  assert.equal(migrated.state.entries.length, 1);
  const migratedAgain = await (await request(origin, '/api/workspace/migrate', {
    method: 'POST', cookie: cookieB, body: { state: { savedTrackIds: [], entries: [], attempts: [] } },
  })).json();
  assert.equal(migratedAgain.state.entries.length, 1, 'Migration must not overwrite an existing remote workspace');

  const deleted = await (await request(origin, '/api/workspace/delete-source', {
    method: 'POST', cookie: cookieB, body: { sourceId: 'source-b' },
  })).json();
  assert.equal(deleted.state.entries[0].sources.length, 0);
  assert.equal(deleted.state.entries[0].generatedStudy, undefined);
  assert.equal(deleted.state.attempts.length, 1, 'Only the attempt derived from the deleted source is removed');
  assert.equal(deleted.state.attempts[0].questionId, 'sample-1');

  const denied = await request(origin, '/api/workspace/restore', {
    method: 'POST', body: { userId: 'user-1', state: state('restored') },
  });
  assert.equal(denied.status, 403);
  assert.equal((await request(origin, '/api/workspace/restore', {
    method: 'POST',
    headers: { 'x-restore-token': 'restore-test-token' },
    body: { userId: 'user-1', state: state('restored') },
  })).status, 200);
  const restored = await (await request(origin, '/api/workspace', { cookie: cookieA })).json();
  assert.equal(restored.state.entries[0].sources[0].id, 'restored');

  assert.ok(supabase.seen.some(item => item.route === 'rest' && item.key === 'service-test-key'),
    'Workspace reads must use the server-side service key');
  assert.ok([...new Set(supabase.seen.filter(item => item.route === 'user').map(item => item.userId))].length >= 2,
    'Each cookie must resolve to a distinct user id');
});

test('account endpoints degrade cleanly without Supabase configuration', { timeout: 15_000 }, async t => {
  const origin = await startApp(t, {
    SUPABASE_URL: '', SUPABASE_ANON_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '',
  });
  const config = await (await request(origin, '/api/config')).json();
  assert.equal(config.accounts, false);
  const workspace = await request(origin, '/api/workspace');
  assert.equal(workspace.status, 503);
  assert.equal(typeof (await workspace.json()).error.message, 'string');
});

test('the pure workspace rules reject invalid state and remove only derived data', () => {
  assert.equal(isValidWorkspace({ savedTrackIds: [], entries: [], attempts: [] }), true);
  assert.equal(isValidWorkspace({ savedTrackIds: [], entries: [{}], attempts: [] }), false);
  const before = state('source-1');
  const after = deleteSourceFromWorkspace(before, 'source-1');
  assert.equal(after.entries[0].sources.length, 0);
  assert.equal(after.entries[0].generatedStudy, undefined);
  assert.equal(after.attempts.length, 1);
  assert.equal(before.entries[0].sources.length, 1, 'Deletion must not mutate the original state');
});
