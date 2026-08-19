const nodemailer = require("nodemailer");

let transporter = null;
let attempted = false;

// SMTP credentials are read from environment variables only — never stored
// in the database or exposed through the admin UI, per the "don't put
// sensitive credentials where they can leak" rule. Admins toggle whether
// email is *used* (site_settings.email.enabled); the *how* (SMTP host/user/
// pass) is ops/deploy-time configuration.
function getTransporter() {
  if (attempted) return transporter;
  attempted = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      "[mailer] SMTP_HOST/SMTP_USER/SMTP_PASS not set — emails will be logged, not sent. " +
        "Configure them in server/.env to enable real delivery."
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendEmail({ to, subject, html, fromName, fromEmail }) {
  const t = getTransporter();
  if (!t) {
    return { ok: false, status: "not_configured", detail: "SMTP not configured on the server" };
  }
  try {
    await t.sendMail({
      from: `"${fromName || "Khalid Super Store"}" <${fromEmail || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return { ok: true, status: "sent" };
  } catch (err) {
    console.error("[mailer] send failed:", err.message);
    return { ok: false, status: "failed", detail: err.message };
  }
}

module.exports = { sendEmail };
