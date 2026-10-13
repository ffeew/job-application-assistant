export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const MAX_TRACKED_KEYS = 10_000;

/**
 * A sliding-window limit held in this process's memory. That suits the single
 * app container this project deploys. Several instances would each allow the
 * full limit and would need shared storage instead.
 */
export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): RateLimitResult {
    const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
    const oldest = recent[0];
    if (recent.length >= limit && oldest !== undefined) {
      hits.set(key, recent);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
      };
    }

    // Keys are only revisited when their owner returns, so idle ones are
    // dropped once the map grows large.
    if (hits.size >= MAX_TRACKED_KEYS) {
      for (const [other, times] of hits) {
        if (now - (times.at(-1) ?? 0) >= windowMs) hits.delete(other);
      }
    }
    recent.push(now);
    hits.set(key, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}
