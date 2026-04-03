require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  NODE_ENV: process.env.NODE_ENV || "development",
  FAIL_OPEN: process.env.FAIL_OPEN !== "false",
};