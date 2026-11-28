import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const marker = 'PRIVATE-SYNTHETIC-EXCERPT-DO-NOT-LOG';

async function startApp(t, env, log) {
  const script = fileURLToPath(new URL('../scripts/serve.mjs', import.meta.url));
  const child = spawn(process.execPath, [script, '0'], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.on('data', chunk => log.push(chunk.toString('utf8')));
  child.stderr.on('data', chunk => log.push(chunk.toString('utf8')));
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

test('server sources never log request bodies or learner text', async () => {
  for (const file of ['scripts/serve.mjs', 'scripts/study-endpoint.mjs', 'scripts/account-endpoints.mjs', 'scripts/supabase.mjs']) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const line of source.split(/\r?\n/)) {
      if (!/console\.(log|error|warn|info|debug)\s*\(/.test(line)) continue;
      assert.match(line, /Scholion is available|Port \$\{port\} is already in use/,
        `${file} contains an unexpected console call: ${line.trim()}`);
    }
  }
});

test('a failed generation request leaves no learner text in server logs or error body', { timeout: 30_000 }, async t => {
  const provider = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ model: 'mock', message: { content: '{"explanation":""}' } }));
  });
  t.after(() => { provider.close(); provider.closeAllConnections(); });
  provider.listen(0, '127.0.0.1');
  await once(provider, 'listening');

  const logs = [];
  const origin = await startApp(t, {
    OLLAMA_URL: `http://127.0.0.1:${provider.address().port}/api/chat`,
  }, logs);
  const response = await fetch(`${origin}/api/generate-study`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: 'synthetic-privacy', title: marker, text: marker }),
    signal: AbortSignal.timeout(8_000),
  });
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes(marker), false, 'The client error body must not echo learner text');
  assert.equal(logs.join('').includes(marker), false, 'Server logs must not contain learner text');
});
