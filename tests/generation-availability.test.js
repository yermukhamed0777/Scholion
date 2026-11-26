import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { handleAccountRequest } from '../scripts/account-endpoints.mjs';
import { resolveGenerationCapability } from '../scripts/generation-capability.js';
import { providerTimeout } from '../scripts/study-endpoint.mjs';

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

test('generation capability is truthful and never carries a URL or credential', async () => {
  const hosted = await resolveGenerationCapability({ VERCEL: '1' });
  assert.equal(hosted.status, 'unavailable');
  assert.equal(hosted.kind, 'none');
  assert.match(hosted.reason, /public demo/i);

  const local = await resolveGenerationCapability({});
  assert.equal(local.status, 'available');
  assert.equal(local.kind, 'local-ollama');
  assert.equal(local.model, 'gpt-oss:20b');

  const rejected = await resolveGenerationCapability({ OLLAMA_URL: 'https://example.com/api/chat' });
  assert.equal(rejected.status, 'unavailable');
  assert.ok(!JSON.stringify(rejected).includes('example.com'));

  const offline = await resolveGenerationCapability({}, async () => false);
  assert.equal(offline.status, 'unavailable');
  assert.match(offline.reason, /not reachable/i);

  const hostedRequest = await resolveGenerationCapability({ SCHOLION_HOSTED_GENERATION: '1' });
  assert.equal(hostedRequest.status, 'unavailable');
  assert.match(hostedRequest.reason, /not configured/i);

  for (const result of [local, hosted, rejected, offline, hostedRequest]) {
    assert.equal(Object.hasOwn(result, 'url'), false);
    assert.equal(Object.hasOwn(result, 'key'), false);
    assert.equal(JSON.stringify(result).includes('sk-'), false);
  }
});

test('/api/config reports accounts and generation availability independently', async () => {
  const hosted = mockResponse();
  assert.equal(await handleAccountRequest('/api/config', {}, hosted, {
    VERCEL: '1',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'public-key',
    SUPABASE_SERVICE_ROLE_KEY: 'server-only-key',
  }), true);
  const hostedBody = JSON.parse(hosted.body);
  assert.equal(hosted.status, 200);
  assert.equal(hostedBody.accounts, true);
  assert.equal(hostedBody.generation, 'none');
  assert.equal(hostedBody.generationStatus.status, 'unavailable');
  assert.ok(!hosted.body.includes('example.supabase.co'));
  assert.ok(!hosted.body.includes('server-only-key'));
  assert.equal(hosted.headers['Cache-Control'], 'no-store');

  const local = mockResponse();
  await handleAccountRequest('/api/config', {}, local, {
    OLLAMA_URL: 'http://127.0.0.1:11434/api/chat',
  }, { probeGeneration: async () => true });
  const localBody = JSON.parse(local.body);
  assert.equal(localBody.accounts, false);
  assert.equal(localBody.generation, 'local-ollama');
  assert.equal(localBody.generationStatus.status, 'available');
});

test('generation timeouts are ordered provider < platform < browser', async () => {
  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const platformMs = vercel.functions['api/generate-study.js'].maxDuration * 1000;
  const app = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
  const browserMatch = app.match(/AbortSignal\.timeout\(([\d_]+)\)/);
  assert.ok(browserMatch, 'the browser timeout must be declared');
  const browserMs = Number(browserMatch[1].replace(/_/g, ''));
  assert.equal(providerTimeout, 45_000);
  assert.ok(providerTimeout < platformMs, `${providerTimeout} must be below ${platformMs}`);
  assert.ok(platformMs < browserMs, `${platformMs} must be below ${browserMs}`);
});

test('client bundles contain no provider URL or server credential names', async () => {
  for (const file of ['dist/app.js', 'dist/study.js', 'dist/index.html']) {
    const source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    assert.equal(source.includes('OLLAMA_URL'), false, file);
    assert.equal(source.includes('SUPABASE_SERVICE_ROLE_KEY'), false, file);
    assert.equal(source.includes('sk-test-secret'), false, file);
  }
});
