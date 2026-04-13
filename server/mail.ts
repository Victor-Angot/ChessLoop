import nodemailer from 'nodemailer'

const APP_NAME = process.env.APP_NAME ?? 'Chess Loop'

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim())
}

function getTransport() {
  const host = process.env.SMTP_HOST
  if (!host) return null
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER != null && process.env.SMTP_USER !== ''
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS ?? '',
          }
        : undefined,
  })
}

export async function sendSignupConfirmationEmail(to: string): Promise<void> {
  if (!isMailConfigured()) {
    console.warn('[mail] SMTP not configured; skipping confirmation email.')
    return
  }
  const from = process.env.SMTP_FROM!
  const transport = getTransport()
  if (!transport) return

  const subject = `${APP_NAME} — account created`
  const text = [
    `Hello,`,
    ``,
    `Your ${APP_NAME} account was created for: ${to}`,
    ``,
    `You can sign in anytime.`,
    ``,
    `— ${APP_NAME}`,
  ].join('\n')

  const html = `
    <p>Hello,</p>
    <p>Your <strong>${escapeHtml(APP_NAME)}</strong> account was created for:</p>
    <p><strong>${escapeHtml(to)}</strong></p>
    <p>You can sign in anytime.</p>
    <p>— ${escapeHtml(APP_NAME)}</p>
  `

  await transport.sendMail({ from, to, subject, text, html })
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  if (!isMailConfigured()) {
    console.warn('[mail] SMTP not configured; skipping password reset email.')
    return
  }
  const from = process.env.SMTP_FROM!
  const transport = getTransport()
  if (!transport) return

  const subject = `${APP_NAME} — reset your password`
  const text = [
    `Hello,`,
    ``,
    `To set a new password for ${APP_NAME}, open this link (valid for 1 hour):`,
    resetUrl,
    ``,
    `If you did not request a reset, you can ignore this email.`,
    ``,
    `— ${APP_NAME}`,
  ].join('\n')

  const html = `
    <p>Hello,</p>
    <p>To set a new password for <strong>${escapeHtml(APP_NAME)}</strong>, click the link below (valid for 1&nbsp;hour):</p>
    <p><a href="${escapeHtml(resetUrl)}">Reset my password</a></p>
    <p style="color:#666;font-size:13px">If the button does not work, copy and paste this URL into your browser:<br/><code>${escapeHtml(resetUrl)}</code></p>
    <p>If you did not request a reset, you can ignore this email.</p>
    <p>— ${escapeHtml(APP_NAME)}</p>
  `

  await transport.sendMail({ from, to, subject, text, html })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
