const prisma = require("../lib/prisma");

const DRIVER_STATUSES = ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"];

function isLicenseExpired(expiry) {
  const date = new Date(expiry);
  if (Number.isNaN(date.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function daysUntilExpiry(expiry) {
  const date = new Date(expiry);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
}

function enrichDriver(driver) {
  const expired = isLicenseExpired(driver.licenseExpiry);
  const daysLeft = daysUntilExpiry(driver.licenseExpiry);
  return {
    ...driver,
    licenseExpired: expired,
    licenseExpiringSoon: !expired && daysLeft !== null && daysLeft <= 30,
    daysUntilLicenseExpiry: daysLeft,
  };
}

function parseDriverPayload(body) {
  const {
    name,
    licenseNumber,
    licenseCategory,
    licenseExpiry,
    contactNumber,
    safetyScore,
    status,
  } = body;

  return {
    name: name?.trim(),
    licenseNumber: licenseNumber?.trim(),
    licenseCategory: licenseCategory?.trim(),
    licenseExpiry: licenseExpiry || undefined,
    contactNumber: contactNumber?.trim(),
    safetyScore:
      safetyScore === undefined || safetyScore === ""
        ? undefined
        : Number(safetyScore),
    status: status || undefined,
  };
}

function validateCreate(data) {
  if (
    !data.name ||
    !data.licenseNumber ||
    !data.licenseCategory ||
    !data.licenseExpiry ||
    !data.contactNumber
  ) {
    return "name, licenseNumber, licenseCategory, licenseExpiry, and contactNumber are required";
  }
  const expiry = new Date(data.licenseExpiry);
  if (Number.isNaN(expiry.getTime())) {
    return "licenseExpiry must be a valid date";
  }
  if (data.status && !DRIVER_STATUSES.includes(data.status)) {
    return `status must be one of: ${DRIVER_STATUSES.join(", ")}`;
  }
  if (
    data.safetyScore !== undefined &&
    (Number.isNaN(data.safetyScore) ||
      data.safetyScore < 0 ||
      data.safetyScore > 100)
  ) {
    return "safetyScore must be between 0 and 100";
  }
  return null;
}

async function list(req, res, next) {
  try {
    const { status, q } = req.query;
    const where = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { licenseNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json({ drivers: drivers.map(enrichDriver) });
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
    });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    return res.json({ driver: enrichDriver(driver) });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = parseDriverPayload(req.body);
    const error = validateCreate(data);
    if (error) return res.status(400).json({ message: error });

    const existing = await prisma.driver.findUnique({
      where: { licenseNumber: data.licenseNumber },
    });
    if (existing) {
      return res.status(409).json({ message: "License number must be unique" });
    }

    const driver = await prisma.driver.create({
      data: {
        name: data.name,
        licenseNumber: data.licenseNumber,
        licenseCategory: data.licenseCategory,
        licenseExpiry: new Date(data.licenseExpiry),
        contactNumber: data.contactNumber,
        safetyScore: data.safetyScore ?? 100,
        status: data.status || "AVAILABLE",
      },
    });

    return res.status(201).json({ driver: enrichDriver(driver) });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "License number must be unique" });
    }
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await prisma.driver.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const data = parseDriverPayload(req.body);

    if (data.status && !DRIVER_STATUSES.includes(data.status)) {
      return res.status(400).json({
        message: `status must be one of: ${DRIVER_STATUSES.join(", ")}`,
      });
    }
    if (data.licenseExpiry) {
      const expiry = new Date(data.licenseExpiry);
      if (Number.isNaN(expiry.getTime())) {
        return res.status(400).json({ message: "licenseExpiry must be a valid date" });
      }
    }
    if (
      data.safetyScore !== undefined &&
      (Number.isNaN(data.safetyScore) ||
        data.safetyScore < 0 ||
        data.safetyScore > 100)
    ) {
      return res.status(400).json({ message: "safetyScore must be between 0 and 100" });
    }

    if (data.licenseNumber && data.licenseNumber !== existing.licenseNumber) {
      const clash = await prisma.driver.findUnique({
        where: { licenseNumber: data.licenseNumber },
      });
      if (clash) {
        return res.status(409).json({ message: "License number must be unique" });
      }
    }

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.licenseNumber !== undefined && {
          licenseNumber: data.licenseNumber,
        }),
        ...(data.licenseCategory !== undefined && {
          licenseCategory: data.licenseCategory,
        }),
        ...(data.licenseExpiry !== undefined && {
          licenseExpiry: new Date(data.licenseExpiry),
        }),
        ...(data.contactNumber !== undefined && {
          contactNumber: data.contactNumber,
        }),
        ...(data.safetyScore !== undefined && {
          safetyScore: data.safetyScore,
        }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return res.json({ driver: enrichDriver(driver) });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "License number must be unique" });
    }
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.driver.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (existing.status === "ON_TRIP") {
      return res.status(400).json({
        message: "Cannot delete a driver that is currently On Trip",
      });
    }

    await prisma.driver.delete({ where: { id: req.params.id } });
    return res.json({ message: "Driver deleted" });
  } catch (err) {
    if (err.code === "P2003") {
      return res.status(400).json({
        message: "Cannot delete driver with related trip records",
      });
    }
    return next(err);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  isLicenseExpired,
  DRIVER_STATUSES,
};
