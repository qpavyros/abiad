const { getConfig } = require('../shared/config')
const { findLicenseByTransactionId, getContainer, upsertLicense } = require('../shared/cosmos')
const { generateUniqueLicenseKey } = require('../shared/license')
const { sendLicenseEmail } = require('../shared/mailer')
const {
  extractEventType,
  extractPriceIds,
  extractTransactionData,
  extractTransactionId,
  resolveCustomerEmail,
  verifyAndParseWebhook,
} = require('../shared/paddle')
const { json, noContent } = require('../shared/response')

function readSignatureHeader(req) {
  return (
    req?.headers?.['paddle-signature'] ||
    req?.headers?.['Paddle-Signature'] ||
    req?.headers?.['PADDLE-SIGNATURE'] ||
    ''
  )
}

function readRawBody(req) {
  if (typeof req.rawBody === 'string') return req.rawBody
  if (typeof req.body === 'string') return req.body
  return JSON.stringify(req.body || {})
}

module.exports = async function paddleWebhook(context, req) {
  const config = getConfig()

  if (req.method === 'OPTIONS') {
    context.res = noContent(req, config)
    return
  }

  if (req.method !== 'POST') {
    context.res = json(req, config, 405, {
      ok: false,
      error: 'method_not_allowed',
    })
    return
  }

  if (!config.paddleApiKey || !config.paddleWebhookSecret) {
    context.res = json(req, config, 500, {
      ok: false,
      error: 'missing_paddle_configuration',
    })
    return
  }

  const signature = readSignatureHeader(req)
  if (!signature) {
    context.res = json(req, config, 401, {
      ok: false,
      error: 'missing_paddle_signature',
    })
    return
  }

  let event
  try {
    event = verifyAndParseWebhook(readRawBody(req), signature, config)
  } catch (error) {
    context.log.warn(`Invalid webhook signature: ${error.message}`)
    context.res = json(req, config, 401, {
      ok: false,
      error: 'invalid_webhook_signature',
    })
    return
  }

  const eventType = extractEventType(event)
  if (eventType !== 'transaction.completed') {
    context.res = json(req, config, 200, {
      ok: true,
      ignored: true,
      reason: 'unsupported_event',
      eventType,
    })
    return
  }

  try {
    const transactionData = extractTransactionData(event)
    const transactionId = extractTransactionId(transactionData)
    if (!transactionId) {
      context.res = json(req, config, 422, {
        ok: false,
        error: 'missing_transaction_id',
      })
      return
    }

    const matchedPriceIds = extractPriceIds(transactionData)
    if (
      config.paddleLifetimePriceId &&
      !matchedPriceIds.includes(config.paddleLifetimePriceId)
    ) {
      context.res = json(req, config, 200, {
        ok: true,
        ignored: true,
        reason: 'price_not_configured_for_license',
      })
      return
    }

    const customerEmail = await resolveCustomerEmail(transactionData, config, context.log)
    if (!customerEmail) {
      context.res = json(req, config, 422, {
        ok: false,
        error: 'missing_customer_email',
      })
      return
    }

    const container = getContainer(config)
    const existing = await findLicenseByTransactionId(container, transactionId)

    if (existing) {
      context.res = json(req, config, 200, {
        ok: true,
        alreadyProcessed: true,
        transactionId,
      })
      return
    }

    const now = new Date().toISOString()
    const licenseKey = await generateUniqueLicenseKey(container)

    const saved = await upsertLicense(container, {
      id: licenseKey,
      licenseKey,
      transactionId,
      customerEmail,
      customerId: transactionData.customerId || transactionData.customer_id || null,
      priceIds: matchedPriceIds,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      activatedDeviceId: null,
      activationCount: 0,
      sourceEventId: event.eventId || event.event_id || null,
      sourceEventType: eventType,
      emailDeliveryStatus: 'pending',
    })

    const emailResult = await sendLicenseEmail({
      toEmail: customerEmail,
      licenseKey,
      config,
      logger: context.log,
    })

    await upsertLicense(container, {
      ...saved,
      updatedAt: new Date().toISOString(),
      emailDeliveryStatus: emailResult.sent ? 'sent' : 'failed',
      emailDeliveryMessage: emailResult.sent ? emailResult.messageId : emailResult.reason,
      emailedAt: emailResult.sent ? new Date().toISOString() : null,
    })

    context.res = json(req, config, 200, {
      ok: true,
      transactionId,
      licenseIssued: true,
      emailSent: emailResult.sent,
    })
  } catch (error) {
    context.log.error(`Webhook processing failed: ${error.message}`)
    context.res = json(req, config, 500, {
      ok: false,
      error: 'internal_error',
    })
  }
}
