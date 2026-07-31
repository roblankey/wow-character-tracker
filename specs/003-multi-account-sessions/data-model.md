# Phase 1 Data Model: Multi-Account Support Across Browser Sessions

This feature changes the existing `battleNetConnection` table from feature 001
(`specs/001-battlenet-character-comparison/data-model.md`) and introduces one new,
non-persisted concept (the browser session). No changes to `character`, and no new tables.

## Change to `BattleNetConnection` (existing entity)

| Field | Type | Notes |
|---|---|---|
| `sessionId` | text, not null | **New.** The opaque id (from the signed session cookie) of the browser session that owns this connection. Replaces the previous "always exactly one row in the whole table" invariant with "at most one row per `sessionId`", enforced by a new unique index (`battlenet_connection_session_id_idx`). |
| `battletag` | text, not null | **New.** The connected account's Battle.net tag (e.g. `Playername#1234`), returned by `fetchUserInfo` during the OAuth callback and previously discarded. Lets a session's UI show which account it's viewing (SC-004). |

All other `BattleNetConnection` fields (`battlenetAccountId`, `region`, `accessToken`,
`tokenExpiresAt`, `connectedAt`, `lastSyncedAt`, `lastSyncStatus`, `lastSyncError`) are
unchanged. The `id`/`connectedAt`/etc. semantics per row are unchanged — a row still represents
one connected Battle.net account; it's just no longer implicitly "the" connection, only "a"
session's connection.

**Uniqueness rule** (replaces FR-010 from feature 001, now session-scoped instead of
app-global): at most one `battleNetConnection` row per `sessionId`. Connecting a new account
within a session deletes that session's existing row (cascade-deleting its characters) and
inserts a new one, exactly as the old "replace the single row" logic did — just filtered by
`sessionId` instead of operating on the whole table.

## No change to `Character` (existing entity)

`character` still references `battleNetConnection` via `connectionId` with cascade delete.
Because a connection is now owned by exactly one session, and a character is owned by exactly
one connection, characters are already transitively session-scoped through the existing
`connectionId` foreign key — no new column needed on `character`.

## New, non-persisted concept: Browser Session

Matches spec.md's Key Entities section. Not a database table — physically, a "session" is just
the value of a signed cookie plus whatever `battleNetConnection` row (if any) currently has that
value as its `sessionId`. A session with no connection yet has no representation anywhere except
the cookie sitting in a browser jar.

**Lifecycle**:
- Browser makes any `/api` request with no valid session cookie → `onRequest` hook generates a
  new session id, sets it on the response, request proceeds treated as a fresh, disconnected
  session (no matching `battleNetConnection` row yet).
- Session connects a Battle.net account → a `battleNetConnection` row is created with that
  session's id (replacing any prior row for the same id, per the uniqueness rule above).
- Session refreshes/disconnects → existing row for that `sessionId` is updated / deleted; no
  other session's row is touched (FR-003).
- Browser session ends (e.g. incognito window closed) without disconnecting → the
  `battleNetConnection` row (and its characters) remain in storage, keyed by a `sessionId` whose
  cookie no longer exists anywhere, per FR-008 and the resolved retention clarification. This
  data is inert (unreachable through the UI, since nothing can present that `sessionId` again)
  but is not deleted.

## Migration path

See research.md's "Migration: clearing the existing single connection" for the exact statement
ordering. In summary: existing `battlenet_connection` and `character` rows are deleted (per the
resolved FR-007 clarification — no auto-migration into a session), then `session_id` and
`battletag` are added as `NOT NULL` columns, then the unique index on `session_id` is created.
