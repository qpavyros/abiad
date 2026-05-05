# DualPOS License API (Azure Functions)

This folder contains the backend endpoints used for:

- Receiving Paddle webhook events after successful payment.
- Generating and storing unique license keys.
- Sending license keys by email.
- Activating license keys from the POS app.

## Endpoints

- `POST /api/licenses/webhook/paddle`
- `POST /api/licenses/activate`
- `GET /api/health`

## Required Azure App Settings

```text
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_LIFETIME_PRICE_ID=
COSMOS_CONNECTION_STRING=
COSMOS_DB_NAME=DualPOS
COSMOS_CONTAINER_NAME=licenses
SUPPORT_EMAIL=support@abiad.systems
WEBSITE_URL=https://abiad.systems
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=support@abiad.systems
CORS_ALLOWED_ORIGINS=https://abiad.systems,https://www.abiad.systems
```

Optional legacy alternative:

```text
COSMOS_ENDPOINT=
COSMOS_KEY=
COSMOS_DATABASE=
COSMOS_CONTAINER=
```

## Cosmos container shape

Create container `licenses` with:

- **Partition key**: `/id` (recommended)
- **ID field**: `licenseKey` string (same value as `id`)

Sample record:

```json
{
  "id": "POS-ABCD-1234-EFGH",
  "licenseKey": "POS-ABCD-1234-EFGH",
  "transactionId": "txn_xxx",
  "customerEmail": "buyer@example.com",
  "status": "active",
  "createdAt": "2026-05-05T15:00:00.000Z",
  "activatedAt": null
}
```
