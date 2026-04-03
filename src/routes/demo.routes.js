const express = require("express");
const router = express.Router();
const { createRateLimiter } = require("../middleware/rateLimiter");

// Fixed window — 5 req per 30 seconds, by IP
router.get(
  "/public",
  createRateLimiter({ algorithm: "fixed", limit: 5, windowMs: 30000 }),
  (req, res) => {
    res.json({ message: "✅ Request allowed", rateLimit: req.rateLimit });
  }
);

// Sliding window — 5 req per 30 seconds, by API key
router.get(
  "/authenticated",
  createRateLimiter({ algorithm: "sliding", limit: 5, windowMs: 30000 }),
  (req, res) => {
    res.json({ message: "✅ Request allowed", rateLimit: req.rateLimit });
  }
);

// Token bucket — burst 5, refill 0.5/sec, by API key
router.post(
  "/expensive",
  createRateLimiter({ algorithm: "token", capacity: 5, refillRate: 0.5 }),
  (req, res) => {
    res.json({ message: "✅ Request allowed", rateLimit: req.rateLimit });
  }
);

// No rate limiting — baseline
router.get("/unlimited", (req, res) => {
  res.json({ message: "✅ No rate limiting on this route" });
});

// Status — show current limits for your identifier across all endpoints
router.get("/status", async (req, res) => {
  const { extractIdentifier } = require("../utils/identifier");
  const { redis } = require("../config/redis");
  const id = extractIdentifier(req);

  const fixedKey = `rl:fixed:${id.value}:${Math.floor(Date.now() / 30000) * 30000}`;
  const slidingKey = `rl:sliding:${id.value}`;
  const tokenKey = `rl:token:${id.value}`;

  const [fixedCount, slidingCount, tokenData] = await Promise.all([
    redis.get(fixedKey),
    redis.zcard(slidingKey),
    redis.hmget(tokenKey, "tokens"),
  ]);

  res.json({
    identifier: id,
    fixed: { used: parseInt(fixedCount) || 0, limit: 5 },
    sliding: { used: parseInt(slidingCount) || 0, limit: 5 },
    token: { tokensRemaining: parseFloat(tokenData[0])?.toFixed(2) || "5.00", capacity: 5 },
  });
});

module.exports = router;