
# Dual Currency POS System UI

This is a code bundle for Dual Currency POS System UI. The original project is available at https://www.figma.com/design/YOwSuU6juW9KRtPu8PaRK1/Dual-Currency-POS-System-UI.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## License activation setup

Create a `.env` file with:

```bash
VITE_LICENSE_API_BASE_URL=https://abiad.systems/api
```

The app now requires one-time online activation using a valid license key. After activation, the app runs offline from local storage.

## Known Issues (In Progress) / ثغرات معروفة (تحت التطوير)

Status update (2026-05-01): the previously tracked issues in this section were resolved in the current workspace.

Resolved items:
1. `DebtReportModal` now receives `settings` from `App.tsx`.
2. Keyboard shortcut display now matches implemented behavior, including function keys and Ctrl combinations.
3. Analytics `hourlySales` now derives from real completed transactions.
4. `ProductCard` no longer nests interactive buttons inside a parent `<button>`.
5. A testing suite has been added using `Vitest` with initial unit tests.
  
