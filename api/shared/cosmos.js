const { CosmosClient } = require('@azure/cosmos')

let cachedContainer = null

function getContainer(config) {
  if (cachedContainer) return cachedContainer

  const hasConnectionString = Boolean(config.cosmosConnectionString)
  const hasEndpointAndKey = Boolean(config.cosmosEndpoint && config.cosmosKey)

  if (!hasConnectionString && !hasEndpointAndKey) {
    throw new Error(
      'Missing Cosmos configuration. Set COSMOS_CONNECTION_STRING (recommended) or COSMOS_ENDPOINT + COSMOS_KEY.',
    )
  }

  const client = hasConnectionString
    ? new CosmosClient(config.cosmosConnectionString)
    : new CosmosClient({
        endpoint: config.cosmosEndpoint,
        key: config.cosmosKey,
      })

  cachedContainer = client.database(config.cosmosDatabase).container(config.cosmosContainer)
  return cachedContainer
}

async function findLicenseByKey(container, licenseKey) {
  try {
    const { resource } = await container.item(licenseKey, licenseKey).read()
    return resource || null
  } catch (error) {
    if (error.code === 404) return null
    throw error
  }
}

async function findLicenseByTransactionId(container, transactionId) {
  const query = {
    query: 'SELECT TOP 1 * FROM c WHERE c.transactionId = @transactionId',
    parameters: [{ name: '@transactionId', value: transactionId }],
  }

  const { resources } = await container.items.query(query).fetchAll()
  return resources[0] || null
}

async function upsertLicense(container, licenseRecord) {
  const { resource } = await container.items.upsert(licenseRecord)
  return resource
}

module.exports = {
  findLicenseByKey,
  findLicenseByTransactionId,
  getContainer,
  upsertLicense,
}
