import { describe, expect, it } from "vitest";

import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the max within the window", () => {
    const key = `test-${crypto.randomUUID()}`;
    const opts = { max: 3, windowMs: 60_000 };

    expect(checkRateLimit(key, opts)).toEqual({ allowed: true, remaining: 2 });
    expect(checkRateLimit(key, opts)).toEqual({ allowed: true, remaining: 1 });
    expect(checkRateLimit(key, opts)).toEqual({ allowed: true, remaining: 0 });
  });

  it("blocks once the max is exceeded within the window", () => {
    const key = `test-${crypto.randomUUID()}`;
    const opts = { max: 2, windowMs: 60_000 };

    checkRateLimit(key, opts);
    checkRateLimit(key, opts);
    expect(checkRateLimit(key, opts)).toEqual({ allowed: false, remaining: 0 });
    expect(checkRateLimit(key, opts)).toEqual({ allowed: false, remaining: 0 });
  });

  it("keeps separate buckets per key", () => {
    const opts = { max: 1, windowMs: 60_000 };
    const keyA = `test-a-${crypto.randomUUID()}`;
    const keyB = `test-b-${crypto.randomUUID()}`;

    expect(checkRateLimit(keyA, opts).allowed).toBe(true);
    expect(checkRateLimit(keyA, opts).allowed).toBe(false);
    expect(checkRateLimit(keyB, opts).allowed).toBe(true);
  });

  it("resets after the window elapses", () => {
    const key = `test-${crypto.randomUUID()}`;
    const opts = { max: 1, windowMs: 10 };

    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit(key, opts).allowed).toBe(true);
        resolve();
      }, 20);
    });
  });
});
