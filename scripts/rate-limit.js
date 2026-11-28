// Dependency-free, fixed-window rate limiting for same-origin APIs. The
// limiter is process-local: on a serverless platform it protects one warm
// instance, and a shared store would be needed for a fleet-wide quota. Limits
// are deliberately generous enough for normal study use but bound abuse.

export function createRateLimiter({ limit, windowMs, now = Date.now } = {}) {
  const buckets = new Map();
  let lastSweep = now();
  return function take(key = 'anonymous') {
    const current = now();
    // Drop only buckets that have already expired; a sweep is cheap and keeps
    // memory bounded even when many transient client addresses connect.
    if (current - lastSweep >= windowMs) {
      for (const [storedKey, bucket] of buckets) {
        if (current - bucket.start >= windowMs) buckets.delete(storedKey);
      }
      lastSweep = current;
    }
    let bucket = buckets.get(key);
    if (!bucket || current - bucket.start >= windowMs) {
      bucket = { start: current, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    return {
      allowed: bucket.count <= limit,
      retryAfter: Math.max(1, Math.ceil((bucket.start + windowMs - current) / 1000)),
    };
  };
}

export function clientKey(request = {}) {
  const forwarded = request.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return request.socket?.remoteAddress || 'anonymous';
}
