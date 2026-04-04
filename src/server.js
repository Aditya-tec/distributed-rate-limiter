const app = require("./app");
const { PORT } = require("./config/env");

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

// Keep SSE connections alive on Render free tier
server.keepAliveTimeout = 120000;