const express = require("express");
const settingsController = require("../controllers/settings.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// Available to all authenticated roles (currency / units for UI)
router.get("/preferences", settingsController.getPreferences);

router.use(authorize("ADMIN"));
router.get("/", settingsController.getSettings);
router.put("/organization", settingsController.updateOrganization);
router.put("/rbac", settingsController.updateRbac);

module.exports = router;
