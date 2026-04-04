const { tokenBucket } = require("../src/algorithms/tokenBucket");
const { redis } = require("../src/config/redis");

afterAll(() => redis.disconnect());

describe("token bucket algorithm", () => {
  it("allows burst requests up to capacity", async () => {
    const id = `test:token:burst:${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const result = await tokenBucket(id, { capacity: 5, refillRate: 1 });
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks when bucket is empty", async () => {
    const id = `test:token:empty:${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await tokenBucket(id, { capacity: 5, refillRate: 1 });
    }
    const result = await tokenBucket(id, { capacity: 5, refillRate: 1 });
    expect(result.allowed).toBe(false);
  });

  it("refills tokens over time", async () => {
    const id = `test:token:refill:${Date.now()}`;
    // Drain the bucket
    for (let i = 0; i < 3; i++) {
      await tokenBucket(id, { capacity: 3, refillRate: 10 });
    }
    const blocked = await tokenBucket(id, { capacity: 3, refillRate: 10 });
    expect(blocked.allowed).toBe(false);

    // Wait for refill (refillRate=10/sec, need 1 token = 100ms)
    await new Promise((r) => setTimeout(r, 200));

    const refilled = await tokenBucket(id, { capacity: 3, refillRate: 10 });
    expect(refilled.allowed).toBe(true);
  });

  it("two users have isolated buckets", async () => {
    const id1 = `test:token:iso1:${Date.now()}`;
    const id2 = `test:token:iso2:${Date.now()}`;
    const opts = { capacity: 2, refillRate: 1 };

    await tokenBucket(id1, opts);
    await tokenBucket(id1, opts);
    const blocked = await tokenBucket(id1, opts);
    expect(blocked.allowed).toBe(false);

    const allowed = await tokenBucket(id2, opts);
    expect(allowed.allowed).toBe(true);
  });

  it("returns algorithm name", async () => {
    const id = `test:token:algo:${Date.now()}`;
    const result = await tokenBucket(id, { capacity: 5, refillRate: 1 });
    expect(result.algorithm).toBe("token-bucket");
  });
});