const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { runLicenseReminders } = require("../jobs/licenseReminders");

const router = express.Router();

router.use(authenticate);

router.post(
  "/license-reminders",
  authorize("ADMIN", "SAFETY_OFFICER", "FLEET_MANAGER"),
  async (req, res, next) => {
    try {
      // Manual UI clicks force resend (skip 24h cooldown). Cron stays non-force.
      const force =
        req.query.force === "true" ||
        req.body?.force === true ||
        req.body?.force === "true";
      const result = await runLicenseReminders({ force });
      return res.json({ message: "License reminders processed", ...result });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
