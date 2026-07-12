const prisma = require("../lib/prisma");

const DEFAULT_ORG = {
  name: "TransitOps Fleet Co.",
  address: "",
  contactNo: "",
  email: "ops@transitops.local",
  depotName: "Main Depot",
  distanceUnit: "km",
  currencyType: "INR",
};

const DEFAULT_RBAC = [
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
];

async function getOrCreateOrg() {
  const existing = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.organization.create({
    data: {
      ...DEFAULT_ORG,
      rbacConfig: DEFAULT_RBAC,
    },
  });
}

async function getSettings(req, res, next) {
  try {
    const organization = await getOrCreateOrg();
    return res.json({
      organization,
      rbac: organization.rbacConfig || DEFAULT_RBAC,
    });
  } catch (err) {
    return next(err);
  }
}

async function updateOrganization(req, res, next) {
  try {
    const org = await getOrCreateOrg();
    const {
      name,
      address,
      contactNo,
      email,
      depotName,
      distanceUnit,
      currencyType,
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;
    if (contactNo !== undefined) data.contactNo = contactNo;
    if (email !== undefined) data.email = email;
    if (depotName !== undefined) data.depotName = depotName;
    if (distanceUnit !== undefined) data.distanceUnit = distanceUnit;
    if (currencyType !== undefined) data.currencyType = currencyType;

    if (!data.name && !org.name) {
      return res.status(400).json({ message: "Organization name is required" });
    }

    const organization = await prisma.organization.update({
      where: { id: org.id },
      data,
    });

    return res.json({ organization });
  } catch (err) {
    return next(err);
  }
}

async function updateRbac(req, res, next) {
  try {
    const org = await getOrCreateOrg();
    const { rbac } = req.body;

    if (!Array.isArray(rbac)) {
      return res.status(400).json({ message: "rbac must be an array" });
    }

    const organization = await prisma.organization.update({
      where: { id: org.id },
      data: { rbacConfig: rbac },
    });

    return res.json({
      organization,
      rbac: organization.rbacConfig,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getSettings,
  updateOrganization,
  updateRbac,
  DEFAULT_RBAC,
};
