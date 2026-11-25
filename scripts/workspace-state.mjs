// Pure workspace-state rules shared by the account endpoints and their tests.
// Learner data never leaves these helpers as arbitrary unvalidated JSON.

export function isValidWorkspace(value) {
  if (!value || typeof value !== 'object') return false;
  return Array.isArray(value.savedTrackIds) && Array.isArray(value.entries) && Array.isArray(value.attempts) &&
    value.entries.every(entry => entry && typeof entry.id === 'string' && Array.isArray(entry.sources) &&
      Array.isArray(entry.tasks) && typeof entry.createdAt === 'string') &&
    value.attempts.every(attempt => attempt && typeof attempt.questionId === 'string');
}

export function emptyWorkspace() {
  return { savedTrackIds: [], entries: [], attempts: [] };
}

export function deleteSourceFromWorkspace(state, sourceId) {
  if (!isValidWorkspace(state) || typeof sourceId !== 'string') return state;
  let removedGenerationIds = [];
  const entries = state.entries.map((entry) => {
    if (!entry.sources.some((source) => source.id === sourceId)) return entry;
    const sources = entry.sources.filter((source) => source.id !== sourceId);
    const { generatedStudy, ...rest } = entry;
    const removed = generatedStudy?.sourceId === sourceId;
    if (removed && generatedStudy?.id) removedGenerationIds.push(generatedStudy.id);
    return {
      ...rest,
      sources,
      ...(generatedStudy && !removed ? { generatedStudy } : {}),
    };
  });
  const removed = new Set(removedGenerationIds);
  return {
    ...state,
    entries,
    attempts: state.attempts.filter((attempt) =>
      !(removed.has(attempt.generationId) || attempt.sourceId === sourceId)),
  };
}
