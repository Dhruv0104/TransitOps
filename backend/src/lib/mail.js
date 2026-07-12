const nodemailer = require("nodemailer");

function createTransport() {
  if (process.env.SMTP_HOST) {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: user ? { user, pass } : undefined,
    });
  }

  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

async function sendMail({ to, subject, text, html }) {
  const transport = createTransport();
  const from =
    process.env.SMTP_FROM || "TransitOps <noreply@transitops.local>";
  const info = await transport.sendMail({ from, to, subject, text, html });

  if (!process.env.SMTP_HOST) {
    console.log("[mail:dev]", JSON.stringify(info.message ? JSON.parse(info.message) : info, null, 2));
  }

  return info;
}

module.exports = { createTransport, sendMail };
