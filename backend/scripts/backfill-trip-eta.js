const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function etaFromKm(km) {
  return Math.max(15, Math.round((Number(km) / 40) * 60));
}

async function main() {
  const trips = await prisma.trip.findMany({
    select: {
      id: true,
      tripCode: true,
      plannedDistance: true,
      etaMinutes: true,
      status: true,
      dispatchedAt: true,
    },
    orderBy: { tripCode: "asc" },
  });

  console.log(`Found ${trips.length} trips`);
  let updated = 0;

  for (const trip of trips) {
    const eta = etaFromKm(trip.plannedDistance);
    // Special demo value for one live trip if distance ~265
    const nextEta =
      trip.status === "DISPATCHED" &&
      Math.round(trip.plannedDistance) === 265
        ? 45
        : eta;

    if (trip.etaMinutes !== nextEta) {
      await prisma.trip.update({
        where: { id: trip.id },
        data: { etaMinutes: nextEta },
      });
      updated += 1;
      console.log(
        `${trip.tripCode || trip.id}: ${trip.etaMinutes ?? "null"} -> ${nextEta} min (${trip.plannedDistance} km)`
      );
    } else {
      console.log(`${trip.tripCode || trip.id}: already ${trip.etaMinutes} min`);
    }
  }

  console.log(`Updated ${updated} trips`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
