const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/** Days from today (negative = past) */
function daysFromNow(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

const DEFAULT_RBAC = [
  {
    role: "FLEET_MANAGER",
    label: "Fleet Manager",
    fleet: "full",
    drivers: "full",
    trips: "none",
    fuel: "none",
    analytics: "full",
  },
  {
    role: "DISPATCHER",
    label: "Dispatcher",
    fleet: "view",
    drivers: "none",
    trips: "full",
    fuel: "none",
    analytics: "none",
  },
  {
    role: "SAFETY_OFFICER",
    label: "Safety Officer",
    fleet: "none",
    drivers: "full",
    trips: "view",
    fuel: "none",
    analytics: "none",
  },
  {
    role: "FINANCIAL_ANALYST",
    label: "Financial Analyst",
    fleet: "view",
    drivers: "none",
    trips: "none",
    fuel: "full",
    analytics: "full",
  },
];

async function main() {
  const password = await bcrypt.hash("password123", 10);

  // --- Users (Gujarat team) ---
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
      name: "Dhruv Patel",
      role: "ADMIN",
      isActive: true,
    },
    {
      email: "patelromil.surajnagar@gmail.com",
      name: "Romil Patel",
      role: "FLEET_MANAGER",
      isActive: true,
    },
    {
      email: "nazneenpatel189@gmail.com",
      name: "Nazneen Patel",
      role: "DISPATCHER",
      isActive: true,
    },
    {
      email: "nehapatel200512@gmail.com",
      name: "Neha Patel",
      role: "SAFETY_OFFICER",
      isActive: true,
    },
    {
      email: "echoflex2024@gmail.com",
      name: "Karan Shah",
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

  // --- Organization (Ahmedabad HQ) ---
  const existingOrg = await prisma.organization.findFirst();
  const orgData = {
    name: "Gujarat Transit Logistics Pvt. Ltd.",
    address: "Plot 42, GIDC Logistics Park, Naroda, Ahmedabad, Gujarat 382330",
    contactNo: "+91 79 2658 4410",
    email: "ops@gujarattransit.in",
    depotName: "Naroda Central Depot",
    distanceUnit: "km",
    currencyType: "INR",
    rbacConfig: DEFAULT_RBAC,
  };
  if (existingOrg) {
    await prisma.organization.update({
      where: { id: existingOrg.id },
      data: orgData,
    });
  } else {
    await prisma.organization.create({ data: orgData });
  }

  // --- Wipe operational data for a clean demo dataset ---
  await prisma.vehicleDocument.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();

  // --- Drivers (Gujarati names, GJ licenses) ---
  const driverDefs = [
    {
      name: "Jayesh Patel",
      email: "jayesh.patel@gujarattransit.in",
      licenseNumber: "GJ0120190012345",
      licenseCategory: "HMV",
      licenseExpiry: daysFromNow(420),
      contactNumber: "+91 98250 11201",
      safetyScore: 96,
      status: "ON_TRIP",
    },
    {
      name: "Mehul Shah",
      email: "mehul.shah@gujarattransit.in",
      licenseNumber: "GJ0520180045678",
      licenseCategory: "HMV",
      licenseExpiry: daysFromNow(18), // expiring soon — Safety alerts
      contactNumber: "+91 98795 22334",
      safetyScore: 88,
      status: "ON_TRIP",
    },
    {
      name: "Kiran Desai",
      email: "kiran.desai@gujarattransit.in",
      licenseNumber: "GJ0620200078901",
      licenseCategory: "LMV",
      licenseExpiry: daysFromNow(300),
      contactNumber: "+91 99099 33445",
      safetyScore: 92,
      status: "AVAILABLE",
    },
    {
      name: "Hardik Trivedi",
      email: "hardik.trivedi@gujarattransit.in",
      licenseNumber: "GJ0320170023456",
      licenseCategory: "HMV",
      licenseExpiry: daysFromNow(-12), // expired — Safety alerts
      contactNumber: "+91 97277 44556",
      safetyScore: 71,
      status: "SUSPENDED",
    },
    {
      name: "Ramesh Solanki",
      email: "ramesh.solanki@gujarattransit.in",
      licenseNumber: "GJ0120210089012",
      licenseCategory: "LMV",
      licenseExpiry: daysFromNow(510),
      contactNumber: "+91 98240 55667",
      safetyScore: 94,
      status: "AVAILABLE",
    },
    {
      name: "Priya Joshi",
      email: "priya.joshi@gujarattransit.in",
      licenseNumber: "GJ1820190034567",
      licenseCategory: "LMV",
      licenseExpiry: daysFromNow(25), // expiring soon
      contactNumber: "+91 96876 66778",
      safetyScore: 98,
      status: "AVAILABLE",
    },
    {
      name: "Nikhil Mehta",
      email: "nikhil.mehta@gujarattransit.in",
      licenseNumber: "GJ0520220011223",
      licenseCategory: "HMV",
      licenseExpiry: daysFromNow(640),
      contactNumber: "+91 98980 77889",
      safetyScore: 90,
      status: "OFF_DUTY",
    },
    {
      name: "Bhavesh Parmar",
      email: "bhavesh.parmar@gujarattransit.in",
      licenseNumber: "GJ1620200056789",
      licenseCategory: "HMV",
      licenseExpiry: daysFromNow(280),
      contactNumber: "+91 94270 88990",
      safetyScore: 85,
      status: "AVAILABLE",
    },
    {
      name: "Ankit Chauhan",
      email: "ankit.chauhan@gujarattransit.in",
      licenseNumber: "GJ1220210067890",
      licenseCategory: "HMV",
      licenseExpiry: daysFromNow(190),
      contactNumber: "+91 93762 99001",
      safetyScore: 91,
      status: "AVAILABLE",
    },
    {
      name: "Deepak Raval",
      email: "deepak.raval@gujarattransit.in",
      licenseNumber: "GJ2720180090123",
      licenseCategory: "LMV",
      licenseExpiry: daysFromNow(365),
      contactNumber: "+91 98253 10112",
      safetyScore: 87,
      status: "AVAILABLE",
    },
    {
      name: "Suresh Gohil",
      email: "suresh.gohil@gujarattransit.in",
      licenseNumber: "GJ0420190044556",
      licenseCategory: "HMV",
      licenseExpiry: daysFromNow(450),
      contactNumber: "+91 98791 21223",
      safetyScore: 93,
      status: "AVAILABLE",
    },
    {
      name: "Chirag Pandya",
      email: "chirag.pandya@gujarattransit.in",
      licenseNumber: "GJ2320210077889",
      licenseCategory: "LMV",
      licenseExpiry: daysFromNow(8), // expiring very soon
      contactNumber: "+91 97129 32334",
      safetyScore: 89,
      status: "AVAILABLE",
    },
  ];

  const drivers = [];
  for (const d of driverDefs) {
    drivers.push(await prisma.driver.create({ data: d }));
  }
  const byName = Object.fromEntries(drivers.map((d) => [d.name, d]));

  // --- Vehicles (GJ plates + popular Indian LCV/HCV models) ---
  const vehicleDefs = [
    {
      registrationNo: "GJ-01-AB-4521",
      name: "Tata Ace Gold",
      type: "Van",
      maxLoadKg: 750,
      odometer: 48210,
      acquisitionCost: 685000,
      status: "ON_TRIP",
      region: "Ahmedabad",
    },
    {
      registrationNo: "GJ-05-CD-8812",
      name: "Mahindra Bolero Pickup",
      type: "Pickup",
      maxLoadKg: 1700,
      odometer: 61540,
      acquisitionCost: 925000,
      status: "ON_TRIP",
      region: "Surat",
    },
    {
      registrationNo: "GJ-06-EF-3344",
      name: "Ashok Leyland Dost",
      type: "LCV",
      maxLoadKg: 1250,
      odometer: 39820,
      acquisitionCost: 810000,
      status: "AVAILABLE",
      region: "Vadodara",
    },
    {
      registrationNo: "GJ-03-GH-7765",
      name: "Eicher Pro 2049",
      type: "Truck",
      maxLoadKg: 7500,
      odometer: 112400,
      acquisitionCost: 1850000,
      status: "AVAILABLE",
      region: "Rajkot",
    },
    {
      registrationNo: "GJ-18-IJ-2201",
      name: "Tata 407 Gold",
      type: "Truck",
      maxLoadKg: 3500,
      odometer: 87450,
      acquisitionCost: 1420000,
      status: "IN_SHOP",
      region: "Gandhinagar",
    },
    {
      registrationNo: "GJ-01-KL-9090",
      name: "Force Traveller 3350",
      type: "Van",
      maxLoadKg: 1200,
      odometer: 52100,
      acquisitionCost: 1680000,
      status: "AVAILABLE",
      region: "Ahmedabad",
    },
    {
      registrationNo: "GJ-27-MN-1188",
      name: "Maruti Super Carry",
      type: "Van",
      maxLoadKg: 740,
      odometer: 28650,
      acquisitionCost: 595000,
      status: "AVAILABLE",
      region: "Ahmedabad East",
    },
    {
      registrationNo: "GJ-16-OP-5543",
      name: "Mahindra Furio 7",
      type: "Truck",
      maxLoadKg: 7000,
      odometer: 95600,
      acquisitionCost: 2100000,
      status: "AVAILABLE",
      region: "Bharuch",
    },
    {
      registrationNo: "GJ-12-QR-6677",
      name: "BharatBenz 1217R",
      type: "Truck",
      maxLoadKg: 12000,
      odometer: 148200,
      acquisitionCost: 2850000,
      status: "AVAILABLE",
      region: "Bhuj",
    },
    {
      registrationNo: "GJ-23-ST-4410",
      name: "Tata Ultra 1518",
      type: "Truck",
      maxLoadKg: 10000,
      odometer: 133800,
      acquisitionCost: 2650000,
      status: "AVAILABLE",
      region: "Anand",
    },
    {
      registrationNo: "GJ-04-UV-3322",
      name: "Isuzu D-Max S-CAB",
      type: "Pickup",
      maxLoadKg: 1000,
      odometer: 41200,
      acquisitionCost: 1150000,
      status: "AVAILABLE",
      region: "Bhavnagar",
    },
    {
      registrationNo: "GJ-10-WX-1001",
      name: "Ashok Leyland Partner",
      type: "LCV",
      maxLoadKg: 2500,
      odometer: 189400,
      acquisitionCost: 980000,
      status: "RETIRED",
      region: "Jamnagar",
    },
  ];

  const vehicles = [];
  for (const v of vehicleDefs) {
    vehicles.push(await prisma.vehicle.create({ data: v }));
  }
  const byReg = Object.fromEntries(vehicles.map((v) => [v.registrationNo, v]));

  // Helper refs
  const v = (reg) => byReg[reg];
  const d = (name) => byName[name];

  // --- Trips (Gujarat corridors) ---
  // Completed trips drive reports / charts; a few live / draft for ops screens.
  const completedTrips = [
    {
      source: "Ahmedabad, Gujarat",
      destination: "Surat, Gujarat",
      cargoWeightKg: 620,
      plannedDistance: 265,
      actualDistance: 272,
      fuelConsumed: 38,
      revenue: 18500,
      vehicle: "GJ-01-AB-4521",
      driver: "Ramesh Solanki",
      daysAgo: 45,
      odoEnd: 42100,
    },
    {
      source: "Surat, Gujarat",
      destination: "Vadodara, Gujarat",
      cargoWeightKg: 1400,
      plannedDistance: 150,
      actualDistance: 148,
      fuelConsumed: 22,
      revenue: 12200,
      vehicle: "GJ-05-CD-8812",
      driver: "Mehul Shah",
      daysAgo: 40,
      odoEnd: 54800,
    },
    {
      source: "Vadodara, Gujarat",
      destination: "Rajkot, Gujarat",
      cargoWeightKg: 980,
      plannedDistance: 280,
      actualDistance: 285,
      fuelConsumed: 41,
      revenue: 16800,
      vehicle: "GJ-06-EF-3344",
      driver: "Kiran Desai",
      daysAgo: 36,
      odoEnd: 35200,
    },
    {
      source: "Ahmedabad, Gujarat",
      destination: "Gandhinagar, Gujarat",
      cargoWeightKg: 450,
      plannedDistance: 32,
      actualDistance: 34,
      fuelConsumed: 5,
      revenue: 4200,
      vehicle: "GJ-01-KL-9090",
      driver: "Priya Joshi",
      daysAgo: 32,
      odoEnd: 48900,
    },
    {
      source: "Mundra Port, Gujarat",
      destination: "Ahmedabad, Gujarat",
      cargoWeightKg: 8500,
      plannedDistance: 380,
      actualDistance: 392,
      fuelConsumed: 78,
      revenue: 42000,
      vehicle: "GJ-12-QR-6677",
      driver: "Ankit Chauhan",
      daysAgo: 28,
      odoEnd: 142000,
    },
    {
      source: "Anand, Gujarat",
      destination: "Surat, Gujarat",
      cargoWeightKg: 7200,
      plannedDistance: 195,
      actualDistance: 201,
      fuelConsumed: 45,
      revenue: 24500,
      vehicle: "GJ-23-ST-4410",
      driver: "Suresh Gohil",
      daysAgo: 24,
      odoEnd: 128500,
    },
    {
      source: "Bharuch, Gujarat",
      destination: "Ahmedabad, Gujarat",
      cargoWeightKg: 5100,
      plannedDistance: 185,
      actualDistance: 190,
      fuelConsumed: 42,
      revenue: 21000,
      vehicle: "GJ-16-OP-5543",
      driver: "Bhavesh Parmar",
      daysAgo: 20,
      odoEnd: 91000,
    },
    {
      source: "Rajkot, Gujarat",
      destination: "Jamnagar, Gujarat",
      cargoWeightKg: 4200,
      plannedDistance: 95,
      actualDistance: 98,
      fuelConsumed: 18,
      revenue: 9800,
      vehicle: "GJ-03-GH-7765",
      driver: "Nikhil Mehta",
      daysAgo: 16,
      odoEnd: 108800,
    },
    {
      source: "Bhavnagar, Gujarat",
      destination: "Ahmedabad, Gujarat",
      cargoWeightKg: 780,
      plannedDistance: 170,
      actualDistance: 175,
      fuelConsumed: 24,
      revenue: 11200,
      vehicle: "GJ-04-UV-3322",
      driver: "Deepak Raval",
      daysAgo: 12,
      odoEnd: 39800,
    },
    {
      source: "Sanand, Gujarat",
      destination: "Vadodara, Gujarat",
      cargoWeightKg: 680,
      plannedDistance: 110,
      actualDistance: 114,
      fuelConsumed: 16,
      revenue: 8900,
      vehicle: "GJ-27-MN-1188",
      driver: "Chirag Pandya",
      daysAgo: 9,
      odoEnd: 27400,
    },
    {
      source: "Kandla Port, Gujarat",
      destination: "Gandhinagar, Gujarat",
      cargoWeightKg: 9200,
      plannedDistance: 340,
      actualDistance: 348,
      fuelConsumed: 72,
      revenue: 38500,
      vehicle: "GJ-12-QR-6677",
      driver: "Ankit Chauhan",
      daysAgo: 6,
      odoEnd: 148200,
    },
    {
      source: "Mehsana, Gujarat",
      destination: "Ahmedabad, Gujarat",
      cargoWeightKg: 520,
      plannedDistance: 75,
      actualDistance: 78,
      fuelConsumed: 11,
      revenue: 6400,
      vehicle: "GJ-01-AB-4521",
      driver: "Jayesh Patel",
      daysAgo: 4,
      odoEnd: 47800,
    },
    {
      source: "Morbi, Gujarat",
      destination: "Rajkot, Gujarat",
      cargoWeightKg: 3100,
      plannedDistance: 70,
      actualDistance: 72,
      fuelConsumed: 14,
      revenue: 7600,
      vehicle: "GJ-03-GH-7765",
      driver: "Nikhil Mehta",
      daysAgo: 2,
      odoEnd: 112400,
    },
    {
      source: "Nadiad, Gujarat",
      destination: "Anand, Gujarat",
      cargoWeightKg: 880,
      plannedDistance: 28,
      actualDistance: 30,
      fuelConsumed: 4.5,
      revenue: 3500,
      vehicle: "GJ-06-EF-3344",
      driver: "Kiran Desai",
      daysAgo: 1,
      odoEnd: 39820,
    },
  ];

  let tripSeq = 0;
  function nextSeedTripCode() {
    tripSeq += 1;
    return `TRP${String(tripSeq).padStart(3, "0")}`;
  }

  function etaFromKm(km) {
    return Math.max(15, Math.round((Number(km) / 40) * 60));
  }

  for (const t of completedTrips) {
    const vehicle = v(t.vehicle);
    const driver = d(t.driver);
    const createdAt = daysFromNow(-t.daysAgo);
    const dispatchedAt = daysFromNow(-(t.daysAgo - 0.1));
    const completedAt = daysFromNow(-(t.daysAgo - 0.4));
    await prisma.trip.create({
      data: {
        tripCode: nextSeedTripCode(),
        source: t.source,
        destination: t.destination,
        cargoWeightKg: t.cargoWeightKg,
        plannedDistance: t.plannedDistance,
        actualDistance: t.actualDistance,
        fuelConsumed: t.fuelConsumed,
        finalOdometer: t.odoEnd,
        revenue: t.revenue,
        etaMinutes: etaFromKm(t.plannedDistance),
        status: "COMPLETED",
        vehicleId: vehicle.id,
        driverId: driver.id,
        createdAt,
        dispatchedAt,
        completedAt,
        updatedAt: completedAt,
      },
    });
  }

  // Active dispatched trips (match ON_TRIP vehicle/driver)
  await prisma.trip.create({
    data: {
      tripCode: nextSeedTripCode(),
      source: "Ahmedabad, Gujarat",
      destination: "Surat, Gujarat",
      cargoWeightKg: 580,
      plannedDistance: 265,
      revenue: 17200,
      etaMinutes: 45,
      status: "DISPATCHED",
      vehicleId: v("GJ-01-AB-4521").id,
      driverId: d("Jayesh Patel").id,
      createdAt: daysFromNow(-1),
      dispatchedAt: daysFromNow(-0.02),
    },
  });

  await prisma.trip.create({
    data: {
      tripCode: nextSeedTripCode(),
      source: "Surat, Gujarat",
      destination: "Mundra Port, Gujarat",
      cargoWeightKg: 1550,
      plannedDistance: 420,
      revenue: 28500,
      etaMinutes: etaFromKm(420),
      status: "DISPATCHED",
      vehicleId: v("GJ-05-CD-8812").id,
      driverId: d("Mehul Shah").id,
      createdAt: daysFromNow(0),
      dispatchedAt: daysFromNow(0),
    },
  });

  // Drafts pending dispatch
  await prisma.trip.create({
    data: {
      tripCode: nextSeedTripCode(),
      source: "Vadodara, Gujarat",
      destination: "Bharuch, Gujarat",
      cargoWeightKg: 900,
      plannedDistance: 75,
      revenue: 6800,
      etaMinutes: etaFromKm(75),
      status: "DRAFT",
      vehicleId: v("GJ-06-EF-3344").id,
      driverId: d("Kiran Desai").id,
    },
  });

  await prisma.trip.create({
    data: {
      tripCode: nextSeedTripCode(),
      source: "Gandhinagar, Gujarat",
      destination: "Mehsana, Gujarat",
      cargoWeightKg: 400,
      plannedDistance: 55,
      revenue: 5100,
      etaMinutes: 45,
      status: "DRAFT",
      vehicleId: v("GJ-27-MN-1188").id,
      driverId: d("Priya Joshi").id,
    },
  });

  await prisma.trip.create({
    data: {
      tripCode: nextSeedTripCode(),
      source: "Rajkot, Gujarat",
      destination: "Bhavnagar, Gujarat",
      cargoWeightKg: 2800,
      plannedDistance: 185,
      revenue: 14500,
      etaMinutes: etaFromKm(185),
      status: "CANCELLED",
      vehicleId: v("GJ-03-GH-7765").id,
      driverId: d("Suresh Gohil").id,
      createdAt: daysFromNow(-10),
      cancelledAt: daysFromNow(-9),
    },
  });

  // --- Maintenance ---
  await prisma.maintenanceLog.createMany({
    data: [
      {
        vehicleId: v("GJ-18-IJ-2201").id,
        description: "Clutch plate replacement & gearbox oil change — Naroda workshop",
        cost: 28500,
        isActive: true,
        startedAt: daysFromNow(-3),
      },
      {
        vehicleId: v("GJ-03-GH-7765").id,
        description: "Brake pad & disc service after Rajkot–Jamnagar run",
        cost: 12400,
        isActive: false,
        startedAt: daysFromNow(-18),
        closedAt: daysFromNow(-15),
      },
      {
        vehicleId: v("GJ-12-QR-6677").id,
        description: "Tyre replacement (rear axle) before Mundra haul",
        cost: 42000,
        isActive: false,
        startedAt: daysFromNow(-30),
        closedAt: daysFromNow(-28),
      },
      {
        vehicleId: v("GJ-16-OP-5543").id,
        description: "AC compressor repair — summer prep",
        cost: 18600,
        isActive: false,
        startedAt: daysFromNow(-22),
        closedAt: daysFromNow(-20),
      },
      {
        vehicleId: v("GJ-01-AB-4521").id,
        description: "Periodic service — engine oil, filters, alignment",
        cost: 6500,
        isActive: false,
        startedAt: daysFromNow(-50),
        closedAt: daysFromNow(-49),
      },
      {
        vehicleId: v("GJ-05-CD-8812").id,
        description: "Battery replacement & electrical check",
        cost: 9800,
        isActive: false,
        startedAt: daysFromNow(-35),
        closedAt: daysFromNow(-34),
      },
    ],
  });

  // --- Fuel logs (INR, ~₹92/L diesel) ---
  const fuelPrice = 92;
  const fuelEntries = [
    { reg: "GJ-01-AB-4521", liters: 38, daysAgo: 45 },
    { reg: "GJ-01-AB-4521", liters: 28, daysAgo: 20 },
    { reg: "GJ-01-AB-4521", liters: 32, daysAgo: 4 },
    { reg: "GJ-05-CD-8812", liters: 22, daysAgo: 40 },
    { reg: "GJ-05-CD-8812", liters: 40, daysAgo: 14 },
    { reg: "GJ-05-CD-8812", liters: 35, daysAgo: 1 },
    { reg: "GJ-06-EF-3344", liters: 41, daysAgo: 36 },
    { reg: "GJ-06-EF-3344", liters: 25, daysAgo: 8 },
    { reg: "GJ-03-GH-7765", liters: 18, daysAgo: 16 },
    { reg: "GJ-03-GH-7765", liters: 55, daysAgo: 2 },
    { reg: "GJ-18-IJ-2201", liters: 48, daysAgo: 25 },
    { reg: "GJ-01-KL-9090", liters: 30, daysAgo: 32 },
    { reg: "GJ-01-KL-9090", liters: 22, daysAgo: 11 },
    { reg: "GJ-27-MN-1188", liters: 16, daysAgo: 9 },
    { reg: "GJ-16-OP-5543", liters: 42, daysAgo: 20 },
    { reg: "GJ-16-OP-5543", liters: 50, daysAgo: 7 },
    { reg: "GJ-12-QR-6677", liters: 78, daysAgo: 28 },
    { reg: "GJ-12-QR-6677", liters: 72, daysAgo: 6 },
    { reg: "GJ-23-ST-4410", liters: 45, daysAgo: 24 },
    { reg: "GJ-23-ST-4410", liters: 38, daysAgo: 5 },
    { reg: "GJ-04-UV-3322", liters: 24, daysAgo: 12 },
  ];

  await prisma.fuelLog.createMany({
    data: fuelEntries.map((f) => ({
      vehicleId: v(f.reg).id,
      liters: f.liters,
      cost: Math.round(f.liters * fuelPrice),
      date: daysFromNow(-f.daysAgo),
    })),
  });

  // --- Other expenses (tolls, parking, misc on Gujarat highways) ---
  await prisma.expense.createMany({
    data: [
      {
        vehicleId: v("GJ-01-AB-4521").id,
        type: "TOLL",
        amount: 485,
        description: "NE-1 Ahmedabad–Vadodara expressway toll",
        date: daysFromNow(-45),
      },
      {
        vehicleId: v("GJ-01-AB-4521").id,
        type: "TOLL",
        amount: 320,
        description: "Ahmedabad–Surat NH-48 toll plazas",
        date: daysFromNow(-4),
      },
      {
        vehicleId: v("GJ-05-CD-8812").id,
        type: "TOLL",
        amount: 890,
        description: "Surat–Mundra corridor tolls",
        date: daysFromNow(0),
      },
      {
        vehicleId: v("GJ-12-QR-6677").id,
        type: "TOLL",
        amount: 1250,
        description: "Mundra Port approach + NH tolls",
        date: daysFromNow(-28),
      },
      {
        vehicleId: v("GJ-12-QR-6677").id,
        type: "TOLL",
        amount: 1100,
        description: "Kandla–Gandhinagar haul tolls",
        date: daysFromNow(-6),
      },
      {
        vehicleId: v("GJ-16-OP-5543").id,
        type: "TOLL",
        amount: 410,
        description: "Bharuch–Ahmedabad NH-48",
        date: daysFromNow(-20),
      },
      {
        vehicleId: v("GJ-03-GH-7765").id,
        type: "TOLL",
        amount: 180,
        description: "Rajkot–Jamnagar state highway toll",
        date: daysFromNow(-16),
      },
      {
        vehicleId: v("GJ-01-KL-9090").id,
        type: "OTHER",
        amount: 250,
        description: "Sabarmati Riverfront parking — client drop",
        date: daysFromNow(-32),
      },
      {
        vehicleId: v("GJ-27-MN-1188").id,
        type: "OTHER",
        amount: 180,
        description: "Sanand GIDC gate / parking charges",
        date: daysFromNow(-9),
      },
      {
        vehicleId: v("GJ-23-ST-4410").id,
        type: "OTHER",
        amount: 600,
        description: "Anand milk plant loading bay fee",
        date: daysFromNow(-24),
      },
      {
        vehicleId: v("GJ-18-IJ-2201").id,
        type: "MAINTENANCE",
        amount: 3500,
        description: "Emergency roadside assistance — Chiloda",
        date: daysFromNow(-3),
      },
      {
        vehicleId: v("GJ-04-UV-3322").id,
        type: "OTHER",
        amount: 400,
        description: "Bhavnagar port weighbridge charges",
        date: daysFromNow(-12),
      },
      {
        vehicleId: v("GJ-06-EF-3344").id,
        type: "TOLL",
        amount: 540,
        description: "Vadodara–Rajkot corridor tolls",
        date: daysFromNow(-36),
      },
      {
        vehicleId: v("GJ-05-CD-8812").id,
        type: "OTHER",
        amount: 320,
        description: "Surat textile market overnight parking",
        date: daysFromNow(-14),
      },
    ],
  });

  // Document metadata only (no binary files) — useful for Vehicles → Docs UI
  await prisma.vehicleDocument.createMany({
    data: [
      {
        vehicleId: v("GJ-01-AB-4521").id,
        title: "Registration Certificate — GJ-01-AB-4521",
        docType: "RC",
        fileName: "rc-gj01ab4521.pdf",
        storedName: "seed-rc-gj01ab4521.pdf",
        mimeType: "application/pdf",
        expiresAt: daysFromNow(800),
      },
      {
        vehicleId: v("GJ-01-AB-4521").id,
        title: "Insurance — Tata Ace Gold",
        docType: "INSURANCE",
        fileName: "insurance-ace-gold.pdf",
        storedName: "seed-insurance-ace.pdf",
        mimeType: "application/pdf",
        expiresAt: daysFromNow(120),
      },
      {
        vehicleId: v("GJ-05-CD-8812").id,
        title: "PUC Certificate — Bolero Pickup",
        docType: "PUC",
        fileName: "puc-bolero.pdf",
        storedName: "seed-puc-bolero.pdf",
        mimeType: "application/pdf",
        expiresAt: daysFromNow(45),
      },
      {
        vehicleId: v("GJ-18-IJ-2201").id,
        title: "Fitness Certificate — Tata 407",
        docType: "FITNESS",
        fileName: "fitness-407.pdf",
        storedName: "seed-fitness-407.pdf",
        mimeType: "application/pdf",
        expiresAt: daysFromNow(200),
      },
      {
        vehicleId: v("GJ-12-QR-6677").id,
        title: "National Permit — BharatBenz 1217R",
        docType: "PERMIT",
        fileName: "permit-bb1217.pdf",
        storedName: "seed-permit-bb1217.pdf",
        mimeType: "application/pdf",
        expiresAt: daysFromNow(300),
      },
    ],
  });

  console.log("\n✓ Seeded Gujarat Transit demo data");
  console.log("  Org: Gujarat Transit Logistics Pvt. Ltd. (Naroda Depot)");
  console.log(`  Users: ${users.length} (password: password123)`);
  users.forEach((u) => console.log(`    - ${u.email} [${u.role}]`));
  console.log(`  Drivers: ${drivers.length}`);
  console.log(`  Vehicles: ${vehicles.length}`);
  console.log(
    "  Trips: 14 completed + 2 dispatched + 2 draft + 1 cancelled"
  );
  console.log("  Maintenance, fuel logs, expenses, and sample documents included");
  console.log("\n  Screenshot highlights:");
  console.log("  • Safety: Hardik (expired), Mehul / Priya / Chirag (expiring soon)");
  console.log("  • Ops: 2 live trips Ahmedabad↔Surat & Surat→Mundra");
  console.log("  • Shop: Tata 407 (GJ-18) in maintenance at Gandhinagar");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
