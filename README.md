# WoWster Character Tracker

Connect your Battle.net account, see your World of Warcraft characters in one
roster, compare them side-by-side, and refresh on demand. Click a character
to open a detail panel with its full stats and Blizzard character image. A
locally-run, single-user app: a TypeScript/Fastify backend that owns the
Battle.net OAuth flow and a local SQLite database, and a TypeScript/React
frontend.

See `specs/001-battlenet-character-comparison/` and
`specs/002-character-detail-panel/` for the full spec, plan, and task
breakdown of each feature.

## Prerequisites

- Node.js 22 LTS or newer (required by `better-sqlite3`'s native bindings)
- A Battle.net developer application — register one at
  https://develop.battle.net and note its client ID and secret

## Setup

1. Install dependencies:

   ```sh
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. Configure the backend. Copy `backend/.env.example` to `backend/.env` and
   fill in:
   - `BATTLENET_CLIENT_ID` / `BATTLENET_CLIENT_SECRET` — from your Battle.net
     developer application
   - `BATTLENET_REDIRECT_URI` — must exactly match the redirect URI
     configured on that application (defaults to
     `http://localhost:3001/api/connection/callback`)
   - `BATTLENET_REGION` — `us`, `eu`, `kr`, or `tw`
   - `TOKEN_ENCRYPTION_KEY` — a 64-character hex string used to encrypt
     stored OAuth tokens; generate one with:

     ```sh
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

3. Run the database migration to create the local SQLite file:

   ```sh
   cd backend && npm run db:migrate
   ```

## Running in development

In two terminals:

```sh
cd backend && npm run dev    # Fastify API on http://localhost:3001
cd frontend && npm run dev   # Vite dev server on http://localhost:5173, proxies /api to the backend
```

Open http://localhost:5173 and connect your Battle.net account.

## Testing and linting

Each package is self-contained:

```sh
cd backend  && npm run lint && npm run typecheck && npm test
cd frontend && npm run lint && npm run build && npm test
```

CI (`.github/workflows/ci.yml`) runs the same checks on every pull request.

## Project layout

```text
backend/    Fastify API, Battle.net OAuth + Blizzard API client, Drizzle/SQLite storage
frontend/   React SPA (roster + comparison views)
specs/      Spec Kit feature spec, plan, and tasks for this feature
```
