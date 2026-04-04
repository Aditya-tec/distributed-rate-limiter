const { createRateLimiter } = require("../src/middleware/rateLimiter");
const { redis } = require("../src/config/redis");

afterAll(() => redis.disconnect());

const mockReq = (apiKey = null) => ({
  headers: apiKey ? { "x-api-key": apiKey } : {},
  socket: { remoteAddress: "127.0.0.1" },
  ip: "127.0.0.1",
});

const mockRes = () => {
  const headers = {};
  return {
    headers,
    statusCode: null,
    body: null,
    setHeader: (k, v) => { headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
};

describe("createRateLimiter middleware", () => {
  it("sets rate limit headers on allowed requests", async () => {
    const mw = createRateLimiter({ algorithm: "fixed", limit: 10, windowMs: 5000 });
    const req = mockReq(`header-test-${Date.now()}`);
    const res = mockRes();
    const next = jest.fn();

    await mw(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.headers["X-RateLimit-Limit"]).toBe(10);
    expect(res.headers["X-RateLimit-Remaining"]).toBeDefined();
    expect(res.headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("returns 429 and sets Retry-After when blocked", async () => {
    const key = `mw-block-${Date.now()}`;
    const mw = createRateLimiter({ algorithm: "fixed", limit: 1, windowMs: 5000 });
    const next = jest.fn();

    // First request — allowed
    await mw(mockReq(key), mockRes(), next);

    // Second request — blocked
    const res = mockRes();
    await mw(mockReq(key), res, jest.fn());

    expect(res.statusCode).toBe(429);
    expect(res.headers["Retry-After"]).toBeDefined();
    expect(res.body.error).toBe("Too many requests");
  });

  it("skipFn bypasses rate limiting entirely", async () => {
    const mw = createRateLimiter({
      algorithm: "fixed",
      limit: 0, // would block everything
      windowMs: 5000,
      skipFn: () => true,
    });
    const res = mockRes();
    const next = jest.fn();

    await mw(mockReq(), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it("attaches rateLimit result to req on allowed requests", async () => {
    const key = `mw-attach-${Date.now()}`;
    const mw = createRateLimiter({ algorithm: "fixed", limit: 10, windowMs: 5000 });
    const req = mockReq(key);
    const next = jest.fn();

    await mw(req, mockRes(), next);
    expect(req.rateLimit).toBeDefined();
    expect(req.rateLimit.allowed).toBe(true);
  });

  it("throws on unknown algorithm", () => {
    expect(() =>
      createRateLimiter({ algorithm: "unknown" })
    ).toThrow("Unknown algorithm: unknown");
  });
});