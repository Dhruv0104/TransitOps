require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");
const { authenticate } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);

function notImplemented(message) {
  return (_req, res) => {
    res.status(501).json({ message });
  };
}

// Protected module mounts — require JWT until real routers replace these
app.use("/api/vehicles", authenticate, notImplemented("Vehicles API coming soon"));
app.use("/api/drivers", authenticate, notImplemented("Drivers API coming soon"));
app.use("/api/trips", authenticate, notImplemented("Trips API coming soon"));
app.use("/api/maintenance", authenticate, notImplemented("Maintenance API coming soon"));
app.use("/api/fuel", authenticate, notImplemented("Fuel API coming soon"));
app.use("/api/expenses", authenticate, notImplemented("Expenses API coming soon"));
app.use("/api/dashboard", authenticate, notImplemented("Dashboard API coming soon"));
app.use("/api/reports", authenticate, notImplemented("Reports API coming soon"));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`TransitOps API listening on http://localhost:${PORT}`);
});
