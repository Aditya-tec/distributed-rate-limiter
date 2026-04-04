const { slidingWindow } = require("../src/algorithms/slidingWindow");
const { redis } = require("../src/config/redis");

afterAll(() => redis.disconnect());

describe("sliding window algorithm", () => {
  it("allows requests up to the limit", async () => {
    const id = `test:sliding:${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      const result = await slidingWindow(id, { limit: 3, windowMs: 5000 });
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks when limit is reached", async () => {
    const id = `test:sliding:block:${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      await slidingWindow(id, { limit: 3, windowMs: 5000 });
    }
    const result = await slidingWindow(id, { limit: 3, windowMs: 5000 });
    expect(result.allowed).toBe(false);
  });

  it("counts remaining correctly", async () => {
    const id = `test:sliding:remaining:${Date.now()}`;
    const r1 = await slidingWindow(id, { limit: 5, windowMs: 5000 });
    expect(r1.remaining).toBe(4);

    const r2 = await slidingWindow(id, { limit: 5, windowMs: 5000 });
    expect(r2.remaining).toBe(3);
  });

  it("uses a per-identifier key (two users are isolated)", async () => {
    const id1 = `test:sliding:user1:${Date.now()}`;
    const id2 = `test:sliding:user2:${Date.now()}`;
    const opts = { limit: 2, windowMs: 5000 };

    await slidingWindow(id1, opts);
    await slidingWindow(id1, opts);
    const blockedForUser1 = await slidingWindow(id1, opts);
    expect(blockedForUser1.allowed).toBe(false);

    // user2 is completely unaffected
    const allowedForUser2 = await slidingWindow(id2, opts);
    expect(allowedForUser2.allowed).toBe(true);
  });

  it("returns algorithm name", async () => {
    const id = `test:sliding:algo:${Date.now()}`;
    const result = await slidingWindow(id, { limit: 5, windowMs: 5000 });
    expect(result.algorithm).toBe("sliding");
  });
});