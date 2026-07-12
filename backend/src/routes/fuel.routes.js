const express = require("express");
const expensesController = require("../controllers/expenses.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
const financeRoles = ["FINANCIAL_ANALYST", "FLEET_MANAGER"];

router.use(authenticate);
router.get("/", authorize(...financeRoles), expensesController.listFuel);
router.post("/", authorize(...financeRoles), expensesController.createFuel);

module.exports = router;
