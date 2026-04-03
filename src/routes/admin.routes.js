const express = require("express");
const router = express.Router();
const { getMetrics, streamEvents } = require("../controllers/admin.controller");

router.get("/metrics", getMetrics);
router.get("/stream", streamEvents);

module.exports = router;