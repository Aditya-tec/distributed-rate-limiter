const { getLast60Minutes, getTopBlocked, getAlgorithmCounts } = require("../metrics/collector");
const { isHealthy, redis } = require("../config/redis");

// SSE clients store
const clients = new Set();

const getMetrics = async (req, res) => {
  try {
    const [timeline, topBlocked, algorithms, redisInfo] = await Promise.all([
      getLast60Minutes(),
      getTopBlocked(10),
      getAlgorithmCounts(),
      redis.info("memory"),
    ]);

    const memMatch = redisInfo.match(/used_memory_human:(\S+)/);
    const redisMemory = memMatch ? memMatch[1] : "unknown";

    const totalAllowed = timeline.allowed.reduce((a, b) => a + b, 0);
    const totalBlocked = timeline.blocked.reduce((a, b) => a + b, 0);

    res.json({
      timeline,
      topBlocked,
      algorithms,
      summary: {
        totalAllowed,
        totalBlocked,
        blockRate:
          totalAllowed + totalBlocked > 0
            ? ((totalBlocked / (totalAllowed + totalBlocked)) * 100).toFixed(1)
            : "0.0",
      },
      redis: {
        healthy: await isHealthy(),
        memory: redisMemory,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SSE stream — one event per rate limit decision
const streamEvents = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const client = { res };
  clients.add(client);

  // Keep alive ping every 5s (Render free tier cuts idle connections)
  const ping = setInterval(() => {
    res.write(": ping\n\n");
  }, 5000);

  req.on("close", () => {
    clearInterval(ping);
    clients.delete(client);
  });
};

// Called by middleware to push events to all connected dashboards
const pushEvent = (data) => {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client);
    }
  });
};

module.exports = { getMetrics, streamEvents, pushEvent };