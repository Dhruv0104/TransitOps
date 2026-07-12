const express = require("express");
const tripsController = require("../controllers/trips.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
const tripRoles = ["FLEET_MANAGER", "DRIVER"];

router.use(authenticate);

router.get("/", authorize(...tripRoles), tripsController.list);
router.get("/:id", authorize(...tripRoles), tripsController.getById);
router.post("/", authorize(...tripRoles), tripsController.create);
router.post("/:id/dispatch", authorize(...tripRoles), tripsController.dispatch);
router.post("/:id/complete", authorize(...tripRoles), tripsController.complete);
router.post("/:id/cancel", authorize(...tripRoles), tripsController.cancel);

module.exports = router;
