const prisma = require("../lib/prisma");

async function getKpis(req, res, next) {
  try {
    const { type, status, region } = req.query;
    const vehicleWhere = {};
    if (type) vehicleWhere.type = { equals: type, mode: "insensitive" };
    if (status) vehicleWhere.status = status;
    if (region) vehicleWhere.region = { equals: region, mode: "insensitive" };

    const vehicles = await prisma.vehicle.findMany({ where: vehicleWhere });
    const nonRetired = vehicles.filter((v) => v.status !== "RETIRED");
    const activeVehicles = nonRetired.length;
    const availableVehicles = vehicles.filter((v) => v.status === "AVAILABLE").length;
    const inMaintenance = vehicles.filter((v) => v.status === "IN_SHOP").length;
    const onTripVehicles = vehicles.filter((v) => v.status === "ON_TRIP").length;

    const [activeTrips, pendingTrips, driversOnDuty, totalDrivers] = await Promise.all([
      prisma.trip.count({ where: { status: "DISPATCHED" } }),
      prisma.trip.count({ where: { status: "DRAFT" } }),
      prisma.driver.count({ where: { status: "ON_TRIP" } }),
      prisma.driver.count(),
    ]);

    const fleetUtilization =
      nonRetired.length === 0
        ? 0
        : Math.round((onTripVehicles / nonRetired.length) * 1000) / 10;

    return res.json({
      kpis: {
        activeVehicles,
        availableVehicles,
        vehiclesInMaintenance: inMaintenance,
        activeTrips,
        pendingTrips,
        driversOnDuty,
        totalDrivers,
        fleetUtilization,
      },
      vehicleStatusBreakdown: {
        AVAILABLE: vehicles.filter((v) => v.status === "AVAILABLE").length,
        ON_TRIP: onTripVehicles,
        IN_SHOP: inMaintenance,
        RETIRED: vehicles.filter((v) => v.status === "RETIRED").length,
      },
      recentVehicles: vehicles.slice(0, 8).map((v) => ({
        id: v.id,
        registrationNo: v.registrationNo,
        name: v.name,
        status: v.status,
        region: v.region,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getKpis };
