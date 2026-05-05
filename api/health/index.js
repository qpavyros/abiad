const { getConfig } = require('../shared/config')
const { hasSmtpConfig } = require('../shared/mailer')
const { json, noContent } = require('../shared/response')

module.exports = async function health(context, req) {
  const config = getConfig()

  if (req.method === 'OPTIONS') {
    context.res = noContent(req, config)
    return
  }

  const cosmosConfigured = Boolean(
    config.cosmosConnectionString || (config.cosmosEndpoint && config.cosmosKey),
  )
  const paddleConfigured = Boolean(config.paddleApiKey && config.paddleWebhookSecret)

  context.res = json(req, config, 200, {
    ok: true,
    service: 'dualpos-license-api',
    timestamp: new Date().toISOString(),
    checks: {
      paddleConfigured,
      cosmosConfigured,
      smtpConfigured: hasSmtpConfig(config),
    },
  })
}
