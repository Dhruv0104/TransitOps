const PDFDocument = require("pdfkit");
const prisma = require("../lib/prisma");

async function buildVehicleRows() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      fuelLogs: true,
      maintenanceLogs: true,
      trips: { where: { status: "COMPLETED" } },
    },
    orderBy: { registrationNo: "asc" },
  });

  return vehicles.map((v) => {
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
}

async function getAnalytics(req, res, next) {
  try {
    const rows = await buildVehicleRows();
    const vehicles = await prisma.vehicle.findMany();
    const nonRetired = vehicles.filter((v) => v.status !== "RETIRED");
    const onTrip = vehicles.filter((v) => v.status === "ON_TRIP").length;
    const fleetUtilization =
      nonRetired.length === 0
        ? 0
        : Math.round((onTrip / nonRetired.length) * 1000) / 10;

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
    const rows = await buildVehicleRows();

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
    for (const r of rows) {
      lines.push(
        [
          r.registrationNo,
          `"${String(r.name).replaceAll('"', '""')}"`,
          r.type,
          r.status,
          r.distance,
          r.fuelLiters,
          r.fuelCost,
          r.maintenanceCost,
          r.operationalCost,
          r.revenue,
          r.fuelEfficiency ?? "",
          r.roi ?? "",
          r.acquisitionCost,
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

async function exportPdf(_req, res, next) {
  try {
    const rows = await buildVehicleRows();
    const totals = rows.reduce(
      (acc, r) => {
        acc.operationalCost += r.operationalCost;
        acc.revenue += r.revenue;
        acc.distance += r.distance;
        return acc;
      },
      { operationalCost: 0, revenue: 0, distance: 0 }
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="transitops-report.pdf"'
    );
    doc.pipe(res);

    doc
      .fontSize(18)
      .fillColor("#f97316")
      .text("TransitOps Fleet Report", { continued: false });
    doc
      .moveDown(0.3)
      .fontSize(10)
      .fillColor("#334155")
      .text(`Generated ${new Date().toISOString().slice(0, 19)} UTC`);

    doc.moveDown();
    doc
      .fontSize(12)
      .fillColor("#0f172a")
      .text("Summary", { underline: true });
    doc
      .fontSize(10)
      .text(`Vehicles: ${rows.length}`)
      .text(`Total distance: ${totals.distance.toFixed(1)}`)
      .text(`Operational cost: ${totals.operationalCost.toFixed(2)}`)
      .text(`Revenue: ${totals.revenue.toFixed(2)}`);

    doc.moveDown();
    doc.fontSize(12).text("Vehicles", { underline: true });
    doc.moveDown(0.5);

    rows.forEach((r, i) => {
      if (doc.y > 720) doc.addPage();
      doc
        .fontSize(10)
        .fillColor("#0f172a")
        .text(`${i + 1}. ${r.registrationNo} — ${r.name} [${r.status}]`);
      doc
        .fontSize(9)
        .fillColor("#475569")
        .text(
          `  Dist ${r.distance.toFixed(1)} | Fuel ${r.fuelCost.toFixed(2)} | Maint ${r.maintenanceCost.toFixed(2)} | Ops ${r.operationalCost.toFixed(2)} | Rev ${r.revenue.toFixed(2)} | ROI ${r.roi ?? "n/a"}`
        );
      doc.moveDown(0.35);
    });

    doc.end();
  } catch (err) {
    return next(err);
  }
}

module.exports = { getAnalytics, exportCsv, exportPdf };
