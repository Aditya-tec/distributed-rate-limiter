const { redis } = require("../config/redis");

const tokenBucketScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refillRate = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

local elapsed = (now - lastRefill) / 1000
tokens = math.min(capacity, tokens + elapsed * refillRate)

if tokens < 1 then
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
  local waitTime = math.ceil((1 - tokens) / refillRate)
  return {0, 0, waitTime}
end

tokens = tokens - 1
local ttl = math.ceil(capacity / refillRate) * 1000
redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
redis.call('PEXPIRE', key, ttl)

return {1, math.floor(tokens), 0}
`;

const tokenBucket = async (identifier, { capacity = 10, refillRate = 2 }) => {
  const now = Date.now();
  const key = `rl:token:${identifier}`;

  const [allowed, remaining, waitTime] = await redis.eval(
    tokenBucketScript,
    1,
    key,
    now,
    capacity,
    refillRate
  );

  return {
    allowed: allowed === 1,
    remaining: Math.max(0, remaining),
    resetAt: Math.floor(now / 1000) + (waitTime > 0 ? waitTime : 0),
    limit: capacity,
    algorithm: "token-bucket",
  };
};

module.exports = { tokenBucket };