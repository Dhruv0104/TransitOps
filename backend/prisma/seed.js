const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  // Remove old demo email if present from earlier DRIVER role naming
  await prisma.user.deleteMany({
    where: { email: "driver@transitops.local" },
  });

  const users = [
    {
      email: "admin@transitops.local",
      name: "System Admin",
      role: "ADMIN",
      verified: true,
      isActive: true,
    },
    {
      email: "fleet@transitops.local",
      name: "Fleet Manager",
      role: "FLEET_MANAGER",
      verified: true,
      isActive: true,
    },
    {
      email: "dispatcher@transitops.local",
      name: "Dispatcher",
      role: "DISPATCHER",
      verified: true,
      isActive: true,
    },
    {
      email: "safety@transitops.local",
      name: "Safety Officer",
      role: "SAFETY_OFFICER",
      verified: true,
      isActive: true,
    },
    {
      email: "finance@transitops.local",
      name: "Financial Analyst",
      role: "FINANCIAL_ANALYST",
      verified: true,
      isActive: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        password,
        verified: user.verified,
        isActive: user.isActive,
      },
      create: { ...user, password },
    });
  }

  const orgCount = await prisma.organization.count();
  if (orgCount === 0) {
    await prisma.organization.create({
      data: {
        name: "TransitOps Fleet Co.",
        address: "100 Logistics Park, Ahmedabad",
        contactNo: "+91 98765 43210",
        email: "ops@transitops.local",
        depotName: "Ahmedabad Central Depot",
        distanceUnit: "km",
        currencyType: "INR",
        rbacConfig: [
          {
            role: "ADMIN",
            label: "Super Admin",
            dashboardAccess: true,
            editPermissions: true,
            deletePermissions: true,
          },
          {
            role: "FLEET_MANAGER",
            label: "Fleet Manager",
            dashboardAccess: true,
            editPermissions: true,
            deletePermissions: true,
          },
          {
            role: "DISPATCHER",
            label: "Dispatcher",
            dashboardAccess: true,
            editPermissions: true,
            deletePermissions: false,
          },
          {
            role: "SAFETY_OFFICER",
            label: "Safety Officer",
            dashboardAccess: true,
            editPermissions: true,
            deletePermissions: true,
          },
          {
            role: "FINANCIAL_ANALYST",
            label: "Financial Analyst",
            dashboardAccess: true,
            editPermissions: true,
            deletePermissions: false,
          },
        ],
      },
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
