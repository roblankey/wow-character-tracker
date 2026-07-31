# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A locally-run, single-user app: connect a Battle.net account, view WoW characters in one
roster, and refresh on demand. TypeScript/Fastify backend (Battle.net OAuth + local SQLite
via Drizzle); TypeScript/React frontend. Two independent npm packages, `backend/` and
`frontend/`, each self-contained with their own lint/typecheck/test/build.

Full spec, plan, and task breakdown for each feature live under `specs/<NNN-feature-name>/`
(Spec Kit format: spec.md, plan.md, tasks.md, data-model.md, contracts/api.md, quickstart.md).

## Commands

Backend (`cd backend`):
```sh
npm run dev          # tsx watch, Fastify API on :3001, loads .env
npm run build        # tsc -p tsconfig.build.json
npm run typecheck     # tsc -p tsconfig.json (no emit)
npm test             # vitest run
npm run test:watch   # vitest watch mode
npx vitest run tests/unit/sync.test.ts   # run a single test file
npm run lint          # eslint .
npm run format        # prettier --check .
npm run db:migrate    # apply migrations, creates the local sqlite file
npm run db:generate   # drizzle-kit generate, after editing src/db/schema.ts
```

Frontend (`cd frontend`):
```sh
npm run dev      # Vite dev server on :5173, proxies /api -> localhost:3001
npm run build    # tsc -b && vite build
npm test         # vitest run
npm run test:watch
npx vitest run tests/unit/RosterTable.test.tsx   # run a single test file
npm run lint
npm run format
```

CI (`.github/workflows/ci.yml`) runs, per package: lint, format check, typecheck (backend
only), build, test. Both packages must pass independently — there is no root-level script.

## Architecture

### Backend (`backend/src`)

Request flow: `server.ts` builds the Fastify app and decorates it with an `appContext`
(`{ db, config }`) that every route reads via `app.appContext` — routes are plain functions
registered with `app.register(...Routes, { prefix: '/api' })`, not classes or DI containers.

- `config.ts` — reads env vars once (`getConfig`, memoized), validates `TOKEN_ENCRYPTION_KEY`
  is exactly 32 bytes and `SESSION_COOKIE_SECRET` is at least 32 characters.
  `resetConfigCacheForTests()` exists for test isolation.
- `db/schema.ts` — Drizzle schema, two tables: `battleNetConnection` (scoped by `sessionId`,
  unique-indexed — at most one row per browser session, not one row for the whole app; see
  `plugins/session.ts`) and `character` (FK to connection, cascade-deletes on disconnect).
  `professions` is stored as a JSON-encoded text column, not a join table.
- `db/client.ts` — `better-sqlite3` + Drizzle, WAL mode, foreign keys on.
- `db/crypto.ts` — AES-256-GCM encrypt/decrypt for OAuth tokens at rest
  (`iv:authTag:ciphertext`, each base64). Access tokens are never stored in plaintext.
- `plugins/session.ts` — assigns every request a signed, long-lived, `httpOnly`,
  `sameSite=Lax`, host-only session cookie (`wowster_session`) via `@fastify/cookie`, generating
  a fresh id when none is present or the signature doesn't verify. Wrapped with `fastify-plugin`
  so `request.sessionId` and the `onRequest` hook apply globally, not just within the plugin's
  own encapsulated scope. This is the sole mechanism distinguishing browser sessions — every
  route below filters/writes by `request.sessionId` rather than assuming a single global row.
- `battlenet/oauth.ts` — Battle.net OAuth (authorize URL, code exchange, userinfo). Battle.net's
  user-authorization flow issues **no refresh token**; an expired token can only be resolved by
  the user reconnecting (which replaces the stored connection).
- `battlenet/client.ts` — Blizzard Game Data/Profile API client. `fetchFullCharacterRoster`
  fetches the account's character list, then per character fetches summary (item level, spec),
  professions, and media (image) — 3 extra calls per character, so this is where rate limiting
  (HTTP 429) is most likely; `blizzardFetch` retries with exponential backoff honoring
  `Retry-After`. Per-character 404s (Blizzard hasn't indexed some characters) are tolerated via
  `fetchCharacterDetail`'s fallback and don't fail the whole sync; other errors propagate.
- `services/sync.ts` — `syncCharacters` orchestrates a full roster refresh: decrypts the token
  (rejecting if expired), fetches the roster, upserts each character by
  `battlenetCharacterId`, and marks any character no longer returned by Blizzard as
  `isRemoved: true` (soft delete — never hard-deleted, so removed characters remain visible
  with their last-known data). Never throws: outcome is written to
  `lastSyncStatus`/`lastSyncError` on the connection row and returned as a `SyncResult`, so a
  failed sync leaves the last good roster intact and visible.
- `routes/connection.ts` — `GET/DELETE /api/connection`, `GET /api/connection/authorize`
  (redirects to Battle.net), `GET /api/connection/callback` (OAuth callback: exchanges code,
  replaces the *caller's session's* existing connection — at most one per session, not one for
  the whole app — then triggers an initial `syncCharacters`). CSRF `state` is tracked in an
  in-memory `Map` with a 10-minute TTL, keyed alongside the session id that initiated the
  authorize attempt; the callback attributes the resulting connection to *that* session id, not
  whatever cookie the callback request itself carries — Blizzard redirects the browser directly
  to this backend endpoint, bypassing the frontend dev proxy the session cookie was originally
  set through, so the callback request's own cookie can't be trusted for attribution. The
  callback redirects back to `config.frontendUrl` as an absolute URL for the same reason.
- `routes/characters.ts` — `GET /api/characters` (returns the caller's session's stored roster,
  professions JSON parsed back into objects; empty list if the session has no connection),
  `POST /api/characters/refresh` (re-runs `syncCharacters` for the caller's session's
  connection; 409 if none connected).

### Frontend (`frontend/src`)

Single page (`pages/RosterPage.tsx`) composing connection status, refresh, roster table, and
character detail panel. `api/client.ts` is the only place that calls the backend — a thin
`fetch` wrapper (`apiClient`) typed against the same DTOs the backend routes return; all
components consume `apiClient`, never call `fetch` directly. Dev server proxies `/api` to the
backend on `:3001` (see `vite.config.ts`), so the client always calls relative `/api/...` paths.

### Testing conventions

Backend tests (`backend/tests`) split into `unit/`, `contract/` (route-level request/response
shape), and `integration/` (full flows like connect/disconnect/refresh end-to-end).
`tests/helpers/testApp.ts` builds a fully wired app against an in-memory (`:memory:`) SQLite db
with migrations applied — use `buildTestApp()` rather than mocking `db`/`config` individually.
Per the project constitution, prefer real integration tests over mocking for character
persistence, sync, and any Blizzard API-touching logic.

Frontend tests (`frontend/tests`) split into `unit/` (component-level, Testing Library) and
`integration/` (page-level flows like refresh). `tests/setup.ts` wires jsdom + jest-dom matchers.

## Project-specific conventions (from `.specify/memory/constitution.md`)

- No speculative abstraction (YAGNI); comments only for non-obvious rationale.
- Bug fixes need a regression test that fails before the fix and passes after.
- User-facing terminology must match official WoW terminology (classes, specs, professions,
  gear slots, etc.).
- Every view handles loading and error states explicitly and visibly — no silent failures.
- Calls to the Blizzard API must be cached/rate-limited; don't add redundant calls for
  unchanged data.
- Any change to stored character data's schema/format needs a migration path — never silently
  lose or corrupt existing users' local data.
