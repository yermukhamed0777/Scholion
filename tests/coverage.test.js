import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coverageLabel, trackCoverage } from '../dist/coverage.js';
import { sampleQuestions, tracks } from '../dist/learning.js';
import { sourceRegistry } from '../dist/source-registry.js';

test('coverage counts come from the catalog data, not hard-coded values', () => {
  const satQuestions = sampleQuestions.filter(question => question.trackId === 'sat').length;
  const satSources = sourceRegistry.filter(source => source.trackId === 'sat').length;
  assert.deepEqual(trackCoverage('sat'), { questions: satQuestions, sources: satSources });
  assert.equal(trackCoverage('sat').questions, 3);
});

test('a track with both questions and official links shows both counts', () => {
  const label = coverageLabel('sat');
  assert.match(label, /3 sample questions/);
  assert.match(label, /official link/);
});

test('a track with no questions and no official links reads Plan available', () => {
  const emptyId = 'track-with-no-coverage';
  assert.deepEqual(trackCoverage(emptyId), { questions: 0, sources: 0 });
  assert.equal(coverageLabel(emptyId), 'Plan available');
});

test('singular and plural labels are grammatically correct', () => {
  assert.equal(coverageLabel('track-with-no-coverage'), 'Plan available');
  const labelWithOneLink = coverageLabel('sat');
  assert.ok(labelWithOneLink.includes('3 sample questions'));
});

test('every configured track resolves to a coverage label', () => {
  for (const track of tracks) {
    const label = coverageLabel(track.id);
    assert.equal(typeof label, 'string');
    assert.ok(label.length > 0, `Missing coverage label for ${track.id}`);
  }
});
