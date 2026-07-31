# Implementation Plan: Battle.net Character Comparison

**Branch**: `001-battlenet-character-comparison` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-battlenet-character-comparison/spec.md`

## Summary

A locally-run, single-user web app that authorizes access to one Battle.net
account via OAuth, pulls that account's World of Warcraft characters into a
roster (name, class, realm, faction, level, item level, spec, professions),
and lets the player select two or more characters to see a side-by-side view
with differing attributes highlighted. Data is refreshed on demand and
persisted as the latest snapshot in a local SQLite database. Built entirely
in TypeScript: a Fastify API backend that owns the Blizzard OAuth flow and
SQLite access, and a React frontend that renders the roster and comparison
views.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (backend, required by
`better-sqlite3`'s native bindings) and in the browser via a Vite-built
bundle (frontend)

**Primary Dependencies**: Fastify (backend HTTP server), Drizzle ORM +
better-sqlite3 (typed SQLite access and migrations), React + Vite
(frontend), a Blizzard OAuth/Battle.net API client built on `fetch`

**Storage**: Local SQLite file (via better-sqlite3), owned exclusively by
the backend process

**Testing**: Vitest for unit and integration tests on both backend and
frontend; React Testing Library for component tests; Fastify's built-in
`inject()` for backend HTTP contract tests against a temporary SQLite file

**Target Platform**: Locally self-hosted single-user app — one Node.js
process serves the API and the built frontend on `localhost`; no
multi-tenant hosting in scope

**Project Type**: Web application (frontend + backend)

**Performance Goals**: Local roster/comparison interactions feel instant
(<100ms, per constitution Principle IV); a manual refresh completes and
reflects updated data within 2 minutes (per spec SC-004); no polling —
Blizzard API is called only when the user explicitly connects or refreshes

**Constraints**: Blizzard OAuth client secret and access/refresh tokens
MUST stay on the backend and never be sent to the frontend; the app
supports exactly one connected Battle.net account at a time (FR-010); a
failed refresh MUST leave prior data visible and clearly labeled as stale
rather than blank (FR-008)

**Scale/Scope**: Single user, single Battle.net account, on the order of a
few dozen characters at most — no multi-tenant scale or concurrency
concerns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality** — PASS. TypeScript strict mode across both
  frontend and backend, with Drizzle giving compile-time-checked SQL and
  Fastify giving schema-validated routes; no speculative abstractions are
  introduced beyond what FR-001–FR-010 require.
- **II. Testing Standards** — PASS. Backend integration tests run against
  a real temporary SQLite file (not a mocked DB) and a recorded/stubbed
  Blizzard API client, per the constitution's preference for real
  integration tests over heavy mocking on critical data flows. Every FR
  maps to at least one acceptance scenario already defined in spec.md.
- **III. User Experience Consistency** — PASS. A single shared component
  set renders both the roster and comparison views (no per-view one-off
  styles). Field names and labels reuse Blizzard's own terminology
  (class, spec, item level, professions, faction, realm). Loading and
  error states are first-class, contract-level concerns (see
  `lastSyncStatus`/`lastSyncError` in data-model.md), not an
  afterthought.
- **IV. Performance Requirements** — PASS. Roster/comparison filtering
  and highlighting run client-side against already-fetched data (no
  network round-trip per interaction). Blizzard API calls are
  on-demand only, satisfying the "cache and rate-limit, no redundant
  calls" requirement.

No violations identified; Complexity Tracking table is intentionally left
empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-battlenet-character-comparison/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── db/            # Drizzle schema, migrations, SQLite client
│   ├── battlenet/     # OAuth flow + Blizzard Game Data/Profile API client, response mappers
│   ├── routes/        # Fastify routes: connection, characters
│   ├── services/      # Sync service (fetch + upsert + flag-removed logic)
│   └── server.ts       # Fastify app entrypoint
└── tests/
    ├── contract/       # Route-level request/response contract tests
    ├── integration/    # End-to-end sync flow against real temp SQLite + stubbed Blizzard client
    └── unit/           # Mapper, comparison-diff, and service unit tests

frontend/
├── src/
│   ├── components/    # RosterTable, ComparisonView, ConnectionStatus, ErrorBanner
│   ├── pages/          # RosterPage, ComparePage
│   ├── api/            # Typed client for the backend REST API
│   └── App.tsx
└── tests/
    ├── integration/    # Page-level flows (roster load, compare, refresh, disconnect)
    └── unit/           # Component and diff-highlighting unit tests
```

**Structure Decision**: Standard web application split (Option 2) —
`backend/` owns the Blizzard OAuth flow, SQLite storage, and REST API;
`frontend/` is a React SPA that only talks to the backend's REST API and
never touches Blizzard credentials or the database directly.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
