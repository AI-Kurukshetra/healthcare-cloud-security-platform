import { checkRateLimit, clearRateLimitBuckets } from "@/lib/api/rate-limit";

describe("api rate limiting", () => {
  beforeEach(() => {
    clearRateLimitBuckets();
  });

  it("allows requests within limit and blocks overflow", () => {
    const key = "integration-sync:test";
    const first = checkRateLimit(key, 2, 60_000, 1_000);
    const second = checkRateLimit(key, 2, 60_000, 1_500);
    const third = checkRateLimit(key, 2, 60_000, 2_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it("resets counters after window", () => {
    const key = "integration-sync:reset";
    const first = checkRateLimit(key, 1, 1_000, 1_000);
    const second = checkRateLimit(key, 1, 1_000, 1_500);
    const third = checkRateLimit(key, 1, 1_000, 2_100);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(third.allowed).toBe(true);
  });
});

