const nodemailer = require('nodemailer')
const { maskLicenseKey } = require('./license')

let cachedTransporter = null

function hasSmtpConfig(config) {
  return Boolean(
    config.smtpHost && config.smtpPort && config.smtpUser && config.smtpPass && config.smtpFrom,
  )
}

function getTransporter(config) {
  if (!hasSmtpConfig(config)) return null
  if (cachedTransporter) return cachedTransporter

  cachedTransporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  })

  return cachedTransporter
}

function buildPlainTextEmail({ licenseKey, supportEmail, websiteUrl }) {
  return [
    'Thank you for purchasing DualPOS Lifetime License.',
    '',
    `Your license key: ${licenseKey}`,
    '',
    'Activation steps:',
    '1) Open the DualPOS app.',
    '2) Enter the license key in the activation screen.',
    '3) Keep this email for your records.',
    '',
    'Refund policy:',
    'You may request a full refund within 14 days if the software does not meet expectations,',
    'provided the license is deactivated.',
    '',
    `Support: ${supportEmail}`,
    `Website: ${websiteUrl}`,
    '',
    `Masked key for quick reference: ${maskLicenseKey(licenseKey)}`,
  ].join('\n')
}

function buildHtmlEmail({ licenseKey, supportEmail, websiteUrl }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2 style="margin:0 0 12px">DualPOS Lifetime License</h2>
      <p>Thank you for your purchase. Your activation key is:</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:1px">${licenseKey}</p>
      <p>Activation steps:</p>
      <ol>
        <li>Open the DualPOS application.</li>
        <li>Enter the key in the activation screen.</li>
        <li>Store this email for future reference.</li>
      </ol>
      <p>
        You may request a full refund within 14 days if the software does not meet expectations,
        provided the license is deactivated.
      </p>
      <p>Support: <a href="mailto:${supportEmail}">${supportEmail}</a></p>
      <p>Website: <a href="${websiteUrl}">${websiteUrl}</a></p>
      <p style="color:#6b7280;font-size:12px">Reference: ${maskLicenseKey(licenseKey)}</p>
    </div>
  `
}

async function sendLicenseEmail({ toEmail, licenseKey, config, logger }) {
  const transporter = getTransporter(config)
  if (!transporter) {
    logger?.warn?.('SMTP is not configured. License email was skipped.')
    return { sent: false, reason: 'smtp_not_configured' }
  }

  const info = await transporter.sendMail({
    from: config.smtpFrom,
    to: toEmail,
    subject: 'Your DualPOS Lifetime License Key',
    text: buildPlainTextEmail({
      licenseKey,
      supportEmail: config.supportEmail,
      websiteUrl: config.websiteUrl,
    }),
    html: buildHtmlEmail({
      licenseKey,
      supportEmail: config.supportEmail,
      websiteUrl: config.websiteUrl,
    }),
  })

  return { sent: true, messageId: info.messageId || '' }
}

module.exports = {
  hasSmtpConfig,
  sendLicenseEmail,
}
