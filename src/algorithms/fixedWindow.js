const { redis } = require("../config/redis");

const fixedWindowScript = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])

local current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, windowSeconds)
end

if current > limit then
  local ttl = redis.call('TTL', key)
  return {0, limit - current, ttl}
end

return {1, limit - current, redis.call('TTL', key)}
`;

const fixedWindow = async (identifier, { limit, windowMs }) => {
  const windowSeconds = Math.floor(windowMs / 1000);
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `rl:fixed:${identifier}:${windowStart}`;

  const [allowed, remaining, ttl] = await redis.eval(
    fixedWindowScript,
    1,
    key,
    limit,
    windowSeconds
  );

  return {
    allowed: allowed === 1,
    remaining: Math.max(0, remaining),
    resetAt: Math.floor(Date.now() / 1000) + ttl,
    limit,
    algorithm: "fixed",
  };
};

module.exports = { fixedWindow };