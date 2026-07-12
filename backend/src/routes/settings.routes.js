const express = require("express");
const settingsController = require("../controllers/settings.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", settingsController.getSettings);
router.put("/organization", settingsController.updateOrganization);
router.put("/rbac", settingsController.updateRbac);

module.exports = router;
