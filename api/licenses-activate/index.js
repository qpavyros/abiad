const { getConfig } = require('../shared/config')
const { findLicenseByKey, getContainer, upsertLicense } = require('../shared/cosmos')
const { normalizeLicenseKey } = require('../shared/license')
const { json, noContent } = require('../shared/response')

function parseRequestBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'object') return req.body

  try {
    return JSON.parse(req.body)
  } catch {
    return {}
  }
}

module.exports = async function activateLicense(context, req) {
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

  try {
    const payload = parseRequestBody(req)
    const licenseKey = normalizeLicenseKey(payload.licenseKey)
    const incomingDeviceId = String(payload.deviceId || payload.deviceFingerprint || '')
      .trim()
      .slice(0, 160)

    if (!licenseKey || licenseKey === 'POS-') {
      context.res = json(req, config, 400, {
        ok: false,
        valid: false,
        error: 'license_key_required',
      })
      return
    }

    const container = getContainer(config)
    const license = await findLicenseByKey(container, licenseKey)

    if (!license) {
      context.res = json(req, config, 404, {
        ok: false,
        valid: false,
        error: 'license_not_found',
      })
      return
    }

    if (license.status !== 'active') {
      context.res = json(req, config, 403, {
        ok: false,
        valid: false,
        error: 'license_inactive',
      })
      return
    }

    if (license.activatedDeviceId && incomingDeviceId && license.activatedDeviceId !== incomingDeviceId) {
      context.res = json(req, config, 409, {
        ok: false,
        valid: false,
        error: 'license_already_activated_on_another_device',
      })
      return
    }

    const now = new Date().toISOString()
    const firstActivation = !license.activatedAt
    const nextActivationCount = Number(license.activationCount || 0) + (firstActivation ? 1 : 0)

    const updated = await upsertLicense(container, {
      ...license,
      activatedAt: license.activatedAt || now,
      activatedDeviceId: license.activatedDeviceId || incomingDeviceId || 'unknown-device',
      activationCount: nextActivationCount,
      lastValidatedAt: now,
      updatedAt: now,
    })

    context.res = json(req, config, 200, {
      ok: true,
      valid: true,
      license: {
        key: updated.licenseKey,
        activatedAt: updated.activatedAt,
        status: updated.status,
      },
      supportEmail: config.supportEmail,
      offlineAllowed: true,
    })
  } catch (error) {
    context.log.error(`Activation failed: ${error.message}`)
    context.res = json(req, config, 500, {
      ok: false,
      valid: false,
      error: 'internal_error',
    })
  }
}
