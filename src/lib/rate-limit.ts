/**
 * Minimal in-memory rate limiter. Sufficient for a single-admin login form
 * on a single Node process (this app doesn't run multiple instances behind
 * a load balancer) — not a general-purpose distributed limiter.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count };
}
