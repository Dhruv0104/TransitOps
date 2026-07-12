const express = require("express");
const vehiclesController = require("../controllers/vehicles.controller");
const documentsController = require("../controllers/documents.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize("FLEET_MANAGER", "DISPATCHER", "FINANCIAL_ANALYST"),
  vehiclesController.list
);
router.post("/", authorize("FLEET_MANAGER"), vehiclesController.create);

router.get(
  "/:id/documents",
  authorize("FLEET_MANAGER", "DISPATCHER", "FINANCIAL_ANALYST", "SAFETY_OFFICER"),
  documentsController.list
);
router.post(
  "/:id/documents",
  authorize("FLEET_MANAGER", "SAFETY_OFFICER"),
  documentsController.upload.single("file"),
  documentsController.create
);
router.delete(
  "/:id/documents/:docId",
  authorize("FLEET_MANAGER", "SAFETY_OFFICER"),
  documentsController.remove
);

router.get(
  "/:id",
  authorize("FLEET_MANAGER", "DISPATCHER", "FINANCIAL_ANALYST"),
  vehiclesController.getById
);
router.put("/:id", authorize("FLEET_MANAGER"), vehiclesController.update);
router.delete("/:id", authorize("FLEET_MANAGER"), vehiclesController.remove);

module.exports = router;
