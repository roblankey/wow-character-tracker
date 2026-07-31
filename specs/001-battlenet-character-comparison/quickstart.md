# Quickstart: Battle.net Character Comparison

Validation guide for proving the feature works end-to-end. See
`data-model.md` for entity details and `contracts/api.md` for the exact
API shapes referenced below.

## Prerequisites

- Node.js 20 LTS and a package manager (npm/pnpm)
- A Battle.net developer application (client ID + secret) from
  https://develop.battle.net, with its OAuth redirect URI set to this
  app's `GET /api/connection/callback` endpoint
- A WoW-owning Battle.net test account with at least two characters, to
  validate the comparison view

## Setup

1. Install dependencies in `backend/` and `frontend/`.
2. Configure the backend with the Battle.net client ID/secret and OAuth
   redirect URI (environment variables — exact names finalized during
   implementation).
3. Run the backend's database migration (Drizzle) to create the local
   SQLite file with the `BattleNetConnection` and `Character` tables from
   `data-model.md`.
4. Start the backend (serves `/api/*`) and the frontend (Vite dev server
   proxied to the backend, or the backend serving the built frontend).

## Validation scenarios

Each scenario below maps to an acceptance scenario in `spec.md`.

### 1. Connect account and view roster (User Story 1)

- Open the app, trigger `GET /api/connection/authorize`, complete
  Blizzard's consent screen with a test account that owns WoW characters.
- **Expect**: redirected back to the roster page within 30 seconds
  (SC-001); `GET /api/characters` returns every character on that account
  with name, class, realm, and faction populated.
- Repeat with a test account that owns no WoW characters.
- **Expect**: roster page shows an explicit empty state, not an error.

### 2. Compare characters (User Story 2)

- With a roster of 2+ characters, select two and open the comparison
  view.
- **Expect**: attributes that differ (level, item level, spec,
  professions) are visually highlighted; attributes that match are not.
- Select two characters with identical tracked attributes.
- **Expect**: the view explicitly states there are no differences.
- With only one character in the roster, attempt to open the comparison
  view.
- **Expect**: the app explains at least two characters are needed, rather
  than showing a broken/empty comparison.

### 3. Refresh data (User Story 3)

- Change something about a character in-game (e.g., level up, equip
  higher item level gear).
- Call `POST /api/characters/refresh`.
- **Expect**: `GET /api/characters` reflects the updated value within 2
  minutes of the request (SC-004), and `GET /api/connection` shows an
  updated `lastSyncedAt` with `lastSyncStatus: "success"`.
- Simulate a Blizzard API failure (e.g., point the backend at an invalid
  API host temporarily) and call refresh again.
- **Expect**: `lastSyncStatus` becomes `"failure"` with a populated
  `lastSyncError`, but `GET /api/characters` still returns the last good
  data rather than an empty/broken response.

### 4. Character removed from account (edge case)

- Using a test account, note a character in the roster, then (if
  feasible in the test environment) transfer or delete it in-game so it
  no longer appears in Blizzard's account character list.
- Call refresh.
- **Expect**: that character's `isRemoved` becomes `true` in
  `GET /api/characters` rather than the row disappearing outright.

### 5. Disconnect (FR-009)

- Call `DELETE /api/connection`.
- **Expect**: `GET /api/connection` reports `connected: false`, and
  `GET /api/characters` returns an empty roster (rows cascade-deleted per
  data-model.md).
