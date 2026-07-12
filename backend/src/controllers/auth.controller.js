const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { sendMail } = require("../lib/mail");

const VALID_ROLES = [
  "FLEET_MANAGER",
  "DISPATCHER",
  "SAFETY_OFFICER",
  "FINANCIAL_ANALYST",
];

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 30);

function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
  };
}

function isCurrentlyLocked(user) {
  return Boolean(user.lockedUntil && user.lockedUntil.getTime() > Date.now());
}

function lockMessage(lockedUntil) {
  const mins = Math.max(
    1,
    Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
  );
  return `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or use Forgot Password / contact an admin.`;
}

async function register(req, res, next) {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({
        message: "email, password, name, and role are required",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ message: "Email must be valid" });
    }

    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Use one of: ${VALID_ROLES.join(", ")}`,
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
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
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    const token = signToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is deactivated. Contact an administrator.",
      });
    }

    if (isCurrentlyLocked(user)) {
      return res.status(423).json({ message: lockMessage(user.lockedUntil) });
    }

    // Lock window expired — clear counters before validating password
    if (user.lockedUntil && user.lockedUntil.getTime() <= Date.now()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const data = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        data.failedLoginAttempts = MAX_FAILED_ATTEMPTS;
      }

      await prisma.user.update({ where: { id: user.id }, data });

      if (data.lockedUntil) {
        return res.status(423).json({ message: lockMessage(data.lockedUntil) });
      }

      const remaining = MAX_FAILED_ATTEMPTS - attempts;
      return res.status(401).json({
        message: `Invalid credentials. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.`,
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const safeUser = toSafeUser(user);
    const token = signToken(safeUser);
    return res.json({ user: safeUser, token });
  } catch (err) {
    return next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "A valid email is required" });
    }

    const genericMessage =
      "If an account exists for that email, a reset code has been sent.";

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.json({ message: genericMessage });
    }

    const resetToken = String(crypto.randomInt(100000, 999999));
    const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");

    try {
      await sendMail({
        to: user.email,
        subject: "TransitOps password reset code",
        text: [
          `Hi ${user.name},`,
          "",
          `Your TransitOps password reset code is: ${resetToken}`,
          "This code expires in 30 minutes.",
          "",
          `Open ${frontendUrl}/login and use Forgot Password → Reset with code.`,
          "",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
        html: `
          <p>Hi ${user.name},</p>
          <p>Your TransitOps password reset code is:</p>
          <p style="font-size:24px;font-weight:700;letter-spacing:4px">${resetToken}</p>
          <p>This code expires in 30 minutes.</p>
          <p>Open <a href="${frontendUrl}/login">${frontendUrl}/login</a> and choose <strong>Forgot Password</strong>, then enter the code with your new password.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      });
    } catch (mailErr) {
      console.error("[forgot-password] mail failed", mailErr);
      return res.status(502).json({
        message:
          "Could not send reset email. Check SMTP settings or try again later.",
      });
    }

    return res.json({ message: genericMessage });
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const code = String(req.body.code || req.body.token || "").trim();
    const password = String(req.body.password || "");

    if (!email || !code || !password) {
      return res.status(400).json({
        message: "email, code, and password are required",
      });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.resetToken ||
      user.resetToken !== code ||
      !user.resetTokenExpires ||
      user.resetTokenExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired reset code. Request a new one.",
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return res.json({
      message: "Password updated. You can sign in with your new password.",
    });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is deactivated. Contact an administrator.",
      });
    }

    if (isCurrentlyLocked(user)) {
      return res.status(423).json({ message: lockMessage(user.lockedUntil) });
    }

    return res.json({ user: toSafeUser(user) });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
};
