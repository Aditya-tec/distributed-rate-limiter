const app = require("./app");
const { PORT } = require("./config/env");

// Keep SSE connections alive on Render free tier
app.keepAliveTimeout = 120000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});