import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStudyPlan, getTrack, sampleQuestions, tracks } from '../dist/learning.js';
import { getTrackSources, sourceRegistry } from '../dist/source-registry.js';

const validCategories = new Set(['international', 'regional', 'university']);
const validTones = new Set(['blue', 'red', 'gold', 'mint']);

test('every track has a stable id and complete display data', () => {
  const seen = new Set();
  for (const track of tracks) {
    assert.ok(track.id && !seen.has(track.id), `Duplicate or missing track id: ${track.id}`);
    seen.add(track.id);
    assert.equal(typeof track.name, 'string');
    assert.ok(track.name.length > 0, `Missing name for ${track.id}`);
    assert.ok(validCategories.has(track.category), `Invalid category for ${track.id}`);
    assert.ok(validTones.has(track.tone), `Invalid tone for ${track.id}`);
    assert.ok(Array.isArray(track.topics) && track.topics.length > 0, `Missing topics for ${track.id}`);
    assert.equal(getTrack(track.id), track);
  }
});

test('every sample question references a real track with a valid answer key', () => {
  const seen = new Set();
  for (const question of sampleQuestions) {
    assert.ok(question.id && !seen.has(question.id), `Duplicate or missing question id: ${question.id}`);
    seen.add(question.id);
    assert.ok(getTrack(question.trackId), `Question ${question.id} points to an unknown track`);
    assert.ok(Array.isArray(question.choices) && question.choices.length === 4, `Question ${question.id} needs four choices`);
    assert.equal(new Set(question.choices).size, 4, `Question ${question.id} has duplicate choices`);
    assert.ok(Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex <= 3,
      `Question ${question.id} has an invalid correctIndex`);
    assert.ok(question.prompt && question.explanation, `Question ${question.id} is missing prompt or explanation`);
  }
});

test('official sources are link-only with rights evidence and valid HTTPS urls', () => {
  const seen = new Set();
  for (const source of sourceRegistry) {
    assert.ok(source.id && !seen.has(source.id), `Duplicate or missing source id: ${source.id}`);
    seen.add(source.id);
    assert.ok(getTrack(source.trackId), `Source ${source.id} points to an unknown track`);
    assert.equal(source.permittedUse, 'link-only', `Source ${source.id} must be link-only`);
    assert.ok(source.rightsEvidence, `Source ${source.id} is missing rights evidence`);
    assert.match(source.dateChecked, /^\d{4}-\d{2}-\d{2}$/, `Source ${source.id} has an invalid dateChecked`);
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:', `Source ${source.id} must use HTTPS`);
    assert.equal(getTrackSources(source.trackId).includes(source), true);
  }
});

test('study plans always produce three grounded tasks', () => {
  const fromGoal = createStudyPlan('Discrete Mathematics');
  const fromText = createStudyPlan('Discrete Mathematics', 'A short lecture excerpt.');
  assert.equal(fromGoal.length, 3);
  assert.equal(fromText.length, 3);
  assert.match(fromText[0], /Review your material/);
  assert.ok(fromGoal[0].includes('Discrete Mathematics'));
});
