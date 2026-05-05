function buildCorsHeaders(req, config) {
  const allowedOrigins = Array.isArray(config.corsAllowedOrigins) ? config.corsAllowedOrigins : ['*']
  const requestedOrigin = req?.headers?.origin || req?.headers?.Origin || ''
  const hasWildcard = allowedOrigins.includes('*')

  let allowOrigin = '*'
  if (!hasWildcard) {
    allowOrigin = allowedOrigins.includes(requestedOrigin) ? requestedOrigin : allowedOrigins[0] || ''
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Paddle-Signature',
    Vary: 'Origin',
  }
}

module.exports = {
  buildCorsHeaders,
}
