const prisma = require("../lib/prisma");

async function list(req, res, next) {
  try {
    const { vehicleId, active } = req.query;
    const where = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { startedAt: "desc" },
    });
    return res.json({ logs });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const { vehicleId, description, cost } = req.body;
    if (!vehicleId || !description) {
      return res.status(400).json({
        message: "vehicleId and description are required",
      });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    if (vehicle.status === "RETIRED") {
      return res.status(400).json({ message: "Cannot maintain a retired vehicle" });
    }
    if (vehicle.status === "ON_TRIP") {
      return res.status(400).json({
        message: "Cannot put an On Trip vehicle into maintenance",
      });
    }

    const existingActive = await prisma.maintenanceLog.findFirst({
      where: { vehicleId, isActive: true },
    });
    if (existingActive) {
      return res.status(400).json({
        message: "Vehicle already has an active maintenance record",
      });
    }

    const log = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceLog.create({
        data: {
          vehicleId,
          description: String(description).trim(),
          cost: cost === undefined || cost === "" ? 0 : Number(cost),
          isActive: true,
        },
        include: { vehicle: true },
      });
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { status: "IN_SHOP" },
      });
      return created;
    });

    return res.status(201).json({ log });
  } catch (err) {
    return next(err);
  }
}

async function close(req, res, next) {
  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true },
    });
    if (!log) {
      return res.status(404).json({ message: "Maintenance log not found" });
    }
    if (!log.isActive) {
      return res.status(400).json({ message: "Maintenance log is already closed" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const closed = await tx.maintenanceLog.update({
        where: { id: log.id },
        data: { isActive: false, closedAt: new Date() },
        include: { vehicle: true },
      });

      if (log.vehicle.status !== "RETIRED") {
        await tx.vehicle.update({
          where: { id: log.vehicleId },
          data: { status: "AVAILABLE" },
        });
      }

      return closed;
    });

    return res.json({ log: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, close };
