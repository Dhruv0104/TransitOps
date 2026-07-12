const express = require("express");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "TransitOps API",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
