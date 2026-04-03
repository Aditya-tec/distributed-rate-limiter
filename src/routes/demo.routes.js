const express = require("express");
const router = express.Router();
const { createRateLimiter } = require("../middleware/rateLimiter");

// Fixed window — 5 requests per 30 seconds (easy to test manually)
router.get(
  "/public",
  createRateLimiter({ algorithm: "fixed", limit: 5, windowMs: 30000 }),
  (req, res) => {
    res.json({
      message: "✅ Request allowed",
      rateLimit: req.rateLimit,
    });
  }
);

// Sliding window — 5 requests per 30 seconds, by API key
router.get(
  "/authenticated",
  createRateLimiter({ algorithm: "sliding", limit: 5, windowMs: 30000 }),
  (req, res) => {
    res.json({
      message: "✅ Request allowed",
      rateLimit: req.rateLimit,
    });
  }
);

module.exports = router;