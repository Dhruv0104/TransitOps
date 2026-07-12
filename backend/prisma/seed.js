const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const users = [
    {
      email: "fleet@transitops.local",
      name: "Fleet Manager",
      role: "FLEET_MANAGER",
    },
    {
      email: "driver@transitops.local",
      name: "Dispatch Driver",
      role: "DRIVER",
    },
    {
      email: "safety@transitops.local",
      name: "Safety Officer",
      role: "SAFETY_OFFICER",
    },
    {
      email: "finance@transitops.local",
      name: "Financial Analyst",
      role: "FINANCIAL_ANALYST",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password },
    });
  }

  console.log("Seeded demo users (password: password123)");
  users.forEach((u) => console.log(`  - ${u.email} [${u.role}]`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
