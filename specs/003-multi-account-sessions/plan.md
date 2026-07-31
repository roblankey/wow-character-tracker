# Implementation Plan: Multi-Account Support Across Browser Sessions

**Branch**: `003-multi-account-sessions` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-multi-account-sessions/spec.md`

## Summary

Today `battleNetConnection` is a single global row — connecting a second Battle.net account
replaces the first. This feature scopes that connection (and its characters) to the browser
session that owns it, identified by a signed, long-lived, host-only cookie. A new
`onRequest` hook assigns every request a session id if it doesn't already have one; every
existing route (`/api/connection*`, `/api/characters*`) filters and writes by that session id
instead of assuming a single row. The OAuth CSRF `state` map already tracked per attempt gains
one field — the initiating session id — so the callback can always attribute the resulting
connection to the right session even though Blizzard's redirect lands directly on the backend
port, bypassing the frontend dev proxy the session cookie was originally set through (see
research.md). The existing single connection is cleared by a migration when this ships
(FR-007); nothing is auto-migrated into a session. As a small, directly-motivated addition
(SC-004: users must be able to tell which account they're viewing), the connection's Battle.net
`battletag` — already fetched during OAuth but previously discarded — is now persisted and
shown in the UI.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (backend) and in the browser via the
existing Vite-built bundle (frontend) — unchanged from feature 001.

**Primary Dependencies**: Same as feature 001 — Fastify, Drizzle ORM + better-sqlite3, React +
Vite. Adds one new dependency: `@fastify/cookie` (official Fastify plugin) for parsing and
signing the session cookie — chosen over hand-rolled cookie parsing/signing per the Code
Quality principle (don't reinvent something a maintained, single-purpose library already does
correctly).

**Storage**: The existing local SQLite file. `battlenet_connection` gains a required
`session_id` column (replacing the "always exactly one row" invariant with "at most one row per
`session_id`", enforced by a unique index) and a `battletag` column. Added via a Drizzle
migration that also clears all existing `battlenet_connection`/`character` rows per FR-007
(see research.md for why the migration must delete before adding the `NOT NULL` column).

**Testing**: Vitest for both backend and frontend, matching feature 001/002's existing suite
structure. New backend integration tests simulate concurrent sessions by issuing requests with
distinct cookie jars via Fastify's `inject`.

**Target Platform**: Same locally self-hosted single-user-machine app as feature 001 — "multi-
account" here means multiple Battle.net accounts on one local install, distinguished by browser
session, not a hosted multi-tenant service (per spec.md's Assumptions).

**Project Type**: Web application (frontend + backend) — extending the existing feature
001/002 codebase, not a new project.

**Performance Goals**: Session lookup (cookie verify + one indexed `session_id` query) adds
negligible overhead to existing endpoint latency (well under the constitution's 100ms local-
interaction target); no new Blizzard API calls are introduced by this feature — each session's
sync still follows the existing rate-limited, backoff-retrying path.

**Constraints**: Must not introduce a login/credential system (per spec.md Assumptions — no
usernames/passwords for the app itself). Must correctly attribute the OAuth callback to its
originating session even when the callback request itself carries no usable session cookie for
that origin (see research.md's "Session cookie scope across the OAuth detour").

**Scale/Scope**: Same single-machine scope as before, now supporting a handful of concurrently
open browser sessions (a person opening a few incognito windows) rather than exactly one
connection — not designed for, or bounded against, large numbers of sessions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality** — PASS. Reuses the existing per-request `db`/`config` decoration pattern
  (`app.appContext`) and the existing OAuth `state` CSRF map, extending it with one field rather
  than introducing a parallel session-tracking mechanism. Cookie parsing/signing is delegated to
  a maintained library instead of a hand-rolled implementation (YAGNI/no speculative complexity
  cuts both ways: don't build what a library already solves).
- **II. Testing Standards** — PASS, contingent on the tasks phase adding: integration tests that
  drive two or more concurrent simulated sessions through connect/refresh/disconnect and assert
  isolation (FR-002, FR-003, SC-002); a test for the state→session OAuth-callback attribution
  edge case (FR-004); and a migration test confirming existing connection/character rows are
  cleared (FR-007). These are real integration tests against the in-memory DB and Fastify
  `inject`, not mocks, consistent with the constitution's preference for real tests over mocking
  on persistence/sync paths.
- **III. User Experience Consistency** — PASS. No new visual language is introduced; the
  existing `ConnectionStatus` component gains one more piece of already-fetched-but-previously-
  discarded data (`battletag`) rendered in its existing text style. Every affected view already
  handles loading/error states explicitly (unchanged) — this feature only narrows what data
  populates those views, it doesn't change how loading/error is presented. Should be manually
  verified using two side-by-side browser windows before being marked complete.
- **IV. Performance Requirements** — PASS. No redundant or additional Blizzard API calls are
  introduced; the added session lookup is a single indexed local SQLite query, well within the
  100ms local-interaction target.

No violations identified; Complexity Tracking table is intentionally left empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-multi-account-sessions/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This feature extends the existing `backend/` + `frontend/` structure from features 001/002 — no
new top-level directories.

```text
backend/
├── src/
│   ├── db/
│   │   ├── schema.ts              # +sessionId, +battletag on battleNetConnection; unique index on sessionId
│   │   └── migrations/            # +migration: clear existing rows, add session_id/battletag
│   ├── plugins/
│   │   └── session.ts             # new: @fastify/cookie registration + onRequest hook assigning request.sessionId
│   ├── config.ts                  # +sessionCookieSecret (validated like tokenEncryptionKey)
│   ├── server.ts                  # registers the new session plugin before the route registrations
│   ├── routes/
│   │   ├── connection.ts          # scoped by request.sessionId; state map stores sessionId per attempt
│   │   └── characters.ts          # scoped by request.sessionId
│   └── services/
│       └── sync.ts                # unchanged — already scoped by connectionId
└── tests/
    ├── unit/
    │   └── session.test.ts            # new: cookie issuance/parsing/signing behavior
    ├── contract/
    │   └── connection.test.ts         # +battletag field
    └── integration/
        └── multi-session.test.ts      # new: two concurrent sessions stay isolated end-to-end

frontend/
├── src/
│   ├── api/
│   │   └── client.ts              # ConnectionStatus +battletag
│   └── components/
│       └── ConnectionStatus.tsx   # renders "Connected as {battletag}"
└── tests/
    └── unit/
        └── ConnectionStatus.test.tsx  # +battletag rendering
```

**Structure Decision**: No new top-level projects — purely additive within the existing
`backend/` (one new small plugin module, schema/migration change, existing routes updated to
filter by session) and `frontend/` (one existing component shows one more field) structure.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
