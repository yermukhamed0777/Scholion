import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handleAccountRequest } from '../scripts/account-endpoints.mjs';
import { clientKey, createRateLimiter } from '../scripts/rate-limit.js';
import { signIn } from '../scripts/supabase.mjs';

function mockResponse() {
  return {
    status: null,
    headers: {},
    body: '',
    writeHead(status, headers) {
      this.status = status;
      Object.assign(this.headers, headers || {});
      return this;
    },
    setHeader(key, value) { this.headers[key] = value; },
    end(body) { this.body = body || ''; return this; },
  };
}

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

test('the limiter allows a window, then reports a retry delay', () => {
  let now = 1000;
  const take = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => now });
  assert.deepEqual(take('client'), { allowed: true, retryAfter: 60 });
  assert.equal(take('client').allowed, true);
  assert.equal(take('client').allowed, false);
  assert.equal(take('other').allowed, true);
  now += 60_001;
  assert.equal(take('client').allowed, true);
  assert.equal(clientKey({ headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } }), '203.0.113.9');
});

test('generation requests beyond the documented quota return JSON 429', { timeout: 20_000 }, async t => {
  const origin = await startApp(t, {
    RATE_LIMIT_GENERATE_MAX: '2',
    OLLAMA_URL: 'http://127.0.0.1:1/api/chat',
  });
  const send = () => fetch(`${origin}/api/generate-study`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: 'synthetic-rate-limit', text: 'A short synthetic passage.' }),
    signal: AbortSignal.timeout(8_000),
  });
  assert.equal((await send()).status, 502);
  assert.equal((await send()).status, 502);
  const limited = await send();
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  assert.match((await limited.json()).error.message, /too many/i);
});

test('account routes return JSON 429 after the configured quota', async () => {
  const env = { RATE_LIMIT_AUTH_MAX: '2' };
  const request = () => {
    const response = mockResponse();
    const inbound = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      async *iterator() { /* an empty body is rejected as invalid JSON */ },
    };
    return handleAccountRequest('/api/auth/login', inbound, response, env).then(() => response);
  };
  assert.equal((await request()).status, 400, 'Requests inside the quota reach validation');
  assert.equal((await request()).status, 400);
  const limited = await request();
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers['Retry-After']) >= 1);
  assert.match(JSON.parse(limited.body).error.message, /too many/i);
});

test('upstream account error bodies are never echoed to the client', async t => {
  const previous = globalThis.fetch;
  t.after(() => { globalThis.fetch = previous; });
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => '{"message":"sk-secret-provider-internal-detail"}',
  });
  const config = {
    base: 'https://example.invalid', anonKey: 'public', serviceKey: 'secret', table: 'workspaces',
  };
  await assert.rejects(
    () => signIn(config, 'learner@example.com', 'password123'),
    error => {
      assert.equal(error.message, 'The account service is unavailable.');
      assert.equal(error.message.includes('sk-secret'), false);
      return true;
    },
  );
});
