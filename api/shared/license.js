const LICENSE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function normalizeLicenseKey(value) {
  const compact = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^POS/, '')

  if (!compact) return ''

  const groups = compact.match(/.{1,4}/g) || []
  return `POS-${groups.join('-')}`
}

function generateChunk(size = 4) {
  let output = ''
  for (let index = 0; index < size; index += 1) {
    const random = Math.floor(Math.random() * LICENSE_ALPHABET.length)
    output += LICENSE_ALPHABET[random]
  }
  return output
}

function generateLicenseKey() {
  return `POS-${generateChunk()}-${generateChunk()}-${generateChunk()}`
}

async function generateUniqueLicenseKey(container, maxAttempts = 12) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateLicenseKey()

    try {
      const { resource } = await container.item(candidate, candidate).read()
      if (!resource) return candidate
    } catch (error) {
      if (error.code === 404) return candidate
      throw error
    }
  }

  throw new Error('Unable to generate a unique license key.')
}

function maskLicenseKey(licenseKey) {
  const normalized = normalizeLicenseKey(licenseKey)
  const visible = normalized.slice(-4)
  return `POS-****-****-${visible}`
}

module.exports = {
  generateUniqueLicenseKey,
  maskLicenseKey,
  normalizeLicenseKey,
}
