const express = require("express");
const driversController = require("../controllers/drivers.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize("SAFETY_OFFICER", "FLEET_MANAGER", "DRIVER"),
  driversController.list
);
router.get(
  "/:id",
  authorize("SAFETY_OFFICER", "FLEET_MANAGER", "DRIVER"),
  driversController.getById
);
router.post("/", authorize("SAFETY_OFFICER"), driversController.create);
router.put("/:id", authorize("SAFETY_OFFICER"), driversController.update);
router.delete("/:id", authorize("SAFETY_OFFICER"), driversController.remove);

module.exports = router;
