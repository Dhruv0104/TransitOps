const express = require("express");
const reportsController = require("../controllers/reports.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
const reportRoles = ["FINANCIAL_ANALYST", "FLEET_MANAGER"];

router.use(authenticate);
router.get("/", authorize(...reportRoles), reportsController.getAnalytics);
router.get("/export.csv", authorize(...reportRoles), reportsController.exportCsv);
router.get("/export.pdf", authorize(...reportRoles), reportsController.exportPdf);

module.exports = router;
