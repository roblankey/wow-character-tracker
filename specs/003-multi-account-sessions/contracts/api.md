# Backend REST API Contract Changes: Multi-Account Support Across Browser Sessions

Every existing `/api/connection*` and `/api/characters*` endpoint from features 001/002
(`specs/001-battlenet-character-comparison/contracts/api.md`) now operates on the caller's
session instead of the single global row. No endpoints are removed; one response field is
added; a session cookie is introduced as a cross-cutting concern on every response.

## Cross-cutting: session cookie

Every response from any `/api/*` route sets a session cookie (name TBD at implementation time,
e.g. `wowster_session`) if the request didn't already present a valid, correctly-signed one.
`httpOnly`, `sameSite=Lax`, no `Domain` attribute (host-only), long-lived (per FR-008's
indefinite-retention decision). Clients never need to read or set this cookie themselves — it's
carried automatically by the browser on same-origin requests through the existing Vite dev
proxy (see research.md).

## `GET /api/connection` (changed)

Now resolves the connection by the caller's session id instead of `limit(1)` on the whole
table. Adds one field, `battletag`.

**Response 200** (connected):

```json
{
  "connected": true,
  "battletag": "Playername#1234",
  "region": "us",
  "connectedAt": "2026-07-30T12:00:00Z",
  "lastSyncedAt": "2026-07-30T12:05:00Z",
  "lastSyncStatus": "success",
  "lastSyncError": null
}
```

**Response 200** (no connection for this session):

```json
{ "connected": false }
```

Covers: FR-002 (session-scoped read).

## `GET /api/connection/authorize` (changed)

Behavior unchanged from the caller's perspective (redirects to Battle.net). Internally, the
issued CSRF `state` is now recorded together with the caller's session id, not just an expiry.

Covers: FR-001, FR-004 (the session id captured here is what the callback later attributes the
connection to).

## `GET /api/connection/callback` (changed)

Looks up the caller's session id from the `state` map entry (not from any cookie on this
specific request — see research.md for why) and creates/replaces **that session's**
`battleNetConnection` row, rather than deleting and replacing the single global row. Also
persists `battletag` from the existing `fetchUserInfo` call.

Covers: FR-001, FR-004, FR-006 (no error if the same account is already connected in another
session), FR-007 (this route no longer has a pre-existing legacy row to contend with post-
migration).

## `DELETE /api/connection` (changed)

Deletes only the caller's session's `battleNetConnection` row (cascade-deletes its characters),
not the whole table.

**Response**: 204, unchanged.

Covers: FR-003 (disconnecting one session doesn't touch others).

## `GET /api/characters` (changed)

Returns only characters belonging to the caller's session's connection (empty list if none).
Response shape per character is unchanged from feature 002.

```json
{ "characters": [ /* unchanged shape, feature-002 contract */ ] }
```

Covers: FR-002.

## `POST /api/characters/refresh` (changed)

Resolves the connection to refresh by the caller's session id instead of `limit(1)`. `409` when
the caller's session has no connection (same status code as before, now session-scoped instead
of app-scoped).

**Response**: unchanged shape.

Covers: FR-002, FR-003 (refreshing one session's roster never touches another session's data).

## No new endpoints

Session identity is carried entirely via cookie; no endpoint exposes or accepts a session id
directly, and no "list my sessions" or "switch session" endpoint is introduced (out of scope
per spec.md's Assumptions — sessions are distinguished by the browser, not an in-app switcher).
