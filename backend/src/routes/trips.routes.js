const express = require("express");
const tripsController = require("../controllers/trips.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Roles with trips view or full in RBAC matrix
const tripViewRoles = ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"];
const tripWriteRoles = ["FLEET_MANAGER", "DISPATCHER"];

router.use(authenticate);

router.get("/", authorize(...tripViewRoles), tripsController.list);
router.get("/:id", authorize(...tripViewRoles), tripsController.getById);
router.post("/", authorize(...tripWriteRoles), tripsController.create);
router.put("/:id", authorize(...tripWriteRoles), tripsController.update);
router.post("/:id/dispatch", authorize(...tripWriteRoles), tripsController.dispatch);
router.post("/:id/complete", authorize(...tripWriteRoles), tripsController.complete);
router.post("/:id/cancel", authorize(...tripWriteRoles), tripsController.cancel);

module.exports = router;
