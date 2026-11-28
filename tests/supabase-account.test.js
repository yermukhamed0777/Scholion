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
function mockSupabase(t, { failLogout = false } = {}) {
  const users = new Map();
  const tokens = new Map();
  const refreshTokens = new Map();
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

    // Test-only control that simulates an expired access token while keeping
    // the refresh token valid, so the refresh flow can be exercised.
    if (url.pathname === '/control/expire-access-tokens') {
      tokens.clear();
      return send(200, { ok: true });
    }
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const userId = refreshTokens.get(body.refresh_token);
      if (!userId) return send(401, { msg: 'Invalid refresh token' });
      const token = `token-${userId}-refreshed`;
      const refresh = `refresh-${userId}-2`;
      tokens.set(token, userId);
      refreshTokens.set(refresh, userId);
      return send(200, { access_token: token, refresh_token: refresh });
    }
    if (url.pathname === '/auth/v1/signup' || url.pathname === '/auth/v1/token') {
      const user = url.pathname.endsWith('signup')
        ? { id: `user-${users.size + 1}`, email: body.email }
        : [...users.values()].find(item => item.email === body.email && item.password === body.password);
      if (!user) return send(401, { msg: 'Invalid credentials' });
      users.set(user.id, { ...user, password: body.password });
      const token = `token-${user.id}`;
      const refresh = `refresh-${user.id}`;
      tokens.set(token, user.id);
      refreshTokens.set(refresh, user.id);
      return send(200, { user: { id: user.id, email: user.email }, access_token: token, refresh_token: refresh });
    }
    if (url.pathname === '/auth/v1/user') {
      const token = (request.headers.authorization || '').replace(/^Bearer /, '');
      const userId = tokens.get(token);
      seen.push({ route: 'user', userId });
      return userId ? send(200, { id: userId, email: users.get(userId)?.email }) : send(401, { msg: 'Not authenticated' });
    }
    if (url.pathname === '/auth/v1/logout') {
      if (failLogout) return send(500, { msg: 'Upstream logout failure' });
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

// The capability probe only needs a loopback HTTP response, never a running
// model. Tests choose the answer explicitly so the suite is deterministic on
// machines with or without Ollama installed.
async function mockOllama(t, { available = true } = {}) {
  const server = createServer((request, response) => {
    request.resume();
    if (available) {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end('{"models":[]}');
    } else {
      response.writeHead(503, { 'Content-Type': 'application/json' });
      response.end('{"error":"unavailable"}');
    }
  });
  t.after(() => {
    server.close();
    server.closeAllConnections();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}/api/chat`;
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

const cookieFrom = response => (response.headers.get('set-cookie') || '')
  .split(/,\s*(?=[^;,=]+=)/)
  .map(cookie => cookie.split(';')[0].trim())
  .filter(Boolean)
  .join('; ');

test('account endpoints keep workspaces private, migrate once, delete derived data and restore backups', { timeout: 30_000 }, async t => {
  const supabase = mockSupabase(t);
  await once(supabase.server, 'listening');
  const ollamaUrl = await mockOllama(t, { available: true });
  const origin = await startApp(t, {
    SUPABASE_URL: `http://127.0.0.1:${supabase.server.address().port}`,
    SUPABASE_ANON_KEY: 'anon-test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-test-key',
    WORKSPACE_RESTORE_TOKEN: 'restore-test-token',
    WORKSPACE_RESTORE_USER_IDS: 'user-1',
    OLLAMA_URL: ollamaUrl,
  });

  const config = await (await request(origin, '/api/config')).json();
  assert.equal(config.accounts, true);
  // Accounts and AI availability are independent server-reported facts.
  assert.equal(config.generation, 'local-ollama');
  assert.equal(config.generationStatus.status, 'available');
  assert.equal(config.generationStatus.kind, 'local-ollama');

  const signupA = await request(origin, '/api/auth/signup', { method: 'POST', body: { email: 'a@example.com', password: 'password123' } });
  assert.equal(signupA.status, 200);
  let cookieA = cookieFrom(signupA);
  assert.ok(cookieA.startsWith('scholion_session='));
  assert.doesNotMatch(signupA.headers.get('set-cookie') || '', /;\s*Secure/i,
    'A plain HTTP request must not receive a Secure-only cookie');
  const sessionA = await (await request(origin, '/api/auth/session', { cookie: cookieA })).json();
  assert.equal(sessionA.user.email, 'a@example.com');

  const secureSignup = await request(origin, '/api/auth/signup', {
    method: 'POST',
    headers: { 'X-Forwarded-Proto': 'https' },
    body: { email: 'secure@example.com', password: 'password123' },
  });
  assert.equal(secureSignup.status, 200);
  assert.match(secureSignup.headers.get('set-cookie') || '', /;\s*Secure/i,
    'A request through HTTPS must receive Secure session cookies');

  const crossSite = await request(origin, '/api/auth/login', {
    method: 'POST',
    headers: { Origin: 'https://unrelated.example' },
    body: { email: 'a@example.com', password: 'password123' },
  });
  assert.equal(crossSite.status, 403, 'A cross-origin form must not reach a state-changing route');

  // Expire the access token at the mock provider while keeping the refresh
  // token, then prove the session recovers without a second password entry.
  await request(`http://127.0.0.1:${supabase.server.address().port}`, '/control/expire-access-tokens');
  const refreshed = await request(origin, '/api/auth/session', { cookie: cookieA });
  assert.equal(refreshed.status, 200);
  assert.equal((await refreshed.json()).user.email, 'a@example.com');
  assert.match(refreshed.headers.get('set-cookie') || '', /scholion_session=/);
  cookieA = cookieFrom(refreshed);

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

  const outOfScope = await request(origin, '/api/workspace/restore', {
    method: 'POST',
    headers: { 'x-restore-token': 'restore-test-token' },
    body: { userId: 'user-2', state: state('elsewhere') },
  });
  assert.equal(outOfScope.status, 403, 'A restore token must not overwrite an arbitrary user');
  assert.match((await outOfScope.json()).error.message, /not scoped/i);

  assert.ok(supabase.seen.some(item => item.route === 'rest' && item.key === 'service-test-key'),
    'Workspace reads must use the server-side service key');
  assert.ok([...new Set(supabase.seen.filter(item => item.route === 'user').map(item => item.userId))].length >= 2,
    'Each cookie must resolve to a distinct user id');
});

test('config reports local Ollama unavailable without needing a running model', { timeout: 20_000 }, async t => {
  const ollamaUrl = await mockOllama(t, { available: false });
  const origin = await startApp(t, { OLLAMA_URL: ollamaUrl });
  const config = await (await request(origin, '/api/config')).json();
  assert.equal(config.accounts, false);
  assert.equal(config.generation, 'none');
  assert.equal(config.generationStatus.status, 'unavailable');
  assert.match(config.generationStatus.reason, /not reachable/i);
});

test('sign-out clears the session cookie even when the account service fails', { timeout: 20_000 }, async t => {
  const supabase = mockSupabase(t, { failLogout: true });
  await once(supabase.server, 'listening');
  const origin = await startApp(t, {
    SUPABASE_URL: `http://127.0.0.1:${supabase.server.address().port}`,
    SUPABASE_ANON_KEY: 'anon-test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-test-key',
  });
  const signup = await request(origin, '/api/auth/signup', {
    method: 'POST', body: { email: 'logout@example.com', password: 'password123' },
  });
  const cookie = cookieFrom(signup);
  const logout = await request(origin, '/api/auth/logout', { method: 'POST', cookie });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie') || '', /scholion_session=;\s*.*Max-Age=0/i);
  const clearedCookie = cookieFrom(logout);
  const session = await (await request(origin, '/api/auth/session', { cookie: clearedCookie })).json();
  assert.equal(session.user, null);
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
