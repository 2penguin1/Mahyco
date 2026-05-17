# Frontend Developer Guide

React + TypeScript + Vite frontend for the Ionovo parsing platform.

This app drives:
- Playground parsing and run history.
- Batch upload/review flows.
- Workbench datasets, gold data, evaluation runs, and exports.
- Operational dashboards and ARS/system configuration screens.
- Authenticated organization administration pages.

## Tech Stack

- React 18 + TypeScript
- React Router 7
- Vite 7
- Tailwind CSS 4
- Auth0 React SDK (`@auth0/auth0-react`)
- i18next localization

## Prerequisites

- Node.js 20+ (recommended)
- npm
- Backend API reachable at `http://127.0.0.1:8000` (default)

## Environment

Create `frontend/.env` from `frontend/.env.example`.

Required/commonly used variables:

- `VITE_STAGE`: `dev`, `stage`, or `prod` (`dev` disables Auth0 in UI).
- `VITE_API_URL`: backend base URL used by API clients. Defaults to `http://127.0.0.1:8000`.
- `VITE_AUTH0_DOMAIN`: required when `VITE_STAGE` is not `dev`.
- `VITE_AUTH0_CLIENT_ID`: required when `VITE_STAGE` is not `dev`.
- `VITE_AUTH0_AUDIENCE`: optional Auth0 audience for API tokens.

## Local Development

Install and run:

```bash
cd frontend
npm ci
npm run dev
```

Build and preview:

```bash
cd frontend
npm run build
npm run preview
```

## Auth Modes

- `VITE_STAGE=dev`: auth is disabled in the UI (`AuthProvider` uses a mock user/token getter).
- `VITE_STAGE=stage|prod`: Auth0 is enabled and bearer tokens are attached by `apiFetch`.

Constraints:

- Some backend routes are optional-auth, others require valid JWT. In `dev` mode, those protected routes can still return `401`/`403` if backend auth is enabled.
- `API_URL` is compile-time frontend config; a wrong value usually appears as connection errors in API helpers.

## Routing Overview

Main route tree is defined in `src/App.tsx`:

- `/dashboard/playground`: parse, dictionary, rules, benchmark arena.
- `/dashboard/history`: run history and benchmark comparison.
- `/dashboard/batch`: batch jobs, row-level review, verify workflow.
- `/dashboard/workbench`: datasets, gold data, eval runs, entry history.
- `/dashboard/explorer`: explorer workflow page.
- `/dashboard/dashboards/*`: operations, management, and analyzer dashboards.
- `/dashboard/exception-workbench` and `/dashboard/exception-message-processing`: exception handling flows.
- `/dashboard/system/*`: channel profiles, integrations, and notifications.
- `/superuser/*`: superadmin organization/member administration.

## API Integration Map

Primary API modules:

- `src/lib/api/iso20022Service.ts`: `/parse*`, `/runs*`, `/workbench/chat`, batch endpoints.
- `src/lib/api/workbenchService.ts`: datasets, gold data, generation jobs, eval runs, exports.
- `src/lib/api/arsService.ts`: ARS request-bank listing/detail/update/submit endpoints.
- `src/lib/api/orgService.ts`: org membership and superuser org management endpoints.
- `src/lib/api/settingsService.ts`: pipeline settings CRUD.
- `src/lib/api/config.ts`: `API_URL`, timeout, auth header injection.

Notes:

- `apiFetch` is the expected wrapper for authenticated calls; prefer it over direct `fetch` in new API helpers.
- `src/lib/api/geodataService.ts` exists but is not wired into the current route tree.
- Frontend polling is used in high-churn pages (for example eval runs and exports), so backend availability and response time directly affect UX.

## Common Workflows

### 1. Playground smoke test

1. Open `/dashboard/playground`.
2. Submit an address.
3. Confirm `/parse` response renders with field values and debug data.

### 2. Workbench evaluation loop

1. Open `/dashboard/workbench/datasets`.
2. Create/open a dataset and start an eval run.
3. Open `/dashboard/workbench/eval-runs/:runId`.
4. Inspect status, provider comparisons, and export behavior.

For detailed runbook semantics and backend behavior, see:
- `docs/WORKBENCH_EVAL_RUN_RUNBOOK.md`

## Troubleshooting

### Frontend cannot reach backend

Symptoms:
- Toasts like `Cannot connect to server at ...`
- Empty pages waiting on API calls

Checks:
- Confirm backend is running and reachable at `VITE_API_URL`.
- Verify browser can hit `http://127.0.0.1:8000/health` (or your configured URL).
- Restart `npm run dev` after changing `.env`.

### Unexpected auth behavior in local dev

Symptoms:
- UI appears logged in but API returns `401`.

Checks:
- Confirm `VITE_STAGE=dev` for local mock-auth mode.
- If backend enforces JWT on the route, run with real Auth0 config or use routes that support optional auth.

### Route renders but no data

Checks:
- Inspect Network tab for failing endpoint and response payload.
- Verify required backend services are up (API, Postgres, Redis, Celery for async flows).
- Check backend logs for task failures during eval run/export workflows.
