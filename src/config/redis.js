const Redis = require("ioredis");
const { REDIS_URL } = require("./env");

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err.message));

const isHealthy = async () => {
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
};

module.exports = { redis, isHealthy };