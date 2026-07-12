const express = require("express");
const vehiclesController = require("../controllers/vehicles.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize("FLEET_MANAGER", "DRIVER", "FINANCIAL_ANALYST"),
  vehiclesController.list
);
router.get(
  "/:id",
  authorize("FLEET_MANAGER", "DRIVER", "FINANCIAL_ANALYST"),
  vehiclesController.getById
);
router.post("/", authorize("FLEET_MANAGER"), vehiclesController.create);
router.put("/:id", authorize("FLEET_MANAGER"), vehiclesController.update);
router.delete("/:id", authorize("FLEET_MANAGER"), vehiclesController.remove);

module.exports = router;
