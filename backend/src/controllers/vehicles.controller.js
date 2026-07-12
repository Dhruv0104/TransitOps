const prisma = require("../lib/prisma");

const VEHICLE_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

function parseVehiclePayload(body) {
  const {
    registrationNo,
    name,
    type,
    maxLoadKg,
    odometer,
    acquisitionCost,
    status,
    region,
  } = body;

  return {
    registrationNo: registrationNo?.trim(),
    name: name?.trim(),
    type: type?.trim(),
    maxLoadKg:
      maxLoadKg === undefined || maxLoadKg === ""
        ? undefined
        : Number(maxLoadKg),
    odometer:
      odometer === undefined || odometer === "" ? undefined : Number(odometer),
    acquisitionCost:
      acquisitionCost === undefined || acquisitionCost === ""
        ? undefined
        : Number(acquisitionCost),
    status: status || undefined,
    region: region?.trim() || null,
  };
}

function validateCreate(data) {
  if (!data.registrationNo || !data.name || !data.type) {
    return "registrationNo, name, and type are required";
  }
  if (data.maxLoadKg === undefined || Number.isNaN(data.maxLoadKg)) {
    return "maxLoadKg is required and must be a number";
  }
  if (data.maxLoadKg <= 0) {
    return "maxLoadKg must be greater than 0";
  }
  if (
    data.acquisitionCost === undefined ||
    Number.isNaN(data.acquisitionCost)
  ) {
    return "acquisitionCost is required and must be a number";
  }
  if (data.acquisitionCost < 0) {
    return "acquisitionCost cannot be negative";
  }
  if (data.odometer !== undefined && (Number.isNaN(data.odometer) || data.odometer < 0)) {
    return "odometer must be a non-negative number";
  }
  if (data.status && !VEHICLE_STATUSES.includes(data.status)) {
    return `status must be one of: ${VEHICLE_STATUSES.join(", ")}`;
  }
  return null;
}

async function list(req, res, next) {
  try {
    const { type, status, region, q } = req.query;
    const where = {};

    if (type) where.type = { equals: type, mode: "insensitive" };
    if (status) where.status = status;
    if (region) where.region = { equals: region, mode: "insensitive" };
    if (q) {
      where.OR = [
        { registrationNo: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ];
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json({ vehicles });
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
    });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    return res.json({ vehicle });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = parseVehiclePayload(req.body);
    const error = validateCreate(data);
    if (error) return res.status(400).json({ message: error });

    const existing = await prisma.vehicle.findUnique({
      where: { registrationNo: data.registrationNo },
    });
    if (existing) {
      return res.status(409).json({
        message: "Vehicle registration number must be unique",
      });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNo: data.registrationNo,
        name: data.name,
        type: data.type,
        maxLoadKg: data.maxLoadKg,
        odometer: data.odometer ?? 0,
        acquisitionCost: data.acquisitionCost,
        status: data.status || "AVAILABLE",
        region: data.region,
      },
    });

    return res.status(201).json({ vehicle });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        message: "Vehicle registration number must be unique",
      });
    }
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const data = parseVehiclePayload(req.body);

    if (data.status && !VEHICLE_STATUSES.includes(data.status)) {
      return res.status(400).json({
        message: `status must be one of: ${VEHICLE_STATUSES.join(", ")}`,
      });
    }
    if (data.maxLoadKg !== undefined && (Number.isNaN(data.maxLoadKg) || data.maxLoadKg <= 0)) {
      return res.status(400).json({ message: "maxLoadKg must be greater than 0" });
    }
    if (
      data.acquisitionCost !== undefined &&
      (Number.isNaN(data.acquisitionCost) || data.acquisitionCost < 0)
    ) {
      return res.status(400).json({ message: "acquisitionCost cannot be negative" });
    }
    if (data.odometer !== undefined && (Number.isNaN(data.odometer) || data.odometer < 0)) {
      return res.status(400).json({ message: "odometer must be a non-negative number" });
    }

    if (data.registrationNo && data.registrationNo !== existing.registrationNo) {
      const clash = await prisma.vehicle.findUnique({
        where: { registrationNo: data.registrationNo },
      });
      if (clash) {
        return res.status(409).json({
          message: "Vehicle registration number must be unique",
        });
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        ...(data.registrationNo !== undefined && {
          registrationNo: data.registrationNo,
        }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.maxLoadKg !== undefined && { maxLoadKg: data.maxLoadKg }),
        ...(data.odometer !== undefined && { odometer: data.odometer }),
        ...(data.acquisitionCost !== undefined && {
          acquisitionCost: data.acquisitionCost,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.region !== undefined && { region: data.region }),
      },
    });

    return res.json({ vehicle });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        message: "Vehicle registration number must be unique",
      });
    }
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (existing.status === "ON_TRIP") {
      return res.status(400).json({
        message: "Cannot delete a vehicle that is currently On Trip",
      });
    }

    await prisma.vehicle.delete({ where: { id: req.params.id } });
    return res.json({ message: "Vehicle deleted" });
  } catch (err) {
    if (err.code === "P2003") {
      return res.status(400).json({
        message: "Cannot delete vehicle with related trip or log records",
      });
    }
    return next(err);
  }
}

module.exports = { list, getById, create, update, remove, VEHICLE_STATUSES };
