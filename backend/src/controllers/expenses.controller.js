const prisma = require("../lib/prisma");

async function listFuel(req, res, next) {
  try {
    const { vehicleId } = req.query;
    const where = vehicleId ? { vehicleId } : {};
    const logs = await prisma.fuelLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { date: "desc" },
    });
    return res.json({ logs });
  } catch (err) {
    return next(err);
  }
}

async function createFuel(req, res, next) {
  try {
    const { vehicleId, liters, cost, date } = req.body;
    if (!vehicleId || liters === undefined || cost === undefined) {
      return res.status(400).json({
        message: "vehicleId, liters, and cost are required",
      });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const log = await prisma.fuelLog.create({
      data: {
        vehicleId,
        liters: Number(liters),
        cost: Number(cost),
        date: date ? new Date(date) : new Date(),
      },
      include: { vehicle: true },
    });

    return res.status(201).json({ log });
  } catch (err) {
    return next(err);
  }
}

async function listExpenses(req, res, next) {
  try {
    const { vehicleId, tripId } = req.query;
    const where = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (tripId) where.tripId = tripId;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        vehicle: true,
        trip: {
          select: {
            id: true,
            tripCode: true,
            source: true,
            destination: true,
            status: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });
    return res.json({ expenses });
  } catch (err) {
    return next(err);
  }
}

async function createExpense(req, res, next) {
  try {
    const { vehicleId, tripId, type, amount, description, date } = req.body;
    if (!vehicleId || !type || amount === undefined) {
      return res.status(400).json({
        message: "vehicleId, type, and amount are required",
      });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    let resolvedTripId = null;
    if (tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (trip.vehicleId !== vehicleId) {
        return res.status(400).json({
          message: "Selected trip does not belong to the selected vehicle",
        });
      }
      resolvedTripId = trip.id;
    }

    const expense = await prisma.expense.create({
      data: {
        vehicleId,
        tripId: resolvedTripId,
        type: String(type).trim().toUpperCase(),
        amount: Number(amount),
        description: description?.trim() || null,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        vehicle: true,
        trip: {
          select: {
            id: true,
            tripCode: true,
            source: true,
            destination: true,
            status: true,
          },
        },
      },
    });

    return res.status(201).json({ expense });
  } catch (err) {
    return next(err);
  }
}

async function operationalCosts(req, res, next) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        fuelLogs: true,
        maintenanceLogs: true,
        expenses: true,
      },
      orderBy: { registrationNo: "asc" },
    });

    const costs = vehicles.map((v) => {
      const fuelCost = v.fuelLogs.reduce((s, l) => s + l.cost, 0);
      const maintenanceCost = v.maintenanceLogs.reduce((s, l) => s + l.cost, 0);
      const otherExpenseCost = v.expenses.reduce((s, e) => s + e.amount, 0);
      return {
        vehicleId: v.id,
        registrationNo: v.registrationNo,
        name: v.name,
        fuelCost,
        maintenanceCost,
        otherExpenseCost,
        operationalCost: fuelCost + maintenanceCost,
        totalCost: fuelCost + maintenanceCost + otherExpenseCost,
      };
    });

    return res.json({ costs });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listFuel,
  createFuel,
  listExpenses,
  createExpense,
  operationalCosts,
};
