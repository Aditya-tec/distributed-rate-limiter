const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const demoRoutes = require("./routes/demo.routes");
const adminRoutes = require("./routes/admin.routes");
const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:3000",
    process.env.DASHBOARD_URL || "",
  ].filter(Boolean),
}));

app.use(morgan("dev"));
app.use("/admin", adminRoutes);
app.use(express.json());

app.get("/health", async (req, res) => {
  const { isHealthy } = require("./config/redis");
  const redisOk = await isHealthy();
  res.json({
    status: "ok",
    redis: redisOk ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.use("/demo", demoRoutes);

module.exports = app;