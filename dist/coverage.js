import { sampleQuestions } from './learning.js';
import { sourceRegistry } from './source-registry.js';

// A track's coverage is what a learner can actually use today: original sample
// questions they can practise and official resources they can follow. Keeping
// this in one pure module lets both the catalog and the tests show the same
// numbers instead of a hard-coded "Sample practice" / "Plan available" label.
export function trackCoverage(trackId) {
  const questions = sampleQuestions.filter(question => question.trackId === trackId).length;
  const sources = sourceRegistry.filter(source => source.trackId === trackId).length;
  return { questions, sources };
}

function countLabel(count, singular) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

export function coverageLabel(trackId) {
  const { questions, sources } = trackCoverage(trackId);
  const parts = [];
  if (questions) parts.push(countLabel(questions, 'sample question'));
  if (sources) parts.push(countLabel(sources, 'official link'));
  return parts.length ? parts.join(' · ') : 'Plan available';
}
