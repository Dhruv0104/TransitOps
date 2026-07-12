const nodemailer = require("nodemailer");
const prisma = require("../lib/prisma");

const REMINDER_DAYS = Number(process.env.LICENSE_REMINDER_DAYS || 30);

function createTransport() {
  if (process.env.SMTP_HOST) {
    // Gmail app passwords are often pasted with spaces — strip them
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: user ? { user, pass } : undefined,
    });
  }

  // Dev fallback: log emails to console
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

async function getReminderRecipients() {
  const [org, officers] = await Promise.all([
    prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["SAFETY_OFFICER", "ADMIN", "FLEET_MANAGER"] },
      },
      select: { email: true, name: true },
    }),
  ]);

  const emails = new Set();
  if (org?.email) emails.add(org.email);
  officers.forEach((u) => emails.add(u.email));
  return [...emails];
}

/**
 * @param {{ force?: boolean }} [options]
 * force=true skips the 24h per-driver cooldown (used by the UI button)
 */
async function runLicenseReminders(options = {}) {
  const force = Boolean(options.force);
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + REMINDER_DAYS);
  const mode = process.env.SMTP_HOST ? "smtp" : "console";

  const drivers = await prisma.driver.findMany({
    where: {
      licenseExpiry: { lte: horizon },
    },
    orderBy: { licenseExpiry: "asc" },
  });

  const due = force
    ? drivers
    : drivers.filter((d) => {
        if (!d.lastLicenseReminderAt) return true;
        const last = new Date(d.lastLicenseReminderAt);
        const hours = (now - last) / (1000 * 60 * 60);
        return hours >= 24;
      });

  if (drivers.length === 0) {
    return {
      sent: 0,
      drivers: [],
      recipients: [],
      mode,
      warning: `No drivers with licenses expiring within ${REMINDER_DAYS} days (or already expired)`,
    };
  }

  if (due.length === 0) {
    return {
      sent: 0,
      drivers: [],
      recipients: [],
      mode,
      warning:
        "All due drivers were already reminded in the last 24 hours. Use Send again to force resend.",
      skipped: drivers.length,
    };
  }

  const staffRecipients = await getReminderRecipients();
  const driverEmails = due
    .map((d) => d.email)
    .filter((e) => e && String(e).includes("@"));

  const recipients = [...new Set([...staffRecipients, ...driverEmails])];

  if (recipients.length === 0) {
    return {
      sent: 0,
      drivers: due.map((d) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        licenseNumber: d.licenseNumber,
        licenseExpiry: d.licenseExpiry,
      })),
      warning:
        "No recipient emails found. Add driver emails, set Organization email in Settings, or ensure Admin/Safety/Fleet users exist.",
      mode,
    };
  }

  const lines = due.map((d) => {
    const days = Math.ceil(
      (new Date(d.licenseExpiry) - now) / (1000 * 60 * 60 * 24)
    );
    const label =
      days < 0
        ? `EXPIRED ${Math.abs(days)} day(s) ago`
        : `expires in ${days} day(s)`;
    return `- ${d.name} (${d.licenseNumber}${d.email ? `, ${d.email}` : ""}) — ${label} on ${new Date(
      d.licenseExpiry
    )
      .toISOString()
      .slice(0, 10)}`;
  });

  try {
    const transport = createTransport();
    const from =
      process.env.SMTP_FROM || "TransitOps <noreply@transitops.local>";

    // Staff / ops summary (if any staff recipients)
    if (staffRecipients.length > 0) {
      const info = await transport.sendMail({
        from,
        to: staffRecipients.join(", "),
        subject: `[TransitOps] ${due.length} driver license reminder(s)`,
        text: `The following driver licenses need attention:\n\n${lines.join(
          "\n"
        )}\n\n— TransitOps Safety`,
      });
      if (mode === "console") {
        console.log("[license-reminders] staff email:", info.message);
      } else {
        console.log(
          `[license-reminders] staff SMTP to ${staffRecipients.join(", ")} messageId=${info.messageId}`
        );
      }
    }

    // Personal email to each due driver who has an email
    for (const d of due) {
      if (!d.email) continue;
      const days = Math.ceil(
        (new Date(d.licenseExpiry) - now) / (1000 * 60 * 60 * 24)
      );
      const statusText =
        days < 0
          ? `expired ${Math.abs(days)} day(s) ago`
          : `expires in ${days} day(s) (on ${new Date(d.licenseExpiry)
              .toISOString()
              .slice(0, 10)})`;

      const info = await transport.sendMail({
        from,
        to: d.email,
        subject: `[TransitOps] License reminder — ${d.licenseNumber}`,
        text: `Hello ${d.name},\n\nThis is a reminder that your driving license (${d.licenseNumber}) ${statusText}.\n\nPlease renew it promptly so you can continue to be assigned to trips.\n\n— TransitOps Safety`,
      });
      if (mode === "console") {
        console.log(`[license-reminders] driver email ${d.email}:`, info.message);
      } else {
        console.log(
          `[license-reminders] driver SMTP to ${d.email} messageId=${info.messageId}`
        );
      }
    }
  } catch (err) {
    const detail = err?.response || err?.message || "SMTP send failed";
    const error = new Error(
      `Failed to send license reminder email: ${detail}. Check SMTP_HOST / SMTP_USER / SMTP_PASS in backend/.env`
    );
    error.status = 502;
    throw error;
  }

  await prisma.driver.updateMany({
    where: { id: { in: due.map((d) => d.id) } },
    data: { lastLicenseReminderAt: now },
  });

  return {
    sent: due.length,
    recipients,
    drivers: due.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      licenseNumber: d.licenseNumber,
      licenseExpiry: d.licenseExpiry,
    })),
    mode,
  };
}

module.exports = { runLicenseReminders, REMINDER_DAYS };
