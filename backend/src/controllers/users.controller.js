const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");

const MANAGEABLE_ROLES = [
  "ADMIN",
  "FLEET_MANAGER",
  "DISPATCHER",
  "SAFETY_OFFICER",
  "FINANCIAL_ANALYST",
];

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  verified: true,
  createdAt: true,
  updatedAt: true,
};

async function list(req, res, next) {
  try {
    const { q, role, verified, isActive } = req.query;
    const where = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    if (role) where.role = role;
    if (verified === "true") where.verified = true;
    if (verified === "false") where.verified = false;
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
    const { email, password, name, role, verified = false, isActive = true } =
      req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({
        message: "email, password, name, and role are required",
      });
    }

    if (!MANAGEABLE_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Use one of: ${MANAGEABLE_ROLES.join(", ")}`,
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role,
        verified: Boolean(verified),
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
    });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const { email, name, role, verified, isActive, password } = req.body;
    const data = {};

    if (email !== undefined) data.email = email;
    if (name !== undefined) data.name = name;
    if (role !== undefined) {
      if (!MANAGEABLE_ROLES.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Use one of: ${MANAGEABLE_ROLES.join(", ")}`,
        });
      }
      data.role = role;
    }
    if (verified !== undefined) data.verified = Boolean(verified);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (password) data.password = await bcrypt.hash(password, 10);

    // Prevent admin from deactivating themselves
    if (
      req.user.userId === existing.id &&
      data.isActive === false
    ) {
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

async function verify(req, res, next) {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { verified: true, isActive: true },
      select: userSelect,
    });
    return res.json({ user });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
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
  verify,
  remove,
  MANAGEABLE_ROLES,
};
