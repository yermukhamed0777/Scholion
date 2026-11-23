import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = {
  sourceId: 'synthetic-logic',
  title: 'Synthetic logic notes',
  pages: '1',
  text: 'A conjunction is true exactly when both statements are true.',
};

const generatedStudy = {
  explanation: 'Both statements must be true for their conjunction to be true.',
  question: {
    prompt: 'When is a conjunction true?',
    choices: ['When both statements are true', 'When only the first is true', 'When only the second is true', 'When neither is true'],
    correctIndex: 0,
    rationale: 'The excerpt defines a conjunction as true exactly when both statements are true.',
  },
};

async function startApp(t, providerUrl) {
  const script = fileURLToPath(new URL('../scripts/serve.mjs', import.meta.url));
  const child = spawn(process.execPath, [script, '0'], {
    env: { ...process.env, OLLAMA_URL: providerUrl },
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
  assert.ok(match, `The app must report its localhost URL: ${line}`);
  return match[0];
}

test('the study API reports provider failures and stays running', { timeout: 30_000 }, async t => {
  let mode = 'http-error';
  let providerRequests = 0;
  const provider = createServer((request, response) => {
    providerRequests++;
    request.resume();
    if (mode === 'disconnected') {
      response.destroy();
      return;
    }
    if (mode === 'http-error') {
      response.writeHead(503, { 'Content-Type': 'application/json' }).end('{"error":"synthetic outage"}');
      return;
    }
    const content = mode === 'invalid-output' ? 'not JSON' : JSON.stringify(generatedStudy);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    const message = { content };
    const model = 'gpt-oss:20b';
    response.end(JSON.stringify(request.url === '/api/chat'
      ? { model, message }
      : { model, choices: [{ message }] }));
  });
  t.after(() => {
    provider.close();
    provider.closeAllConnections();
  });
  provider.listen(0, '127.0.0.1');
  await once(provider, 'listening');

  const origin = await startApp(t, `http://127.0.0.1:${provider.address().port}/v1/chat/completions`);
  const post = (body = JSON.stringify(source)) => fetch(`${origin}/api/generate-study`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(5_000),
  });

  for (const failure of ['http-error', 'disconnected', 'invalid-output']) {
    await t.test(failure, async () => {
      mode = failure;
      const failed = await post();
      assert.equal(failed.status, 502);
      assert.match(failed.headers.get('content-type') ?? '', /^application\/json\b/);
      const { error } = await failed.json();
      assert.equal(typeof error?.message, 'string');
      assert.ok(error.message.trim());

      const home = await fetch(`${origin}/`, { signal: AbortSignal.timeout(5_000) });
      assert.equal(home.status, 200);
      await home.text();
    });
  }

  await t.test('malformed client JSON is rejected before calling the provider', async () => {
    const before = providerRequests;
    const invalid = await post('{');
    assert.equal(invalid.status, 400);
    assert.equal(typeof (await invalid.json()).error?.message, 'string');
    assert.equal(providerRequests, before);
  });

  await t.test('a valid provider response still generates study material', async () => {
    mode = 'valid';
    const response = await post();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ...generatedStudy,
      sourceId: source.sourceId,
      model: 'gpt-oss:20b',
    });
  });

  await t.test('the native Ollama response carries the selected source and model', async () => {
    const nativeOrigin = await startApp(t, `http://127.0.0.1:${provider.address().port}/api/chat`);
    const response = await fetch(`${nativeOrigin}/api/generate-study`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ...generatedStudy,
      sourceId: source.sourceId,
      model: 'gpt-oss:20b',
    });
  });
});
