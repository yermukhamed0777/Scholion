#!/usr/bin/env node
// Reproducible, non-sensitive demonstration of local gpt-oss:20b generation
// through the app's own endpoint. No private material, no hosted provider, no
// credential and no network call beyond loopback. Structural checks are
// automatic; the educational correctness of the answer remains a human check.

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const text = [
  'A triangle with three sides of different lengths is called scalene.',
  'An equilateral triangle has three sides of equal length.',
  'An isosceles triangle has at least two sides of equal length.',
].join(' ');
const sourceId = 'demo-synthetic-triangles';
const script = fileURLToPath(new URL('./serve.mjs', import.meta.url));
const child = spawn(process.execPath, [script, '0'], {
  // A cold 20b model can exceed the hosted-safe 45 s default. This is a local
  // demonstration only; the hosted cap is unchanged.
  env: { ...process.env, GENERATION_TIMEOUT_MS: process.env.GENERATION_TIMEOUT_MS || '180000' },
  stdio: ['ignore', 'pipe', 'inherit'],
  windowsHide: true,
});
const lines = createInterface({ input: child.stdout });
const stop = async () => {
  lines.close();
  if (child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit', { signal: AbortSignal.timeout(5000) });
    child.kill();
    await exited;
  }
};
try {
  const [line] = await once(lines, 'line', { signal: AbortSignal.timeout(10000) });
  const match = line.match(/http:\/\/127\.0\.0\.1:\d+/);
  if (!match) throw new Error(`Could not read the local app URL: ${line}`);
  const origin = match[0];
  console.log(`Local app: ${origin}`);
  console.log(`Model: ${process.env.MODEL || 'gpt-oss:20b'} (loopback Ollama only)`);
  console.log(`Source: ${sourceId}`);
  console.log('Excerpt (synthetic):', text);

  const response = await fetch(`${origin}/api/generate-study`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, title: 'Synthetic triangle notes', pages: 'demo', text }),
    signal: AbortSignal.timeout(190000),
  });
  const result = await response.json();
  if (!response.ok) {
    console.error(`Generation unavailable: HTTP ${response.status}`, result.error?.message || result);
    process.exitCode = 1;
  } else {
    const questions = Array.isArray(result.questions) && result.questions.length ? result.questions : [result.question];
    const valid = questions.every((question) =>
      typeof question.prompt === 'string' && question.prompt.trim() &&
      typeof question.rationale === 'string' && question.rationale.trim() &&
      Array.isArray(question.choices) && question.choices.length === 4 &&
      question.choices.every((choice) => typeof choice === 'string' && choice.trim()) &&
      new Set(question.choices.map((choice) => choice.toLowerCase().trim())).size === 4 &&
      Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < 4);
    const spans = [result.span, ...questions.map((question) => question.span)].filter(Boolean);
    const spansGrounded = spans.every((span) =>
      Number.isInteger(span.start) && Number.isInteger(span.end) &&
      span.start >= 0 && span.end > span.start && span.end <= text.length);
    console.log('\nExplanation:', result.explanation);
    questions.forEach((question, index) => {
      console.log(`\nQuestion ${index + 1}: ${question.prompt}`);
      question.choices.forEach((choice, choiceIndex) =>
        console.log(`  ${choiceIndex === question.correctIndex ? '*' : ' '} ${choice}`));
      console.log(`Rationale: ${question.rationale}`);
      if (question.span) console.log(`Cited passage: "${text.slice(question.span.start, question.span.end)}"`);
    });
    console.log(`\nStructural checks: ${valid ? 'PASS' : 'FAIL'} (question shape)`);
    console.log(`Citation checks: ${spansGrounded ? 'PASS' : 'FAIL'} (${spans.length} verbatim spans)`);
    console.log('Human check still required: confirm the keyed answer follows the excerpt.');
    if (!valid || !spansGrounded || result.sourceId !== sourceId) process.exitCode = 1;
  }
} catch (error) {
  console.error('Local demo failed:', error.message);
  process.exitCode = 1;
} finally {
  await stop();
}
