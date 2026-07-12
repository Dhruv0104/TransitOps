/** Module access: full (✓) | view | none (—) */

const ACCESS_LEVELS = ["none", "view", "full"];

const RBAC_MODULES = [
  { key: "fleet", label: "Fleet" },
  { key: "drivers", label: "Drivers" },
  { key: "trips", label: "Trips" },
  { key: "fuel", label: "Fuel/Exp." },
  { key: "analytics", label: "Analytics" },
];

/** Default matrix matching product RBAC (no Super Admin row) */
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

function isLegacyRbac(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  return rows.some(
    (r) =>
      Object.prototype.hasOwnProperty.call(r, "dashboardAccess") ||
      Object.prototype.hasOwnProperty.call(r, "editPermissions")
  );
}

function normalizeRbac(raw) {
  if (isLegacyRbac(raw)) return DEFAULT_RBAC.map((r) => ({ ...r }));

  return DEFAULT_RBAC.map((def) => {
    const found = raw.find((r) => r.role === def.role) || {};
    const row = {
      role: def.role,
      label: found.label || def.label,
    };
    for (const mod of RBAC_MODULES) {
      const value = found[mod.key];
      row[mod.key] = ACCESS_LEVELS.includes(value) ? value : def[mod.key];
    }
    return row;
  });
}

function cycleAccess(current) {
  const idx = ACCESS_LEVELS.indexOf(current);
  return ACCESS_LEVELS[(idx + 1) % ACCESS_LEVELS.length];
}

module.exports = {
  ACCESS_LEVELS,
  RBAC_MODULES,
  DEFAULT_RBAC,
  normalizeRbac,
  cycleAccess,
  isLegacyRbac,
};
