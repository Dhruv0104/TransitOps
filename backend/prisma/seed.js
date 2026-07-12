const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  // Remove old demo emails
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "driver@transitops.local",
          "admin@transitops.local",
          "fleet@transitops.local",
          "dispatcher@transitops.local",
          "safety@transitops.local",
          "finance@transitops.local",
        ],
      },
    },
  });

  const users = [
    {
      email: "dvpatel6048@gmail.com",
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
    },
    {
      email: "patelromil.surajnagar@gmail.com",
      name: "Fleet Manager",
      role: "FLEET_MANAGER",
      isActive: true,
    },
    {
      email: "nazneenpatel189@gmail.com",
      name: "Dispatcher",
      role: "DISPATCHER",
      isActive: true,
    },
    {
      email: "nehapatel200512@gmail.com",
      name: "Safety Officer",
      role: "SAFETY_OFFICER",
      isActive: true,
    },
    {
      email: "echoflex2024@gmail.com",
      name: "Financial Analyst",
      role: "FINANCIAL_ANALYST",
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
