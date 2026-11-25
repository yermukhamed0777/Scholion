import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import handler from '../api/generate-study.js';

const source = {
  sourceId: 'synthetic-vercel',
  title: 'Synthetic Vercel notes',
  pages: '1',
  text: 'A conjunction is true exactly when both statements are true.',
};

// Uses the real Node request/response objects the hosted runtime supplies;
// no provider is called because every case fails before the boundary.
test('the hosted endpoint applies the same request contract', async t => {
  const server = createServer((request, response) => {
    Promise.resolve(handler(request, response)).catch(() => {
      if (!response.destroyed) response.writeHead(500).end();
    });
  });
  t.after(() => {
    server.close();
    server.closeAllConnections();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const endpoint = `${origin}/api/generate-study`;

  await t.test('GET is rejected with Allow: POST', async () => {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(5_000) });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'POST');
  });

  await t.test('wrong media type gets a JSON 415', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 415);
    assert.match(response.headers.get('content-type') ?? '', /^application\/json\b/);
    assert.equal(typeof (await response.json()).error?.message, 'string');
  });

  await t.test('malformed JSON gets a JSON 400', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error?.message, 'string');
  });

  await t.test('a non-loopback provider URL gets a JSON 502', async () => {
    const previous = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = 'https://example.com/api/chat';
    t.after(() => {
      if (previous === undefined) delete process.env.OLLAMA_URL;
      else process.env.OLLAMA_URL = previous;
    });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 502);
    assert.equal(typeof (await response.json()).error?.message, 'string');
  });
});
