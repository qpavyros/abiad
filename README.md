# DualPOS Marketing Site

Marketing + legal website built with React, Vite, and Tailwind CSS.

## Environment variables (frontend)

Copy `.env.example` to `.env` and set:

```bash
VITE_PADDLE_ENV=production
VITE_PADDLE_CLIENT_TOKEN=live_xxx
VITE_PADDLE_PRICE_ID=pri_xxx
```

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Azure Static Web Apps deployment

- This repository is connected to Azure Static Web Apps through GitHub Actions.
- Deployment workflow file:
  - `.github/workflows/azure-static-web-apps-polite-bay-06c45e903.yml`
- React Router refresh handling is configured in:
  - `public/staticwebapp.config.json`
- API functions are in:
  - `api/`

## License API (Azure Functions in `api/`)

Set these app settings in Azure Static Web Apps:

```bash
PADDLE_API_KEY=pdl_live_xxx
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx
PADDLE_LIFETIME_PRICE_ID=pri_xxx
COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_KEY=<primary-key>
COSMOS_DATABASE=dualpos
COSMOS_CONTAINER=licenses
SUPPORT_EMAIL=support@abiad.systems
WEBSITE_URL=https://abiad.systems
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=support@abiad.systems
CORS_ALLOWED_ORIGINS=https://abiad.systems,https://www.abiad.systems
```

Paddle webhook URL:

```text
https://abiad.systems/api/licenses/webhook/paddle
```

Default production URL:
- https://polite-bay-06c45e903.7.azurestaticapps.net
