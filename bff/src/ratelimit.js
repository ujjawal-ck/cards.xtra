/**
 * Fixed-window rate limit kept in memory. It is per running copy of the
 * function, so it is a floor, not a guarantee. Move it to a shared store
 * (Vercel KV / Upstash) before a public launch.
 */
export function createRateLimiter({ limit, windowMs, now = () => Date.now() }) {
  const hits = new Map();
  return function allow(key) {
    const t = now();
    const entry = hits.get(key);
    if (!entry || t >= entry.resetAt) {
      hits.set(key, { count: 1, resetAt: t + windowMs });
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (t >= v.resetAt) hits.delete(k);
      }
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
