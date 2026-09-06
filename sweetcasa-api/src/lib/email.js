// ─── Brevo (HTTP API) ───────────────────────────────────────────────────────
// Sends over HTTPS instead of raw SMTP sockets, which sidesteps cloud hosts
// (Railway, Render, etc.) having their outbound SMTP silently blocked/dropped
// by mail providers like Gmail.
//
// Unlike most competitors, Brevo lets you verify a single sender EMAIL
// ADDRESS (click a confirmation link — no domain/DNS ownership needed) and
// still send to any recipient. Free forever: 300 emails/day.
//
// Setup:
//   1. Sign up at https://www.brevo.com
//   2. Settings → Senders, Domains & IPs → Senders → Add a Sender
//      (use an email address you can receive mail at, e.g. your Gmail)
//   3. Click the confirmation link Brevo emails to that address
//   4. Settings → SMTP & API → API Keys → Generate a new API key
//   5. On Railway, set:
//        BREVO_API_KEY=xkeysib-xxxxxxxx
//        MAIL_FROM=SweetCasa <the-address-you-verified@gmail.com>

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

function parseFrom(mailFrom) {
  // MAIL_FROM can be "Name <email@x.com>" or just "email@x.com"
  const match = String(mailFrom || '').match(/^(.*?)<(.+)>$/)
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, '') || 'SweetCasa', email: match[2].trim() }
  }
  return { name: 'SweetCasa', email: String(mailFrom || '').trim() }
}

// Never throws — a failed email should not break the action that triggered it
// (approving/rejecting a listing, sending a staff invite, forgot-password, etc).
async function sendMail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
    console.warn(`[email] BREVO_API_KEY/MAIL_FROM not set — email not sent. to=${to} subject="${subject}"`)
    return { sent: false }
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseFrom(process.env.MAIL_FROM),
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      console.error(`[email] Brevo API error (${response.status}) sending to ${to}:`, data)
      return { sent: false, error: data?.message || `Brevo API returned ${response.status}` }
    }

    return { sent: true, id: data?.messageId }
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err.message)
    return { sent: false, error: err.message }
  }
}

module.exports = { sendMail }