require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");
const vehiclesRoutes = require("./routes/vehicles.routes");
const driversRoutes = require("./routes/drivers.routes");
const tripsRoutes = require("./routes/trips.routes");
const maintenanceRoutes = require("./routes/maintenance.routes");
const expensesRoutes = require("./routes/expenses.routes");
const fuelRoutes = require("./routes/fuel.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const reportsRoutes = require("./routes/reports.routes");
const routingRoutes = require("./routes/routing.routes");
const usersRoutes = require("./routes/users.routes");
const settingsRoutes = require("./routes/settings.routes");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/drivers", driversRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/fuel", fuelRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/routing", routingRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/settings", settingsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`TransitOps API listening on http://localhost:${PORT}`);
});
