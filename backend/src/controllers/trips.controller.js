const prisma = require("../lib/prisma");
const { isLicenseExpired } = require("./drivers.controller");

function tripInclude() {
  return {
    vehicle: true,
    driver: true,
  };
}

async function assertAssignable(vehicleId, driverId, cargoWeightKg) {
  const [vehicle, driver] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    prisma.driver.findUnique({ where: { id: driverId } }),
  ]);

  if (!vehicle) return { error: "Vehicle not found", status: 404 };
  if (!driver) return { error: "Driver not found", status: 404 };

  if (vehicle.status === "RETIRED" || vehicle.status === "IN_SHOP") {
    return {
      error: "Retired or In Shop vehicles cannot be assigned to trips",
      status: 400,
    };
  }
  if (vehicle.status === "ON_TRIP") {
    return {
      error: "Vehicle is already On Trip and cannot be assigned again",
      status: 400,
    };
  }
  if (vehicle.status !== "AVAILABLE") {
    return { error: "Vehicle must be Available for assignment", status: 400 };
  }

  if (driver.status === "SUSPENDED") {
    return { error: "Suspended drivers cannot be assigned to trips", status: 400 };
  }
  if (isLicenseExpired(driver.licenseExpiry)) {
    return {
      error: "Drivers with expired licenses cannot be assigned to trips",
      status: 400,
    };
  }
  if (driver.status === "ON_TRIP") {
    return {
      error: "Driver is already On Trip and cannot be assigned again",
      status: 400,
    };
  }
  if (driver.status !== "AVAILABLE") {
    return { error: "Driver must be Available for assignment", status: 400 };
  }

  if (Number(cargoWeightKg) > vehicle.maxLoadKg) {
    return {
      error: `Cargo weight (${cargoWeightKg} kg) exceeds vehicle max load (${vehicle.maxLoadKg} kg)`,
      status: 400,
    };
  }

  return { vehicle, driver };
}

async function list(req, res, next) {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const trips = await prisma.trip.findMany({
      where,
      include: tripInclude(),
      orderBy: { createdAt: "desc" },
    });
    return res.json({ trips });
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: tripInclude(),
    });
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    return res.json({ trip });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeightKg,
      plannedDistance,
      revenue,
    } = req.body;

    if (
      !source ||
      !destination ||
      !vehicleId ||
      !driverId ||
      cargoWeightKg === undefined ||
      plannedDistance === undefined
    ) {
      return res.status(400).json({
        message:
          "source, destination, vehicleId, driverId, cargoWeightKg, and plannedDistance are required",
      });
    }

    const check = await assertAssignable(
      vehicleId,
      driverId,
      Number(cargoWeightKg)
    );
    if (check.error) {
      return res.status(check.status).json({ message: check.error });
    }

    const trip = await prisma.trip.create({
      data: {
        source: String(source).trim(),
        destination: String(destination).trim(),
        vehicleId,
        driverId,
        cargoWeightKg: Number(cargoWeightKg),
        plannedDistance: Number(plannedDistance),
        revenue:
          revenue === undefined || revenue === "" ? null : Number(revenue),
        status: "DRAFT",
      },
      include: tripInclude(),
    });

    return res.status(201).json({ trip });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await prisma.trip.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Trip not found" });
    }
    if (existing.status !== "DRAFT") {
      return res.status(400).json({
        message: "Only Draft trips can be edited",
      });
    }

    const {
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeightKg,
      plannedDistance,
      revenue,
    } = req.body;

    if (
      !source ||
      !destination ||
      !vehicleId ||
      !driverId ||
      cargoWeightKg === undefined ||
      plannedDistance === undefined
    ) {
      return res.status(400).json({
        message:
          "source, destination, vehicleId, driverId, cargoWeightKg, and plannedDistance are required",
      });
    }

    const check = await assertAssignable(
      vehicleId,
      driverId,
      Number(cargoWeightKg)
    );
    if (check.error) {
      return res.status(check.status).json({ message: check.error });
    }

    const trip = await prisma.trip.update({
      where: { id: existing.id },
      data: {
        source: String(source).trim(),
        destination: String(destination).trim(),
        vehicleId,
        driverId,
        cargoWeightKg: Number(cargoWeightKg),
        plannedDistance: Number(plannedDistance),
        revenue:
          revenue === undefined || revenue === "" ? null : Number(revenue),
      },
      include: tripInclude(),
    });

    return res.json({ trip });
  } catch (err) {
    return next(err);
  }
}

async function dispatch(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: tripInclude(),
    });
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.status !== "DRAFT") {
      return res.status(400).json({ message: "Only Draft trips can be dispatched" });
    }

    const check = await assertAssignable(
      trip.vehicleId,
      trip.driverId,
      trip.cargoWeightKg
    );
    if (check.error) {
      return res.status(check.status).json({ message: check.error });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.trip.update({
        where: { id: trip.id },
        data: { status: "DISPATCHED" },
        include: tripInclude(),
      });
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "ON_TRIP" },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: "ON_TRIP" },
      });
      return next;
    });

    return res.json({ trip: updated });
  } catch (err) {
    return next(err);
  }
}

async function complete(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: tripInclude(),
    });
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.status !== "DISPATCHED") {
      return res.status(400).json({
        message: "Only Dispatched trips can be completed",
      });
    }

    const { finalOdometer, fuelConsumed, actualDistance, revenue } = req.body;
    if (finalOdometer === undefined || finalOdometer === "") {
      return res.status(400).json({ message: "finalOdometer is required" });
    }

    const odometer = Number(finalOdometer);
    if (Number.isNaN(odometer) || odometer < trip.vehicle.odometer) {
      return res.status(400).json({
        message: "finalOdometer must be >= current vehicle odometer",
      });
    }

    const fuel = fuelConsumed === undefined || fuelConsumed === ""
      ? null
      : Number(fuelConsumed);
    if (fuel !== null && (Number.isNaN(fuel) || fuel < 0)) {
      return res.status(400).json({ message: "fuelConsumed must be non-negative" });
    }

    const distance =
      actualDistance === undefined || actualDistance === ""
        ? odometer - trip.vehicle.odometer
        : Number(actualDistance);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: "COMPLETED",
          finalOdometer: odometer,
          fuelConsumed: fuel,
          actualDistance: distance,
          ...(revenue !== undefined && revenue !== ""
            ? { revenue: Number(revenue) }
            : {}),
        },
        include: tripInclude(),
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "AVAILABLE", odometer },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: "AVAILABLE" },
      });

      if (fuel && fuel > 0) {
        const estimatedCost = fuel * 100;
        await tx.fuelLog.create({
          data: {
            vehicleId: trip.vehicleId,
            liters: fuel,
            cost: estimatedCost,
            date: new Date(),
          },
        });
      }

      return next;
    });

    return res.json({ trip: updated });
  } catch (err) {
    return next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
    });
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    if (trip.status === "COMPLETED" || trip.status === "CANCELLED") {
      return res.status(400).json({
        message: "Completed or Cancelled trips cannot be cancelled again",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.trip.update({
        where: { id: trip.id },
        data: { status: "CANCELLED" },
        include: tripInclude(),
      });

      if (trip.status === "DISPATCHED") {
        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: "AVAILABLE" },
        });
        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: "AVAILABLE" },
        });
      }

      return next;
    });

    return res.json({ trip: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getById, create, update, dispatch, complete, cancel };
