# DualPOS Marketing Site

Marketing + legal website built with React, Vite, and Tailwind CSS.

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

Default production URL:
- https://polite-bay-06c45e903.7.azurestaticapps.net
