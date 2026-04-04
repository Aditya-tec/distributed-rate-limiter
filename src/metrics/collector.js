const { redis } = require("../config/redis");

const getMinuteKey = (prefix, offsetMinutes = 0) => {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `rl:metrics:${prefix}:${y}-${mo}-${day}T${h}:${m}`;
};

const record = async (result) => {
  try {
    const { allowed, identifier, algorithm } = result;
    const type = allowed ? "allowed" : "blocked";
    const key = getMinuteKey(type);

    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 60 * 60 * 24); // keep 24 hours

    if (!allowed) {
      pipeline.zincrby("rl:metrics:top_blocked", 1, identifier);
      pipeline.expire("rl:metrics:top_blocked", 60 * 60 * 24);
    }

    // Track per-algorithm counts
    pipeline.incr(`rl:metrics:algo:${algorithm}`);

    await pipeline.exec();
  } catch (err) {
    // Metrics must never crash the app
    console.error("Metrics record error:", err.message);
  }
};

const getLast60Minutes = async () => {
  const keys = { allowed: [], blocked: [] };
  const labels = [];

  for (let i = 59; i >= 0; i--) {
    keys.allowed.push(getMinuteKey("allowed", -i));
    keys.blocked.push(getMinuteKey("blocked", -i));
    const d = new Date(Date.now() - i * 60000);
    labels.push(`${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`);
  }

  const pipeline = redis.pipeline();
  keys.allowed.forEach((k) => pipeline.get(k));
  keys.blocked.forEach((k) => pipeline.get(k));

  const results = await pipeline.exec();
  const allowed = results.slice(0, 60).map(([, v]) => parseInt(v) || 0);
  const blocked = results.slice(60).map(([, v]) => parseInt(v) || 0);

  return { labels, allowed, blocked };
};

const getTopBlocked = async (count = 10) => {
  const raw = await redis.zrevrange("rl:metrics:top_blocked", 0, count - 1, "WITHSCORES");
  const result = [];
  for (let i = 0; i < raw.length; i += 2) {
    result.push({ identifier: raw[i], count: parseInt(raw[i + 1]) });
  }
  return result;
};

const getAlgorithmCounts = async () => {
  const [fixed, sliding, tokenBucket] = await Promise.all([
    redis.get("rl:metrics:algo:fixed"),
    redis.get("rl:metrics:algo:sliding"),
    redis.get("rl:metrics:algo:token-bucket"),
  ]);
  return {
    fixed: parseInt(fixed) || 0,
    sliding: parseInt(sliding) || 0,
    tokenBucket: parseInt(tokenBucket) || 0,
  };
};

module.exports = { record, getLast60Minutes, getTopBlocked, getAlgorithmCounts };