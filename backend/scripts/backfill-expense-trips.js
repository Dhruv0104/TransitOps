const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const expenses = await prisma.expense.findMany({ where: { tripId: null } });
  const trips = await prisma.trip.findMany({
    select: { id: true, vehicleId: true, createdAt: true },
  });
  let linked = 0;
  for (const exp of expenses) {
    const candidates = trips.filter((t) => t.vehicleId === exp.vehicleId);
    if (!candidates.length) continue;
    const target = new Date(exp.date).getTime();
    const best = candidates
      .slice()
      .sort(
        (a, b) =>
          Math.abs(new Date(a.createdAt).getTime() - target) -
          Math.abs(new Date(b.createdAt).getTime() - target)
      )[0];
    await prisma.expense.update({
      where: { id: exp.id },
      data: { tripId: best.id },
    });
    linked += 1;
  }
  console.log(`Linked ${linked} of ${expenses.length} expenses without trip`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
