# Phase 0 Research: Multi-Account Support Across Browser Sessions

## Session identification mechanism

**Decision**: A single opaque random session id, generated with `randomUUID()`, carried in a
signed, `httpOnly`, `sameSite=Lax`, host-only cookie (no `Domain` attribute) set by a new
`onRequest` hook that runs before every `/api` route. If the incoming request has no valid,
correctly-signed session cookie, the hook generates one, sets it on the reply, and attaches it
to the request (e.g. `request.sessionId`) so every route handler can read it synchronously. No
separate in-memory or DB-backed "sessions" table is introduced — the session id *is* the DB
column value routes filter/write by (`battleNetConnection.sessionId`); a session with no
connection yet simply has no matching row.

**Rationale**: Matches spec.md's Assumption that a "browser session" is whatever the browser
itself naturally distinguishes (separate cookie jars per incognito window / profile), not an
in-app login. A cookie is the only mechanism that satisfies that without adding credentials.
Signing (via `@fastify/cookie`'s built-in HMAC signing, keyed by a new `SESSION_COOKIE_SECRET`
env var validated at startup the same way `TOKEN_ENCRYPTION_KEY` is) stops a request from
forging or guessing another session's id and being handed its connection — the session id is
this app's only access-control boundary once introduced, so it should not be trivially
tamperable even though the app is meant to run locally.

**Alternatives considered**: A server-side session store (e.g. `@fastify/session` backed by
DB-persisted session rows with expiry) — rejected as speculative for a locally-run, single-
machine app; FR-008 already requires indefinite retention keyed by whatever id the cookie
carries, which a plain signed cookie provides directly without an extra table or expiry-sweep
job. Embedding richer state (e.g. account id) directly in the cookie instead of using it purely
as an opaque key — rejected because the DB row is already the source of truth for connection
state, and keeping the cookie payload to a bare id avoids two places that can disagree.

## Session cookie scope across the OAuth detour

**Decision**: The OAuth callback attributes the resulting connection to a session by looking up
the `state` parameter in the existing CSRF `state` map (`routes/connection.ts`), which now
stores the initiating session id alongside the existing expiry — not by reading whatever
session cookie (if any) is present on the callback request itself. The callback response does
not attempt to set a session cookie.

**Rationale**: This app's frontend dev server proxies `/api` to the backend
(`frontend/vite.config.ts`), so a normal `/api/connection/authorize` request — and the session
cookie the `onRequest` hook sets on its response — is scoped to the frontend's origin
(`localhost:5173`), which the browser reached through the proxy. But per the existing
`connection.ts` comment and CLAUDE.md, Blizzard redirects the browser **directly** to the
backend's own port (`BATTLENET_REDIRECT_URI`, e.g. `localhost:3001/api/connection/callback`),
bypassing the frontend dev proxy entirely. From the browser's perspective those are two
different origins (different port = different origin), so the `localhost:5173`-scoped session
cookie is never sent on that direct callback request — reading `request.cookies` there would
see nothing (or, in a multi-session scenario, could not be trusted even if something were
present). The `state` map, keyed by a value the backend itself generated and only the
legitimate in-flight authorize attempt knows, is the one piece of server-side truth that
survives this cross-origin detour intact, so it — not the request's cookie — must be the
attribution source. This also directly satisfies the FR-004 edge case (attribute correctly even
if the "active" session at callback time differs from the one that started the flow) as a
natural consequence, not a special case.

The frontend-facing session cookie itself doesn't need to be re-set on the callback response: it
was already established on the *first* request the browser ever made through the proxy — which,
for a brand-new session, is the `/api/connection/authorize` request itself, before the browser
ever leaves for Battle.net — and that cookie sits untouched in the browser's jar for
`localhost:5173` for the whole battle.net detour, ready to be sent again the moment the callback
redirects the browser back to `config.frontendUrl`.

**Alternatives considered**: Passing the session id through the OAuth `state` or `redirect_uri`
query string instead of a server-side map lookup — rejected as it would leak an
attacker-guessable-if-intercepted identifier through a value that transits a third party
(Blizzard) and browser history, where the existing random, single-use, TTL'd `state` map entry
already exists and is a strictly better place to carry one more field. Making the callback set
its own cookie on port 3001 "just in case" — rejected as actively misleading: a cookie scoped to
port 3001 is never sent on subsequent proxied frontend calls (which all go browser→5173→3001),
so it would sit unused while looking like it does something.

## Migration: clearing the existing single connection

**Decision**: The Drizzle migration for this feature issues, in order: `DELETE FROM character;`,
`DELETE FROM battlenet_connection;`, then `ALTER TABLE battlenet_connection ADD session_id text
NOT NULL`, `ALTER TABLE battlenet_connection ADD battletag text NOT NULL`, and
`CREATE UNIQUE INDEX ... ON battlenet_connection (session_id)`. Neither new column needs a
`DEFAULT` clause.

**Rationale**: FR-007 requires the pre-existing single connection to be cleared, not migrated,
when this ships. Deleting first also sidesteps SQLite's restriction on adding a `NOT NULL`
column without a default to a non-empty table — there's no existing row left to need a
placeholder value for either `session_id` or `battletag` by the time the columns are added
(verified directly against this project's better-sqlite3/SQLite version: `ALTER TABLE ... ADD
COLUMN ... NOT NULL` with no default succeeds against an empty table). Note that SQLite also has
no `ALTER TABLE ... ALTER COLUMN ... DROP DEFAULT` statement at all, so an earlier draft of this
decision — adding `battletag` with `DEFAULT ''` and then "dropping the default" — wasn't just
unnecessary but inexecutable; plain `NOT NULL` with no default, exactly like `session_id`, is
both correct and sufficient. `character` rows are deleted explicitly (rather than relying on the
`battlenet_connection` cascade) so the migration reads as intentional rather than incidental.

**Alternatives considered**: Auto-generating a session id for the existing connection so its
owner doesn't have to reconnect — rejected per the resolved FR-007 clarification (explicit user
decision: clear and require reconnect, since a synthetic "migrated" session id wouldn't
correspond to any real browser's cookie anyway, so it could never actually be reached again
through the UI).

## Surfacing which account a session is viewing

**Decision**: Persist the Battle.net `battletag` (already returned by `fetchUserInfo` during the
OAuth callback, previously read and discarded) on the `battlenet_connection` row, return it from
`GET /api/connection`, and render it in `ConnectionStatus` (e.g. "Connected as
`Playername#1234`").

**Rationale**: Directly satisfies SC-004 ("users can distinguish, without ambiguity, which
account's data they're viewing"). Today's connection status shows only region and last-synced
time, neither of which distinguishes two sessions connected to different accounts in the same
region. The data is already fetched at no extra cost (no new Blizzard API call) — this is a
one-column, no-new-request addition, not scope creep.

**Alternatives considered**: Deriving a distinguishing label from character data (e.g. first
character's name) — rejected as fragile (a fresh connection with no synced characters yet, or an
account with zero characters, would have nothing to show) where `battletag` is always available
immediately after connecting.
