const prisma = require("../lib/prisma");
const { DEFAULT_RBAC, normalizeRbac } = require("../lib/rbac");

const DEFAULT_ORG = {
  name: "TransitOps Fleet Co.",
  address: "",
  contactNo: "",
  email: "ops@transitops.local",
  depotName: "Main Depot",
  distanceUnit: "km",
  currencyType: "INR",
};

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

async function getPreferences(req, res, next) {
  try {
    const organization = await getOrCreateOrg();
    return res.json({
      currencyType: organization.currencyType || "INR",
      distanceUnit: organization.distanceUnit || "km",
      depotName: organization.depotName || null,
      name: organization.name || null,
      rbac: normalizeRbac(organization.rbacConfig),
    });
  } catch (err) {
    return next(err);
  }
}

async function getSettings(req, res, next) {
  try {
    const organization = await getOrCreateOrg();
    const rbac = normalizeRbac(organization.rbacConfig);

    // Persist migration away from legacy dashboard/edit/delete matrix
    if (JSON.stringify(organization.rbacConfig) !== JSON.stringify(rbac)) {
      await prisma.organization.update({
        where: { id: organization.id },
        data: { rbacConfig: rbac },
      });
    }

    return res.json({
      organization,
      rbac,
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

    const normalized = normalizeRbac(rbac);

    const organization = await prisma.organization.update({
      where: { id: org.id },
      data: { rbacConfig: normalized },
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
  getPreferences,
  updateOrganization,
  updateRbac,
  DEFAULT_RBAC,
};
