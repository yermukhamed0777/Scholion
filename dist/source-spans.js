// Pure, dependency-local helpers for passage-anchored citations. Offsets are
// always character offsets into the saved plain-text source, never inferred
// from a filename or a model-invented page label.

export function buildSpans(text) {
  if (typeof text !== 'string' || !text.length) return [];
  const spans = [];
  const paragraph = /[^\n]+(?:\n[^\n]+)*/g;
  let match;
  while ((match = paragraph.exec(text))) {
    let start = match.index;
    let end = start + match[0].length;
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end > start) spans.push({ start, end, text: text.slice(start, end) });
  }
  if (spans.length > 1) return spans;

  const sentences = [];
  const sentence = /[^.!?]+[.!?]*/g;
  while ((match = sentence.exec(text))) {
    let start = match.index;
    let end = start + match[0].length;
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end > start) sentences.push({ start, end, text: text.slice(start, end) });
  }
  return sentences.length ? sentences : spans;
}

export function normalizeSpan(span, textLength) {
  if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end)) return null;
  if (span.start < 0 || span.end <= span.start || span.end > textLength) return null;
  return { start: span.start, end: span.end };
}

export function spanForQuote(text, quote) {
  // Long quotes usually mean the model echoed the whole excerpt; that is not
  // a useful passage anchor, so only short exact quotes become spans.
  if (typeof quote !== 'string' || !quote.trim() || quote.length > 160) return null;
  const start = text.indexOf(quote);
  if (start < 0) return null;
  return { start, end: start + quote.length };
}

export function highlightSegments(text, span) {
  const valid = normalizeSpan(span, typeof text === 'string' ? text.length : 0);
  if (!valid) return [{ text, mark: false }];
  return [
    { text: text.slice(0, valid.start), mark: false },
    { text: text.slice(valid.start, valid.end), mark: true },
    { text: text.slice(valid.end), mark: false },
  ].filter(part => part.text.length > 0);
}
