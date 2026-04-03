const { redis } = require("../config/redis");
const { randomUUID } = require("crypto");

const slidingWindowScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local requestId = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - windowMs)

local count = redis.call('ZCARD', key)

if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetIn = 0
  if oldest[2] then
    resetIn = math.ceil((tonumber(oldest[2]) + windowMs - now) / 1000)
  end
  return {0, 0, resetIn}
end

redis.call('ZADD', key, now, requestId)
redis.call('PEXPIRE', key, windowMs)

return {1, limit - count - 1, -1}
`;

const slidingWindow = async (identifier, { limit, windowMs }) => {
  const now = Date.now();
  const requestId = randomUUID();
  const key = `rl:sliding:${identifier}`;

  const [allowed, remaining, resetIn] = await redis.eval(
    slidingWindowScript,
    1,
    key,
    now,
    windowMs,
    limit,
    requestId
  );

  return {
    allowed: allowed === 1,
    remaining: Math.max(0, remaining),
    resetAt: resetIn > 0
      ? Math.floor(now / 1000) + resetIn
      : Math.floor(now / 1000) + Math.floor(windowMs / 1000),
    limit,
    algorithm: "sliding",
  };
};

module.exports = { slidingWindow };