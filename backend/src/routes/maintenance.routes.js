const express = require("express");
const maintenanceController = require("../controllers/maintenance.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);
router.use(authorize("FLEET_MANAGER"));

router.get("/", maintenanceController.list);
router.post("/", maintenanceController.create);
router.post("/:id/close", maintenanceController.close);

module.exports = router;
