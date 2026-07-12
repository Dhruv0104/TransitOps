const prisma = require("../lib/prisma");

async function getAnalytics(req, res, next) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        fuelLogs: true,
        maintenanceLogs: true,
        trips: { where: { status: "COMPLETED" } },
      },
      orderBy: { registrationNo: "asc" },
    });

    const nonRetired = vehicles.filter((v) => v.status !== "RETIRED");
    const onTrip = vehicles.filter((v) => v.status === "ON_TRIP").length;
    const fleetUtilization =
      nonRetired.length === 0
        ? 0
        : Math.round((onTrip / nonRetired.length) * 1000) / 10;

    const rows = vehicles.map((v) => {
      const fuelLiters = v.fuelLogs.reduce((s, l) => s + l.liters, 0);
      const fuelCost = v.fuelLogs.reduce((s, l) => s + l.cost, 0);
      const maintenanceCost = v.maintenanceLogs.reduce((s, l) => s + l.cost, 0);
      const distance = v.trips.reduce(
        (s, t) => s + (t.actualDistance ?? t.plannedDistance ?? 0),
        0
      );
      const revenue = v.trips.reduce((s, t) => s + (t.revenue ?? 0), 0);
      const operationalCost = fuelCost + maintenanceCost;
      const fuelEfficiency =
        fuelLiters > 0 ? Math.round((distance / fuelLiters) * 100) / 100 : null;
      const roi =
        v.acquisitionCost > 0
          ? Math.round(
              ((revenue - operationalCost) / v.acquisitionCost) * 10000
            ) / 10000
          : null;

      return {
        vehicleId: v.id,
        registrationNo: v.registrationNo,
        name: v.name,
        type: v.type,
        status: v.status,
        acquisitionCost: v.acquisitionCost,
        distance,
        fuelLiters,
        fuelCost,
        maintenanceCost,
        operationalCost,
        revenue,
        fuelEfficiency,
        roi,
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.distance += r.distance;
        acc.fuelLiters += r.fuelLiters;
        acc.fuelCost += r.fuelCost;
        acc.maintenanceCost += r.maintenanceCost;
        acc.operationalCost += r.operationalCost;
        acc.revenue += r.revenue;
        return acc;
      },
      {
        distance: 0,
        fuelLiters: 0,
        fuelCost: 0,
        maintenanceCost: 0,
        operationalCost: 0,
        revenue: 0,
      }
    );

    const overallFuelEfficiency =
      totals.fuelLiters > 0
        ? Math.round((totals.distance / totals.fuelLiters) * 100) / 100
        : null;

    return res.json({
      summary: {
        fleetUtilization,
        fuelEfficiency: overallFuelEfficiency,
        operationalCost: totals.operationalCost,
        totalRevenue: totals.revenue,
        totalDistance: totals.distance,
        totalFuelLiters: totals.fuelLiters,
      },
      vehicles: rows,
    });
  } catch (err) {
    return next(err);
  }
}

async function exportCsv(_req, res, next) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        fuelLogs: true,
        maintenanceLogs: true,
        trips: { where: { status: "COMPLETED" } },
      },
      orderBy: { registrationNo: "asc" },
    });

    const header = [
      "registrationNo",
      "name",
      "type",
      "status",
      "distance",
      "fuelLiters",
      "fuelCost",
      "maintenanceCost",
      "operationalCost",
      "revenue",
      "fuelEfficiency",
      "roi",
      "acquisitionCost",
    ];

    const lines = [header.join(",")];
    for (const v of vehicles) {
      const fuelLiters = v.fuelLogs.reduce((s, l) => s + l.liters, 0);
      const fuelCost = v.fuelLogs.reduce((s, l) => s + l.cost, 0);
      const maintenanceCost = v.maintenanceLogs.reduce((s, l) => s + l.cost, 0);
      const distance = v.trips.reduce(
        (s, t) => s + (t.actualDistance ?? t.plannedDistance ?? 0),
        0
      );
      const revenue = v.trips.reduce((s, t) => s + (t.revenue ?? 0), 0);
      const operationalCost = fuelCost + maintenanceCost;
      const fuelEfficiency =
        fuelLiters > 0 ? (distance / fuelLiters).toFixed(2) : "";
      const roi =
        v.acquisitionCost > 0
          ? ((revenue - operationalCost) / v.acquisitionCost).toFixed(4)
          : "";

      lines.push(
        [
          v.registrationNo,
          `"${v.name.replaceAll('"', '""')}"`,
          v.type,
          v.status,
          distance,
          fuelLiters,
          fuelCost,
          maintenanceCost,
          operationalCost,
          revenue,
          fuelEfficiency,
          roi,
          v.acquisitionCost,
        ].join(",")
      );
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="transitops-report.csv"'
    );
    return res.send(lines.join("\n"));
  } catch (err) {
    return next(err);
  }
}

module.exports = { getAnalytics, exportCsv };
