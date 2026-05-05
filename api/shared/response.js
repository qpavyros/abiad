const { buildCorsHeaders } = require('./cors')

function json(req, config, status, payload) {
  return {
    status,
    headers: {
      ...buildCorsHeaders(req, config),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }
}

function noContent(req, config) {
  return {
    status: 204,
    headers: buildCorsHeaders(req, config),
  }
}

module.exports = {
  json,
  noContent,
}
