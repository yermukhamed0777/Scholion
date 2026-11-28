// Labelled synthetic microbenchmark. It measures deterministic, local helpers
// only: no model is called and no learner text is read from disk or committed.

import { performance } from 'node:perf_hooks';
import { spanForQuote } from '../dist/source-spans.js';
import { trackCoverage } from '../dist/coverage.js';
import { tracks } from '../dist/learning.js';

const passage = 'A conjunction P ∧ Q is true only when both P and Q are true. If either statement is false, the conjunction is false.';
const quotes = ['both P and Q are true', 'the conjunction is false', 'not present in the text'];
const iterations = 2000;

function measure(label, operation) {
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) operation();
  const elapsed = performance.now() - started;
  console.log(`${label}: ${iterations} iterations in ${elapsed.toFixed(1)} ms (${(elapsed / iterations).toFixed(4)} ms/op)`);
}

measure('spanForQuote (synthetic passage)', () => {
  for (const quote of quotes) spanForQuote(passage, quote);
});
measure('trackCoverage (catalog metadata)', () => {
  for (const track of tracks) trackCoverage(track.id);
});

console.log('Bench label: synthetic local helpers; model=none; live=none; learnerText=none');
