const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");

const MANAGEABLE_ROLES = [
  "ADMIN",
  "FLEET_MANAGER",
  "DISPATCHER",
  "SAFETY_OFFICER",
  "FINANCIAL_ANALYST",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
};

function validateUserPayload({ email, password, name, role }, { requirePassword }) {
  if (!name || !String(name).trim()) return "Name is required";
  if (!email || !String(email).trim()) return "Email is required";
  if (!EMAIL_RE.test(String(email).trim())) return "Email must be valid";
  if (!role) return "Role is required";
  if (!MANAGEABLE_ROLES.includes(role)) {
    return `Invalid role. Use one of: ${MANAGEABLE_ROLES.join(", ")}`;
  }
  if (requirePassword) {
    if (!password) return "Password is required";
    if (String(password).length < 6) {
      return "Password must be at least 6 characters";
    }
  } else if (password && String(password).length < 6) {
    return "Password must be at least 6 characters";
  }
  return null;
}

async function list(req, res, next) {
  try {
    const { q, role, isActive } = req.query;
    const where = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    if (role) where.role = role;
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;

    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });

    return res.json({ users });
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: userSelect,
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const { email, password, name, role, isActive = true } = req.body;
    const invalid = validateUserPayload(
      { email, password, name, role },
      { requirePassword: true }
    );
    if (invalid) return res.status(400).json({ message: invalid });

    const existing = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: String(email).trim().toLowerCase(),
        password: hashed,
        name: String(name).trim(),
        role,
        isActive: Boolean(isActive),
      },
      select: userSelect,
    });

    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, isActive: true },
    });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const { email, name, role, isActive, password } = req.body;
    const data = {};

    if (email !== undefined) {
      if (!EMAIL_RE.test(String(email).trim())) {
        return res.status(400).json({ message: "Email must be valid" });
      }
      data.email = String(email).trim().toLowerCase();
    }
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      data.name = String(name).trim();
    }
    if (role !== undefined) {
      if (!MANAGEABLE_ROLES.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Use one of: ${MANAGEABLE_ROLES.join(", ")}`,
        });
      }
      data.role = role;
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (password) {
      if (String(password).length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }
      data.password = await bcrypt.hash(password, 10);
    }

    // Activating a user also clears login lockout
    if (data.isActive === true) {
      data.failedLoginAttempts = 0;
      data.lockedUntil = null;
    }

    if (req.body.unlock === true) {
      data.failedLoginAttempts = 0;
      data.lockedUntil = null;
    }

    if (req.user.userId === existing.id && data.isActive === false) {
      return res.status(400).json({
        message: "You cannot deactivate your own account",
      });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: userSelect,
    });

    return res.json({ user });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Email already registered" });
    }
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (req.user.userId === req.params.id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    return next(err);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  MANAGEABLE_ROLES,
};
