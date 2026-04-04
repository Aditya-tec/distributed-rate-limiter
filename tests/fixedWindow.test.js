const { fixedWindow } = require("../src/algorithms/fixedWindow");
const { redis } = require("../src/config/redis");

const identifier = `test:fixed:${Date.now()}`;
const opts = { limit: 3, windowMs: 5000 };

afterAll(() => redis.disconnect());

describe("fixed window algorithm", () => {
  it("allows requests up to the limit", async () => {
    for (let i = 0; i < 3; i++) {
      const result = await fixedWindow(identifier, opts);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks the request after limit is reached", async () => {
    const result = await fixedWindow(identifier, opts);
    expect(result.allowed).toBe(false);
  });

  it("returns correct remaining count", async () => {
    const id = `test:fixed:remaining:${Date.now()}`;
    const r1 = await fixedWindow(id, { limit: 5, windowMs: 5000 });
    expect(r1.remaining).toBe(4);

    const r2 = await fixedWindow(id, { limit: 5, windowMs: 5000 });
    expect(r2.remaining).toBe(3);
  });

  it("returns algorithm name", async () => {
    const id = `test:fixed:algo:${Date.now()}`;
    const result = await fixedWindow(id, opts);
    expect(result.algorithm).toBe("fixed");
  });

  it("returns a future resetAt timestamp", async () => {
    const id = `test:fixed:reset:${Date.now()}`;
    const result = await fixedWindow(id, opts);
    expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});