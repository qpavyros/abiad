function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseSmtpPort(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587
}

function getConfig() {
  return {
    paddleApiKey: process.env.PADDLE_API_KEY || '',
    paddleWebhookSecret: process.env.PADDLE_WEBHOOK_SECRET || '',
    paddleLifetimePriceId: process.env.PADDLE_LIFETIME_PRICE_ID || '',

    cosmosConnectionString: process.env.COSMOS_CONNECTION_STRING || '',
    cosmosEndpoint: process.env.COSMOS_ENDPOINT || '',
    cosmosKey: process.env.COSMOS_KEY || '',
    cosmosDatabase:
      process.env.COSMOS_DB_NAME || process.env.COSMOS_DATABASE || 'DualPOS',
    cosmosContainer:
      process.env.COSMOS_CONTAINER_NAME || process.env.COSMOS_CONTAINER || 'licenses',

    supportEmail: process.env.SUPPORT_EMAIL || 'support@abiad.systems',
    websiteUrl: process.env.WEBSITE_URL || 'https://abiad.systems',

    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseSmtpPort(process.env.SMTP_PORT),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || '',

    corsAllowedOrigins: splitCsv(process.env.CORS_ALLOWED_ORIGINS || '*'),
  }
}

module.exports = {
  getConfig,
}
