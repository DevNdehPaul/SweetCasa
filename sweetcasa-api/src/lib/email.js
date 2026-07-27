const nodemailer = require('nodemailer')

let transporter = null
let attempted = false

function getTransporter() {
  if (attempted) return transporter
  attempted = true

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP_HOST/SMTP_USER/SMTP_PASS not set — emails will be logged, not sent.')
    return null
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transporter
}

// Never throws — a failed email should not break the action that triggered it
// (approving/rejecting a listing, sending a staff invite, etc).
async function sendMail({ to, subject, html }) {
  const t = getTransporter()

  if (!t) {
    console.warn(`[email] (not sent, SMTP unconfigured) to=${to} subject="${subject}"`)
    return { sent: false }
  }

  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || 'SweetCasa <no-reply@sweetcasa.com>',
      to,
      subject,
      html,
    })
    return { sent: true }
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err.message)
    return { sent: false, error: err.message }
  }
}

module.exports = { sendMail }
