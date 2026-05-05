const { Environment, Paddle } = require('@paddle/paddle-node-sdk')

let cachedPaddleClient = null

function resolvePaddleEnvironment(apiKey) {
  if (String(apiKey || '').startsWith('pdl_sandbox_')) {
    return Environment.sandbox
  }
  return Environment.production
}

function getPaddleClient(config) {
  if (cachedPaddleClient) return cachedPaddleClient
  if (!config.paddleApiKey) throw new Error('PADDLE_API_KEY is required.')

  cachedPaddleClient = new Paddle(config.paddleApiKey, {
    environment: resolvePaddleEnvironment(config.paddleApiKey),
  })

  return cachedPaddleClient
}

function verifyAndParseWebhook(rawBody, signature, config) {
  if (!config.paddleWebhookSecret) {
    throw new Error('PADDLE_WEBHOOK_SECRET is required.')
  }

  return getPaddleClient(config).webhooks.unmarshal(rawBody, config.paddleWebhookSecret, signature)
}

function normalizeEmail(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text.includes('@')) return ''
  return text
}

function firstNonEmptyString(values) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

function extractEventType(event) {
  return firstNonEmptyString([event?.eventType, event?.event_type])
}

function extractTransactionData(event) {
  return event?.data || {}
}

function extractTransactionId(transactionData) {
  return firstNonEmptyString([transactionData?.id, transactionData?.transactionId, transactionData?.transaction_id])
}

function extractCustomerId(transactionData) {
  return firstNonEmptyString([transactionData?.customerId, transactionData?.customer_id, transactionData?.customer?.id])
}

function extractPriceIds(transactionData) {
  const items = Array.isArray(transactionData?.items) ? transactionData.items : []
  const ids = []

  for (const item of items) {
    ids.push(item?.priceId)
    ids.push(item?.price_id)
    ids.push(item?.price?.id)
  }

  return [...new Set(ids.map((item) => String(item || '').trim()).filter(Boolean))]
}

async function resolveCustomerEmail(transactionData, config, logger) {
  const directEmail = normalizeEmail(
    firstNonEmptyString([
      transactionData?.customer?.email,
      transactionData?.customerEmail,
      transactionData?.customer_email,
      transactionData?.billingDetails?.email,
      transactionData?.billing_details?.email,
      transactionData?.customData?.customerEmail,
      transactionData?.custom_data?.customer_email,
      transactionData?.customData?.email,
      transactionData?.custom_data?.email,
    ]),
  )

  if (directEmail) return directEmail

  const customerId = extractCustomerId(transactionData)
  if (!customerId) return ''

  try {
    const customer = await getPaddleClient(config).customers.get(customerId)
    return normalizeEmail(customer?.email)
  } catch (error) {
    logger?.warn?.(`Failed to fetch Paddle customer (${customerId}): ${error.message}`)
    return ''
  }
}

module.exports = {
  extractEventType,
  extractPriceIds,
  extractTransactionData,
  extractTransactionId,
  resolveCustomerEmail,
  verifyAndParseWebhook,
}
