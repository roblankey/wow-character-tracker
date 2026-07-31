# Backend REST API Contract: Battle.net Character Comparison

This is the contract between the `frontend/` SPA and the `backend/`
Fastify API. It is the only interface the frontend uses — it never talks
to Blizzard or SQLite directly. All responses are JSON. All endpoints are
served under `/api`.

## `GET /api/connection`

Returns the current Battle.net connection status.

**Response 200**:
```json
{
  "connected": true,
  "region": "us",
  "connectedAt": "2026-07-30T12:00:00Z",
  "lastSyncedAt": "2026-07-30T12:05:00Z",
  "lastSyncStatus": "success",
  "lastSyncError": null
}
```
When no connection exists: `{ "connected": false }`.

Covers: User Story 1 (roster view needs to know connection state),
FR-001, FR-008.

## `GET /api/connection/authorize`

Redirects the browser to Blizzard's OAuth authorization page. No request
body; this is a browser navigation, not an XHR call.

Covers: FR-001.

## `GET /api/connection/callback`

Blizzard's OAuth redirect target. Exchanges the authorization code for
tokens, fetches the account's character list for the first time, stores
the `BattleNetConnection` and `Character` rows, then redirects the
browser back to the roster page.

**Error behavior**: on failure (denied consent, token exchange failure),
redirects back to the frontend with an error indicator the UI surfaces to
the user rather than a blank/broken page (Principle III).

Covers: FR-001, User Story 1 acceptance scenario 1.

## `DELETE /api/connection`

Revokes and deletes the current `BattleNetConnection` (cascade-deletes
its `Character` rows).

**Response 204**, empty body.

Covers: FR-009.

## `GET /api/characters`

Returns the full roster for the current connection, including characters
flagged as removed (so the UI can decide how to present them, per the
Edge Cases in spec.md).

**Response 200**:
```json
{
  "characters": [
    {
      "id": 1,
      "name": "Thrallmar",
      "realmName": "Area 52",
      "faction": "Horde",
      "class": "Warrior",
      "race": "Orc",
      "level": 80,
      "itemLevel": 489,
      "activeSpec": "Protection",
      "professions": [{ "name": "Blacksmithing", "skillLevel": 100 }],
      "isRemoved": false,
      "updatedAt": "2026-07-30T12:05:00Z"
    }
  ]
}
```

Covers: FR-002, FR-003, FR-007, User Story 1 and 2.

## `POST /api/characters/refresh`

Triggers an on-demand sync against the Blizzard API for the current
connection: fetches the latest character list, upserts matching
characters, flags missing ones as removed, and updates
`BattleNetConnection.lastSyncedAt` / `lastSyncStatus` / `lastSyncError`.

**Response 200** (success):
```json
{ "lastSyncedAt": "2026-07-30T12:10:00Z", "lastSyncStatus": "success" }
```

**Response 200** (failure, e.g. Blizzard API unavailable — not a 5xx,
since the app itself handled the failure gracefully):
```json
{
  "lastSyncStatus": "failure",
  "lastSyncError": "Blizzard API did not respond",
  "lastSyncedAt": "2026-07-30T12:05:00Z"
}
```
The previous `lastSyncedAt`/roster data is left untouched so the frontend
can keep showing the last good data labeled with its retrieval time.

Covers: FR-005, FR-008, User Story 3.

## No dedicated "compare" endpoint

Comparison is computed client-side in `frontend/` from the already-fetched
`GET /api/characters` response (see data-model.md's "Derived,
non-persisted concept: Comparison"). This avoids a redundant network
round-trip for data the frontend already has, per the constitution's
Performance principle.

Covers: FR-004, User Story 2.
