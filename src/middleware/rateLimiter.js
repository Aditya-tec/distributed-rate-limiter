const { fixedWindow } = require("../algorithms/fixedWindow");
const { slidingWindow } = require("../algorithms/slidingWindow");
const { tokenBucket } = require("../algorithms/tokenBucket");
const { extractIdentifier } = require("../utils/identifier");
const { isHealthy } = require("../config/redis");
const { FAIL_OPEN } = require("../config/env");

const setHeaders = (res, { limit, remaining, resetAt }) => {
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", resetAt);
};

const ALGORITHMS = {
  fixed: fixedWindow,
  sliding: slidingWindow,
  token: tokenBucket,
};

const createRateLimiter = ({
  algorithm = "fixed",
  limit = 10,
  windowMs = 60000,
  capacity = 10,
  refillRate = 2,
  identifierFn = null,
  onBlocked = null,
  skipFn = null,
  failOpen = FAIL_OPEN,
} = {}) => {
  const algo = ALGORITHMS[algorithm];
  if (!algo) throw new Error(`Unknown algorithm: ${algorithm}`);

  return async (req, res, next) => {
    try {
      if (skipFn && skipFn(req)) return next();

      const { value: identifier } = identifierFn
        ? { value: identifierFn(req) }
        : extractIdentifier(req);

      const healthy = await isHealthy();
      if (!healthy) {
        if (failOpen) {
          setHeaders(res, { limit: capacity || limit, remaining: -1, resetAt: -1 });
          return next();
        } else {
          return res.status(503).json({
            error: "Service temporarily unavailable",
            message: "Rate limiting service is down",
          });
        }
      }

      // Pass the right options depending on algorithm
      const options =
        algorithm === "token"
          ? { capacity, refillRate }
          : { limit, windowMs };

      const result = await algo(identifier, options);
      result.identifier = identifier;

      setHeaders(res, result);

      if (!result.allowed) {
        res.setHeader(
          "Retry-After",
          result.resetAt - Math.floor(Date.now() / 1000)
        );

        if (onBlocked) return onBlocked(req, res, result);

        return res.status(429).json({
          error: "Too many requests",
          message: `Rate limit exceeded. Try again in ${result.resetAt - Math.floor(Date.now() / 1000)}s`,
          retryAfter: result.resetAt - Math.floor(Date.now() / 1000),
          limit: result.limit,
          algorithm: result.algorithm,
        });
      }

      req.rateLimit = result;
      next();
    } catch (err) {
      console.error("Rate limiter error:", err.message);
      if (failOpen) return next();
      return res.status(500).json({ error: "Rate limiter internal error" });
    }
  };
};

module.exports = { createRateLimiter };