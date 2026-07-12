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
        acc.fuelCost += r.fuelCost;
        acc.maintenanceCost += r.maintenanceCost;
        acc.fuelLiters += r.fuelLiters;
        return acc;
      },
      {
        operationalCost: 0,
        revenue: 0,
        distance: 0,
        fuelCost: 0,
        maintenanceCost: 0,
        fuelLiters: 0,
      }
    );

    const fleetUtilization = (() => {
      const active = rows.filter((r) => r.status !== "RETIRED");
      const onTrip = rows.filter((r) => r.status === "ON_TRIP").length;
      return active.length === 0
        ? 0
        : Math.round((onTrip / active.length) * 1000) / 10;
    })();

    const fuelEfficiency =
      totals.fuelLiters > 0
        ? Math.round((totals.distance / totals.fuelLiters) * 100) / 100
        : null;

    const org = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const currencyType = org?.currencyType || "INR";
    // PDF built-in fonts lack ₹ glyph — use Rs. for INR
    const currencyPrefix =
      currencyType === "INR"
        ? "Rs. "
        : currencyType === "USD"
          ? "$"
          : currencyType === "EUR"
            ? "EUR "
            : currencyType === "GBP"
              ? "GBP "
              : `${currencyType} `;

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      bufferPages: true,
      info: {
        Title: "TransitOps Fleet Report",
        Author: "TransitOps",
      },
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="transitops-report.pdf"'
    );
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - 55;

    const money = (n) => {
      const formatted = Number(n || 0).toLocaleString(
        currencyType === "INR" ? "en-IN" : "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      );
      return `${currencyPrefix}${formatted}`;
    };
    const num = (n, digits = 1) =>
      Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    const pct = (n) =>
      n == null ? "—" : `${(Number(n) * 100).toFixed(2)}%`;

    function ensureSpace(needed) {
      if (doc.y + needed > bottomLimit) {
        doc.addPage();
        drawHeaderBand();
        return true;
      }
      return false;
    }

    function drawHeaderBand() {
      doc.save();
      doc.rect(0, 0, pageWidth, 72).fill("#0f1419");
      doc
        .fillColor("#f97316")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("TransitOps", margin, 22, {
          width: contentWidth * 0.5,
          lineBreak: false,
        });
      doc
        .fillColor("#e8eef4")
        .font("Helvetica")
        .fontSize(11)
        .text("Fleet Analytics Report", margin, 44, {
          width: contentWidth * 0.55,
          lineBreak: false,
        });
      doc
        .fillColor("#8b98a8")
        .fontSize(8)
        .text(
          `Generated ${new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })} IST`,
          margin + contentWidth * 0.45,
          44,
          { width: contentWidth * 0.55, align: "right", lineBreak: false }
        );
      doc.restore();
      doc.x = margin;
      doc.y = 90;
    }

    function sectionTitle(title) {
      ensureSpace(36);
      const y = doc.y;
      doc
        .fillColor("#0f172a")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(title, margin, y, { width: contentWidth, lineBreak: false });
      doc
        .moveTo(margin, y + 16)
        .lineTo(margin + contentWidth, y + 16)
        .strokeColor("#f97316")
        .lineWidth(1.5)
        .stroke();
      doc.x = margin;
      doc.y = y + 26;
    }

    function drawSummaryCards() {
      const cards = [
        { label: "Vehicles", value: String(rows.length) },
        { label: "Fleet Utilization", value: `${fleetUtilization}%` },
        {
          label: "Fuel Efficiency",
          value: fuelEfficiency != null ? `${fuelEfficiency} km/L` : "—",
        },
        { label: "Total Distance", value: `${num(totals.distance)} km` },
        { label: "Operational Cost", value: money(totals.operationalCost) },
        { label: "Total Revenue", value: money(totals.revenue) },
      ];

      const gap = 10;
      const cols = 3;
      const cardW = (contentWidth - gap * (cols - 1)) / cols;
      const cardH = 52;
      const rowsUsed = Math.ceil(cards.length / cols);
      ensureSpace(rowsUsed * (cardH + gap) + 8);

      const startY = doc.y;
      cards.forEach((card, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + col * (cardW + gap);
        const y = startY + row * (cardH + gap);

        doc.roundedRect(x, y, cardW, cardH, 6).fill("#f8fafc");
        doc.roundedRect(x, y, cardW, cardH, 6).strokeColor("#e2e8f0").lineWidth(1).stroke();
        doc
          .fillColor("#64748b")
          .font("Helvetica")
          .fontSize(8)
          .text(card.label.toUpperCase(), x + 10, y + 12, {
            width: cardW - 20,
            lineBreak: false,
          });
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(card.value, x + 10, y + 28, {
            width: cardW - 20,
            lineBreak: false,
          });
      });

      doc.x = margin;
      doc.y = startY + rowsUsed * (cardH + gap) + 4;
    }

    // Vehicle table columns (A4 usable ~515pt)
    const columns = [
      { key: "no", label: "#", width: 22, align: "left" },
      { key: "vehicle", label: "Vehicle", width: 118, align: "left" },
      { key: "status", label: "Status", width: 58, align: "left" },
      { key: "distance", label: "Dist (km)", width: 52, align: "right" },
      { key: "fuel", label: "Fuel", width: 52, align: "right" },
      { key: "maint", label: "Maint.", width: 52, align: "right" },
      { key: "ops", label: "Ops Cost", width: 58, align: "right" },
      { key: "rev", label: "Revenue", width: 58, align: "right" },
      { key: "roi", label: "ROI", width: 45, align: "right" },
    ];

    function cellValue(r, index, key) {
      switch (key) {
        case "no":
          return String(index + 1);
        case "vehicle":
          return `${r.registrationNo}\n${r.name}`;
        case "status":
          return String(r.status || "").replaceAll("_", " ");
        case "distance":
          return num(r.distance, 1);
        case "fuel":
          return num(r.fuelCost, 0);
        case "maint":
          return num(r.maintenanceCost, 0);
        case "ops":
          return num(r.operationalCost, 0);
        case "rev":
          return num(r.revenue, 0);
        case "roi":
          return pct(r.roi);
        default:
          return "";
      }
    }

    function drawTableHeader(y) {
      doc.save();
      doc.rect(margin, y, contentWidth, 22).fill("#1e293b");
      let x = margin;
      columns.forEach((col) => {
        doc
          .fillColor("#f8fafc")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(col.label, x + 4, y + 7, {
            width: col.width - 8,
            align: col.align,
            lineBreak: false,
          });
        x += col.width;
      });
      doc.restore();
      doc.x = margin;
      return y + 22;
    }

    function measureRowHeight(r, index) {
      const vehicleText = cellValue(r, index, "vehicle");
      doc.font("Helvetica-Bold").fontSize(8);
      const vehicleHeight = doc.heightOfString(vehicleText, {
        width: columns[1].width - 8,
        lineGap: 2,
      });
      return Math.max(30, vehicleHeight + 14);
    }

    function drawTableRow(r, index, y) {
      const padY = 7;
      const rowHeight = measureRowHeight(r, index);

      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        drawHeaderBand();
        sectionTitle("Vehicle Performance (continued)");
        y = drawTableHeader(doc.y);
      }

      if (index % 2 === 0) {
        doc.save();
        doc.rect(margin, y, contentWidth, rowHeight).fill("#f8fafc");
        doc.restore();
      }

      let x = margin;
      columns.forEach((col) => {
        const value = cellValue(r, index, col.key);
        const isVehicle = col.key === "vehicle";
        doc
          .fillColor(isVehicle ? "#0f172a" : "#334155")
          .font(isVehicle || col.key === "no" ? "Helvetica-Bold" : "Helvetica")
          .fontSize(isVehicle ? 8 : 7.5)
          .text(value, x + 4, y + padY, {
            width: col.width - 8,
            align: col.align,
            lineGap: 2,
            height: rowHeight - padY,
          });
        x += col.width;
      });

      doc
        .moveTo(margin, y + rowHeight)
        .lineTo(margin + contentWidth, y + rowHeight)
        .strokeColor("#e2e8f0")
        .lineWidth(0.5)
        .stroke();

      doc.x = margin;
      return y + rowHeight;
    }

    function drawTotalsRow(y) {
      const rowHeight = 28;
      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        drawHeaderBand();
        y = doc.y;
      }

      doc.save();
      doc.rect(margin, y, contentWidth, rowHeight).fill("#fff7ed");
      doc
        .moveTo(margin, y)
        .lineTo(margin + contentWidth, y)
        .strokeColor("#fdba74")
        .lineWidth(1)
        .stroke();
      doc.restore();

      const totalsCells = [
        { width: 22 + 118 + 58, text: "TOTAL", align: "left" },
        { width: 52, text: num(totals.distance, 1), align: "right" },
        { width: 52, text: num(totals.fuelCost, 0), align: "right" },
        { width: 52, text: num(totals.maintenanceCost, 0), align: "right" },
        { width: 58, text: num(totals.operationalCost, 0), align: "right" },
        { width: 58, text: num(totals.revenue, 0), align: "right" },
        { width: 45, text: "", align: "right" },
      ];

      let x = margin;
      totalsCells.forEach((cell) => {
        doc
          .fillColor("#9a3412")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(cell.text, x + 4, y + 9, {
            width: cell.width - 8,
            align: cell.align,
            lineBreak: false,
          });
        x += cell.width;
      });

      doc.x = margin;
      return y + rowHeight + 10;
    }

    function drawCostBreakdown() {
      ensureSpace(120);
      sectionTitle("Cost Breakdown");
      const items = [
        ["Fuel cost", money(totals.fuelCost)],
        ["Maintenance cost", money(totals.maintenanceCost)],
        ["Operational cost (fuel + maintenance)", money(totals.operationalCost)],
        ["Gross revenue", money(totals.revenue)],
        [
          "Net (revenue − ops)",
          money(totals.revenue - totals.operationalCost),
        ],
      ];

      items.forEach(([label, value], i) => {
        const y = doc.y;
        if (i % 2 === 0) {
          doc.save();
          doc.rect(margin, y, contentWidth, 20).fill("#f8fafc");
          doc.restore();
        }
        doc
          .fillColor("#475569")
          .font("Helvetica")
          .fontSize(9)
          .text(label, margin + 8, y + 5, {
            width: contentWidth * 0.58,
            lineBreak: false,
          });
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(value, margin + contentWidth * 0.58, y + 5, {
            width: contentWidth * 0.42 - 8,
            align: "right",
            lineBreak: false,
          });
        doc.x = margin;
        doc.y = y + 20;
      });
    }

    function stampPageNumbers() {
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        const footerY = pageHeight - 32;
        doc
          .moveTo(margin, footerY - 8)
          .lineTo(margin + contentWidth, footerY - 8)
          .strokeColor("#e2e8f0")
          .lineWidth(0.6)
          .stroke();
        doc
          .fillColor("#94a3b8")
          .font("Helvetica")
          .fontSize(8)
          .text("TransitOps — Confidential fleet report", margin, footerY, {
            width: contentWidth / 2,
            lineBreak: false,
          });
        doc.text(`Page ${i + 1} of ${range.count}`, margin, footerY, {
          width: contentWidth,
          align: "right",
          lineBreak: false,
        });
      }
    }

    // --- Build document ---
    drawHeaderBand();
    sectionTitle("Executive Summary");
    drawSummaryCards();

    sectionTitle("Vehicle Performance");
    let tableY = drawTableHeader(doc.y);
    rows.forEach((r, i) => {
      tableY = drawTableRow(r, i, tableY);
    });
    tableY = drawTotalsRow(tableY);
    doc.y = tableY;

    drawCostBreakdown();

    ensureSpace(40);
    doc
      .fillColor("#94a3b8")
      .font("Helvetica")
      .fontSize(8)
      .text(
        `Notes: ROI = (Revenue − Operational Cost) / Acquisition Cost. Operational cost includes fuel and maintenance only. All amounts in ${currencyType}.`,
        margin,
        doc.y + 12,
        { width: contentWidth }
      );

    stampPageNumbers();
    doc.end();
  } catch (err) {
    return next(err);
  }
}

module.exports = { getAnalytics, exportCsv, exportPdf };
