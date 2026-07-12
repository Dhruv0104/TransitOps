require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);

// Placeholder mounts for upcoming modules
app.use("/api/vehicles", (_req, res) => {
  res.status(501).json({ message: "Vehicles API coming soon" });
});
app.use("/api/drivers", (_req, res) => {
  res.status(501).json({ message: "Drivers API coming soon" });
});
app.use("/api/trips", (_req, res) => {
  res.status(501).json({ message: "Trips API coming soon" });
});
app.use("/api/maintenance", (_req, res) => {
  res.status(501).json({ message: "Maintenance API coming soon" });
});
app.use("/api/fuel", (_req, res) => {
  res.status(501).json({ message: "Fuel API coming soon" });
});
app.use("/api/expenses", (_req, res) => {
  res.status(501).json({ message: "Expenses API coming soon" });
});
app.use("/api/dashboard", (_req, res) => {
  res.status(501).json({ message: "Dashboard API coming soon" });
});
app.use("/api/reports", (_req, res) => {
  res.status(501).json({ message: "Reports API coming soon" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`TransitOps API listening on http://localhost:${PORT}`);
});
