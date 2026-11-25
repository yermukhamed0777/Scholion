import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSpans, highlightSegments, normalizeSpan, spanForQuote } from '../dist/source-spans.js';

test('paragraph spans keep exact character offsets', () => {
  const text = 'First sentence here.\n\nSecond paragraph with two sentences. Third one.';
  const spans = buildSpans(text);
  assert.equal(spans.length, 2);
  for (const span of spans) {
    assert.equal(text.slice(span.start, span.end), span.text);
    assert.equal(span.text, span.text.trim());
  }
  assert.ok(spans[1].text.startsWith('Second paragraph'));
});

test('a single paragraph falls back to sentence spans', () => {
  const text = 'One fact. Second fact! Third fact?';
  const spans = buildSpans(text);
  assert.equal(spans.length, 3);
  assert.deepEqual(spans.map(({ text: part }) => part), ['One fact.', 'Second fact!', 'Third fact?']);
  for (const span of spans) assert.equal(text.slice(span.start, span.end), span.text);
});

test('out-of-range, reversed, and non-integer spans are rejected', () => {
  const text = 'abcdef';
  assert.equal(normalizeSpan({ start: -1, end: 3 }, text.length), null);
  assert.equal(normalizeSpan({ start: 4, end: 4 }, text.length), null);
  assert.equal(normalizeSpan({ start: 2, end: 9 }, text.length), null);
  assert.equal(normalizeSpan({ start: 1.5, end: 3 }, text.length), null);
  assert.deepEqual(normalizeSpan({ start: 2, end: 4 }, text.length), { start: 2, end: 4 });
});

test('a quote only yields a span when it appears verbatim', () => {
  const text = 'A conjunction needs both parts.';
  assert.deepEqual(spanForQuote(text, 'both parts'), { start: 20, end: 30 });
  assert.equal(spanForQuote(text, 'both parts are false'), null);
  assert.equal(spanForQuote(text, '   '), null);
});

test('highlight segments reassemble the source exactly', () => {
  const text = 'alpha beta gamma';
  const parts = highlightSegments(text, { start: 6, end: 10 });
  assert.equal(parts.map(({ text: part }) => part).join(''), text);
  assert.equal(parts.find(({ mark }) => mark).text, 'beta');
  assert.equal(parts.filter(({ mark }) => mark).length, 1);
  assert.deepEqual(highlightSegments(text, { start: 99, end: 100 }), [{ text, mark: false }]);
});
