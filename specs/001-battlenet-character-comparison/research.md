# Phase 0 Research: Battle.net Character Comparison

## Deployment model: single-user local app

**Decision**: Treat the app as a single-user, locally-run tool — one
backend process, one SQLite file, one Battle.net connection at a time. No
application-level login/user-account system is built.

**Rationale**: The spec's own assumptions state a single Battle.net
account is connected per user (FR-010) and data is stored in a local
SQLite database, not a shared multi-tenant store. Adding a user/auth layer
on top of Battle.net's own OAuth would be scope the spec doesn't ask for
and would violate the constitution's Code Quality principle (no
speculative abstraction / YAGNI).

**Alternatives considered**: Multi-tenant SaaS with its own login system
and per-user data isolation — rejected as out of scope; nothing in the
spec asks for multiple people to use the same running instance.

## Backend web framework

**Decision**: Fastify.

**Rationale**: Native TypeScript-friendly design, built-in JSON schema
validation for request/response contracts (which directly supports
Principle III's requirement that error/loading states be explicit,
contract-level concerns), and lower overhead than Express for a small
local API. Its `inject()` helper also makes contract/integration testing
straightforward without spinning up a real network port, fitting the
Testing Standards principle's preference for real request/response
integration tests.

**Alternatives considered**: Express — more ubiquitous but weaker native
TS/schema support, requiring extra libraries to get equivalent validation.

## SQLite access / ORM

**Decision**: Drizzle ORM with the `better-sqlite3` driver.

**Rationale**: Drizzle is TypeScript-first — schema definitions double as
compile-time-checked query types, which supports Code Quality's emphasis
on clarity and typed boundaries. `better-sqlite3` is synchronous, which
suits a small local single-writer app and avoids unnecessary async
complexity (YAGNI). Drizzle's migration tooling (`drizzle-kit`) gives an
explicit, reviewable migration path, which the constitution's Development
Workflow section requires for any change to stored data's schema.

**Alternatives considered**: Prisma — heavier generated client and a
separate query engine binary, more than this small local app needs. Raw
`better-sqlite3` with hand-written SQL — rejected because it loses
compile-time type safety on queries, increasing the risk of silent
data-handling bugs the Code Quality principle explicitly calls out.

## Frontend framework

**Decision**: React + Vite, TypeScript throughout.

**Rationale**: The spec did not mandate a specific frontend framework,
only "TypeScript for both the front and back end." React + Vite is the
most common combination for a small TS SPA, has mature component-testing
support (React Testing Library) that fits the Testing Standards
principle, and its component model naturally supports the constitution's
requirement for one consistent, reusable visual language across every
view (a shared `RosterTable` component rather than per-page one-offs).

**Alternatives considered**: Vue and Svelte — both viable, but React was
chosen for its larger ecosystem of accessible table UI patterns, which
reduces the risk of ad hoc, inconsistent UI work.

## Test runner

**Decision**: Vitest for both backend and frontend unit/integration
tests.

**Rationale**: Native TypeScript/ESM support with no extra transpile
config, Jest-compatible API (so React Testing Library works unchanged),
and one runner/config style across both halves of the app, which keeps
the Testing Standards workflow uniform.

**Alternatives considered**: Jest — mature, but requires more TS/ESM
configuration than Vitest for this stack.

## Battle.net OAuth and data-sync approach

**Decision**: Backend performs the OAuth 2.0 Authorization Code flow
against Battle.net (not Client Credentials — account-scoped character
data requires the user to authorize access to their own account). The
backend exchanges the code for an access token, stores it in SQLite, and
is the only part of the system that ever calls the Blizzard Game
Data/Profile APIs. Character data is fetched only at connect-time and on
explicit user-triggered refresh (FR-005) — never polled — and each
refresh upserts the latest snapshot per FR-006 (no history retained).
Characters returned by the account endpoint that are missing from a new
sync are flagged as removed rather than deleted outright, so the roster
can explain what happened (FR-007) instead of silently vanishing rows.

**Confirmed against the live Blizzard API during implementation**:
Battle.net's user-authorization token response does not include a
`refresh_token` — there is no refresh-token grant available for this
flow. An expired access token can't be silently renewed; a sync against
an expired token fails with a clear "reconnect your account" error
(FR-008), and reconnecting goes through the same FR-010
replace-existing-connection path already used for the initial connect.
This also means the OAuth callback redirect must be an absolute URL to
the frontend's origin, not a relative path — Blizzard redirects the
browser directly to the backend's callback URL, bypassing the frontend
dev proxy, so a relative redirect resolves against the backend's own
origin instead.

**Rationale**: Matches the constitution's Performance principle (no
redundant/polling calls, on-demand only) and the spec's explicit FR-005
(manual refresh) and FR-006 (snapshot-only) requirements. Keeping tokens
and Blizzard calls backend-only satisfies the Constraints in Technical
Context and avoids ever exposing OAuth credentials to the browser.

**Alternatives considered**: Client-side OAuth (implicit-style flow
calling Blizzard directly from the browser) — rejected because it would
expose the client secret/tokens to the frontend, which the app's own
Technical Context constraint rules out. Periodic background polling —
rejected as unnecessary given FR-005 only requires a manual refresh and
polling would work against the constitution's "no redundant calls"
guidance.
