// Server-only capability resolution. The browser receives a status and a
// public-safe reason, never a provider URL, credential, or hosted endpoint.

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
export const defaultOllamaUrl = 'http://127.0.0.1:11434/api/chat';

export function isLoopbackProviderUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && loopbackHosts.has(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

// Optional, short-lived probe used by the real server only. Tests inject a
// stub, so no test depends on a live Ollama process.
export async function probeOllama(value, fetchImpl = fetch, timeoutMs = 1200) {
  if (!isLoopbackProviderUrl(value)) return false;
  try {
    const url = new URL('/api/tags', new URL(value));
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

export async function resolveGenerationCapability(env = {}, probe = null) {
  const configuredUrl = typeof env.OLLAMA_URL === 'string' && env.OLLAMA_URL.trim()
    ? env.OLLAMA_URL.trim()
    : defaultOllamaUrl;
  if (!isLoopbackProviderUrl(configuredUrl)) {
    return {
      status: 'unavailable',
      kind: 'none',
      reason: 'Only a loopback Ollama endpoint is supported. AI generation is unavailable in this environment.',
    };
  }
  if (env.VERCEL || env.VERCEL_ENV || env.SCHOLION_HOSTED_RUNTIME === '1') {
    return {
      status: 'unavailable',
      kind: 'none',
      reason: 'AI generation is not available in the public demo. Plans, practice and progress work normally; use a local workspace with Ollama for GrinderAI.',
    };
  }
  if (env.SCHOLION_HOSTED_GENERATION === '1') {
    return {
      status: 'unavailable',
      kind: 'none',
      reason: 'Hosted AI requires an owner-approved provider and is not configured in this build.',
    };
  }
  if (probe && !(await probe(configuredUrl))) {
    return {
      status: 'unavailable',
      kind: 'none',
      reason: 'Local Ollama is not reachable. Plans, practice and progress still work without AI generation.',
    };
  }
  return {
    status: 'available',
    kind: 'local-ollama',
    model: typeof env.MODEL === 'string' && env.MODEL.trim() ? env.MODEL.trim() : 'gpt-oss:20b',
    reason: 'Local Ollama is configured for GrinderAI.',
  };
}
