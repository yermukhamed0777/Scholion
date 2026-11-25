import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const text = 'A conjunction is true when both parts are true. A disjunction is true when either part is true. A conditional is false only when its antecedent is true and its consequent is false.';
const quote = 'A conjunction is true when both parts are true.';
const question = (prompt, correctIndex, quoteText) => ({
  prompt,
  choices: ['First option', 'Second option', 'Third option', 'Fourth option'],
  correctIndex,
  rationale: `Checked against the excerpt for ${prompt}.`,
  quote: quoteText,
});
const generated = {
  explanation: 'The excerpt gives truth conditions for three logical forms.',
  quote,
  questions: [
    question('Which form needs both parts?', 0, quote),
    question('Which form needs either part?', 1, 'A disjunction is true when either part is true.'),
    question('When is a conditional false?', 2, 'conditional is false only when its antecedent'),
  ],
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
  assert.ok(match, `The app must report its URL: ${line}`);
  return match[0];
}

test('the endpoint validates three grounded questions with exact spans', { timeout: 30_000 }, async t => {
  let mode = 'valid';
  const provider = createServer((request, response) => {
    request.resume();
    let payload = generated;
    if (mode === 'duplicate-prompts') {
      payload = { ...generated, questions: [generated.questions[0], generated.questions[0], generated.questions[2]] };
    }
    if (mode === 'too-many') {
      payload = { ...generated, questions: [...generated.questions, generated.questions[0]] };
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ model: 'gpt-oss:20b', message: { content: JSON.stringify(payload) } }));
  });
  t.after(() => {
    provider.close();
    provider.closeAllConnections();
  });
  provider.listen(0, '127.0.0.1');
  await once(provider, 'listening');
  const origin = await startApp(t, `http://127.0.0.1:${provider.address().port}/api/chat`);
  const post = () => fetch(`${origin}/api/generate-study`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: 'synthetic-three', title: 'Logic', pages: '1', text }),
    signal: AbortSignal.timeout(5_000),
  });

  await t.test('valid three-question output is normalised and spans are exact', async () => {
    const response = await post();
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.sourceId, 'synthetic-three');
    assert.equal(result.model, 'gpt-oss:20b');
    assert.equal(result.questions.length, 3);
    assert.deepEqual(result.question, result.questions[0]);
    assert.deepEqual(result.span, { start: text.indexOf(quote), end: text.indexOf(quote) + quote.length });
    result.questions.forEach((item, index) => {
      const expected = generated.questions[index].quote;
      assert.ok(expected && text.includes(expected));
      assert.deepEqual(item.span, { start: text.indexOf(expected), end: text.indexOf(expected) + expected.length });
    });
  });

  await t.test('duplicate prompts and more than three questions are rejected', async () => {
    for (mode of ['duplicate-prompts', 'too-many']) {
      const response = await post();
      assert.equal(response.status, 502);
      assert.equal(typeof (await response.json()).error?.message, 'string');
    }
  });

  await t.test('an absent quote drops the span without failing generation', async () => {
    mode = 'valid';
    const missing = {
      explanation: generated.explanation,
      questions: [question('Which form needs both parts?', 0, 'not in the excerpt')],
    };
    const absentProvider = createServer((request, response) => {
      request.resume();
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ model: 'gpt-oss:20b', message: { content: JSON.stringify(missing) } }));
    });
    t.after(() => {
      absentProvider.close();
      absentProvider.closeAllConnections();
    });
    absentProvider.listen(0, '127.0.0.1');
    await once(absentProvider, 'listening');
    const otherOrigin = await startApp(t, `http://127.0.0.1:${absentProvider.address().port}/api/chat`);
    const response = await fetch(`${otherOrigin}/api/generate-study`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: 'synthetic-three', text }),
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.span, undefined);
    assert.equal(result.question.span, undefined);
  });
});
