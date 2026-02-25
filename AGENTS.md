# AGENTS.md

## Cursor Cloud specific instructions

Klary is a client-side-only React SPA (calendar/date-range visualization) built with Vite. There is no backend, database, or external service dependency.

### Running the app

- **Dev server**: `npm run dev` (serves on port 5173 by default; use `--host 0.0.0.0` to expose externally)
- **Build**: `npm run build` (outputs to `dist/`)
- **Preview production build**: `npm run preview`

### Notes

- No ESLint or linter configuration exists in this repo. There is no `lint` script in `package.json`.
- No automated test framework is configured. There is no `test` script in `package.json`.
- All application state is stored in the browser's `localStorage`; no `.env` files or secrets are needed.
- The project uses npm as its package manager (`package-lock.json`).
