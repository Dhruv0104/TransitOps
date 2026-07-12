const express = require("express");
const usersController = require("../controllers/users.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", usersController.list);
router.get("/:id", usersController.getById);
router.post("/", usersController.create);
router.put("/:id", usersController.update);
router.post("/:id/verify", usersController.verify);
router.delete("/:id", usersController.remove);

module.exports = router;
