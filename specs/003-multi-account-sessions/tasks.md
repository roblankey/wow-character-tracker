# Tasks: Multi-Account Support Across Browser Sessions

**Input**: Design documents from `/specs/003-multi-account-sessions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included. The project constitution (Principle II, Testing Standards) requires
automated tests covering core behavior, with real integration tests preferred over mocking for
persistence/sync-adjacent logic — session isolation is exactly that kind of logic.

**Organization**: Tasks are grouped by the three user stories in spec.md. US1 and US2 are both
P1 (the two halves of "multiple accounts work independently across sessions" — connecting and
reading back are both required for the feature to be minimally useful); US3 (isolated
disconnect) is P2. Setup/Foundational carry the shared session-cookie plumbing every story
depends on, including bringing the pre-existing test suite forward under the new schema and
session model (T009–T010) so the constitution's "full test suite MUST pass before any merge"
gate holds throughout.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths follow the existing `backend/` + `frontend/` structure from features 001/002, extended
  per plan.md

---

## Phase 1: Setup

**Purpose**: Dependency, config, and schema changes needed before any session-scoping work can
proceed

- [X] T001 Add `@fastify/cookie` to `backend/package.json` dependencies and install it
- [X] T002 Add `sessionCookieSecret` to `Config`, read from a new required `SESSION_COOKIE_SECRET`
      env var and validated the same way `tokenEncryptionKey` is, in `backend/src/config.ts`
- [X] T003 [P] Document `SESSION_COOKIE_SECRET` in `backend/.env.example` (purpose + a generation
      command, matching the existing `TOKEN_ENCRYPTION_KEY` entry's style)
- [X] T004 Add `sessionId` (text, not null) and `battletag` (text, not null) columns to
      `battleNetConnection`, plus a unique index on `sessionId`, in `backend/src/db/schema.ts`
- [X] T005 Generate the Drizzle migration for T004 (`npm run db:generate` in `backend/`), then
      hand-edit the generated `backend/src/db/migrations/*.sql` file to prepend `DELETE FROM
      character;` and `DELETE FROM battlenet_connection;` before the `ALTER TABLE`/index
      statements, per research.md's "Migration: clearing the existing single connection" — both
      new columns are plain `NOT NULL` with no `DEFAULT` (depends on T004)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Gets a signed session id onto every request, and brings the pre-existing test suite
forward so it still passes under the new schema/session model, before any route-scoping work
begins

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — every route change
below reads `request.sessionId`, and the existing suite must be green before adding more to it

- [X] T006 Implement a session plugin: register `@fastify/cookie` with signing (keyed by
      `config.sessionCookieSecret`), add an `onRequest` hook that reads/verifies the session
      cookie and, if missing or invalid, generates one via `randomUUID()` and sets it on the
      reply (`httpOnly`, `sameSite: 'lax'`, no `Domain` attribute, long-lived per FR-008), and
      decorates the request with `sessionId` — in `backend/src/plugins/session.ts` (depends on
      T002). Wrapped with `fastify-plugin` (added as a direct dependency) so the hook/decoration
      apply globally rather than only within the plugin's own encapsulated scope.
- [X] T007 Register the session plugin in `backend/src/server.ts` before `connectionRoutes`/
      `charactersRoutes` are registered, and add the `sessionId: string` field to the Fastify
      `FastifyRequest` module augmentation (depends on T006)
- [X] T008 Add `sessionCookieSecret` to `createTestConfig()` in
      `backend/tests/helpers/testApp.ts` so `buildTestApp()` produces a working app under the
      new required config (depends on T002)
- [X] T009 [P] Add `sessionId`/`battletag` to every direct `battleNetConnection` fixture insert
      so they satisfy the new `NOT NULL` columns from T004, in `backend/tests/contract/
      connection.test.ts`, `connection-delete.test.ts`, `characters.test.ts`, `refresh.test.ts`,
      `backend/tests/integration/disconnect-flow.test.ts`, `refresh-flow.test.ts`, and the
      shared `insertConnection` helper in `backend/tests/unit/sync.test.ts` (depends on T004).
      Implementation note: since these routes will be session-scoped by T018/T023, a fixture
      insert alone isn't enough for tests that read it back via `app.inject()` — added a
      `backend/tests/helpers/session.ts` `sessionCookieHeader()` helper (using
      `@fastify/cookie`'s standalone `sign()`) and passed a matching `Cookie` header on each such
      `inject()` call in `connection.test.ts`, `connection-delete.test.ts`, `characters.test.ts`,
      `refresh.test.ts`, `disconnect-flow.test.ts`, `refresh-flow.test.ts`. `sync.test.ts` calls
      `syncCharacters()` directly (no HTTP), so it only needed the fixture fields.
- [X] T010 [P] Thread a captured session cookie across each test's own multi-step
      `app.inject()` sequences so requests that must belong to the same session actually do
      (each separate `inject()` call otherwise gets its own fresh random session under T006),
      in `backend/tests/contract/connection-callback.test.ts`, `connection-reconnect.test.ts`,
      and `backend/tests/integration/connect-flow.test.ts`; this also preserves
      `connection-reconnect.test.ts`'s existing "replaces an existing connection instead of
      creating a duplicate" coverage as this feature's FR-005 same-session-reconnect regression
      test (depends on T007). Implementation note: attribution on `/callback` is by the `state`
      map (not the callback request's own cookie — see research.md), so single authorize→callback
      round trips whose assertions read the DB directly need no cookie at all;
      `connect-flow.test.ts` and `connection-callback.test.ts` turned out to need zero changes.
      Only `connection-reconnect.test.ts` — which does two authorize→callback rounds and asserts
      they collapse to one row — actually needed the same `sessionCookieHeader()` threaded
      through both rounds.

**Checkpoint**: Every request now carries a valid `request.sessionId`; the test harness builds
apps correctly under the new config; the entire pre-existing test suite passes again under the
new schema/session model — user story route-scoping work can now begin

---

## Phase 3: User Story 1 - Connect a different account per browser session (Priority: P1) 🎯 MVP

**Goal**: Each browser session can establish and maintain its own independent Battle.net
connection — connecting an account in one session never disturbs another session's connection,
and the OAuth callback always lands on the session that actually initiated it.

**Independent Test**: Using two separate cookie jars (or two real browser windows), connect a
different Battle.net account in each; confirm each's `GET /connection` shows only its own
account's `battletag`, and that connecting the second didn't change the first's response.

### Tests for User Story 1

> Write these tests FIRST, ensure they FAIL before implementation

- [X] T011 [P] [US1] Unit tests for the session plugin — issues a fresh signed cookie when one
      is missing, accepts and reuses a valid signed cookie, and issues a fresh one (rather than
      trusting it) when the signature is invalid/tampered — in `backend/tests/unit/session.test.ts`
- [X] T012 [P] [US1] Integration test: three simulated sessions (distinct signed cookies via
      Fastify `inject`) each connect a different Battle.net account (SC-001's "at least 3"
      concurrent accounts); each session's `GET /connection` reflects only its own
      `battletag`/region, and connecting the second or third session's account leaves the
      earlier sessions' `GET /connection` responses unchanged — in
      `backend/tests/integration/multi-session.test.ts`
- [X] T013 [P] [US1] Integration test: the same Battle.net account, connected in two different
      sessions, succeeds in both without error (FR-006) — each session ends up with its own
      connection row for that account, and neither session's row is affected by the other — in
      `backend/tests/integration/multi-session.test.ts`
- [X] T014 [P] [US1] Integration test: the OAuth callback attributes the resulting connection to
      the session id recorded against the `state` value at `authorize` time, not to whichever
      cookie happens to be present on the callback request — in
      `backend/tests/integration/multi-session.test.ts`
- [X] T015 [P] [US1] Contract test: `GET /api/connection`'s connected response includes
      `battletag` — in `backend/tests/contract/connection.test.ts`
- [X] T016 [P] [US1] Integration test: after applying the T005 migration to a database seeded
      with feature-001-style pre-existing connection/character rows, both tables are empty
      (FR-007) — in `backend/tests/integration/migration.test.ts`. Also verifies the new columns
      are usable with no `DEFAULT` on the now-empty table, and that the unique index on
      `session_id` actually rejects a second row for the same session.
- [X] T017 [P] [US1] Frontend unit test: `ConnectionStatus` renders "Connected as `{battletag}`"
      when connected — in `frontend/tests/unit/ConnectionStatus.test.tsx`

### Implementation for User Story 1

- [X] T018 [US1] Scope `GET /connection`, `GET /connection/authorize`, and
      `GET /connection/callback` by `request.sessionId` instead of `limit(1)`/whole-table
      delete: store `{ expiresAt, sessionId }` in `pendingStates` when issuing `state`; on
      callback, look up the state entry's `sessionId` (not the request's own cookie) to decide
      which session's row to replace; persist `battletag` from the existing `fetchUserInfo` call
      — in `backend/src/routes/connection.ts` (depends on T007; T011–T017 written and failing).
      `DELETE /connection` (T025) was scoped in the same file edit since it's the same file.
- [X] T019 [US1] Add `battletag: string` to the `ConnectionStatus` DTO in
      `frontend/src/api/client.ts` (depends on T018)
- [X] T020 [US1] Render "Connected as `{battletag}`" in
      `frontend/src/components/ConnectionStatus.tsx` (depends on T017, T019)

**Checkpoint**: User Story 1 is fully functional and independently testable — two or more
sessions can each connect a different (or the same) account without interfering with one
another.

---

## Phase 4: User Story 2 - Session-scoped roster visibility (Priority: P1)

**Goal**: A session only ever sees the character roster belonging to the account connected
within that same session — never another session's data, and a brand-new session starts
disconnected.

**Independent Test**: With two sessions each connected to a different account (from User Story
1), refresh one session's roster via `POST /characters/refresh` and confirm the other session's
`GET /characters` response is unchanged; confirm a third, never-connected session's
`GET /characters` returns an empty list and `GET /connection` returns `{ connected: false }`.

### Tests for User Story 2

- [X] T021 [P] [US2] Integration test: two sessions connected to different accounts each see
      only their own characters from `GET /characters`, and refreshing one session's roster via
      `POST /characters/refresh` does not change the other session's `GET /characters` response
      — in `backend/tests/integration/multi-session.test.ts`
- [X] T022 [P] [US2] Integration test: a brand-new session with no connection gets
      `{ connected: false }` from `GET /connection` and `{ characters: [] }` from
      `GET /characters`, and `POST /characters/refresh` returns 409 — in
      `backend/tests/integration/multi-session.test.ts`

### Implementation for User Story 2

- [X] T023 [US2] Scope `GET /characters` and `POST /characters/refresh` by `request.sessionId`
      (look up that session's connection first; return an empty list / 409 respectively when
      none exists) in `backend/src/routes/characters.ts` (depends on T007; T021–T022 written and
      failing)

**Checkpoint**: User Stories 1 and 2 together mean two sessions can independently connect and
view their own rosters with zero cross-visibility.

---

## Phase 5: User Story 3 - Disconnect one session without affecting others (Priority: P2)

**Goal**: Disconnecting the Battle.net account in one session never affects the connections
active in any other session.

**Independent Test**: With two sessions each connected to a different account, call
`DELETE /connection` in one; confirm that session's `GET /connection` now returns
`{ connected: false }` while the other session's `GET /connection` and `GET /characters`
responses are unchanged.

### Tests for User Story 3

- [X] T024 [P] [US3] Integration test: disconnecting one session (`DELETE /connection`) leaves
      another session's `GET /connection` and `GET /characters` responses untouched — in
      `backend/tests/integration/multi-session.test.ts`

### Implementation for User Story 3

- [X] T025 [US3] Scope `DELETE /connection` by `request.sessionId` (delete only the caller's
      session's row instead of the whole table) in `backend/src/routes/connection.ts` (depends
      on T018, T024 written and failing). Implemented together with T018 in the same file edit.

**Checkpoint**: All three user stories are independently functional — sessions connect, view,
and disconnect entirely in isolation from one another.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and keeping project documentation accurate

- [X] T026 [P] Update CLAUDE.md's backend architecture description of `battleNetConnection`
      (currently documented as "single row — there is never more than one connection") to
      describe the session-scoped model instead
- [~] T027 [P] Run the `quickstart.md` validation scenarios end-to-end using two real browser
      windows (e.g. one normal, one incognito) against real Battle.net accounts, including the
      concurrent-authorize-attribution scenario (quickstart.md scenario 4). Partially done: ran
      the migration against the real local dev DB (with confirmation — it held a real connected
      account with 17 characters, now cleared per FR-007) and verified the full HTTP-level
      behavior against the real Battle.net client credentials with both dev servers running
      (fresh session cookie issuance, cookie reuse without reissue, two independent sessions
      getting distinct ids, `/api/connection/authorize` correctly redirecting to a real
      `us.battle.net` OAuth URL, `/api/characters` returning `[]` for a disconnected session, all
      through the Vite proxy). The Chrome browser extension wasn't connected in this environment,
      so the actual two-window visual walkthrough with real Battle.net login (scenarios 1-4)
      still needs to be run manually — see handoff notes.
- [X] T028 Manually review `ConnectionStatus`'s new battletag display against constitution
      Principle III (consistent visual language, explicit states) before marking the feature
      complete. Reviewed: the battletag is rendered inside the same existing `.account-info`
      span using its existing style — no new CSS or visual pattern introduced, consistent with
      the established language.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion; independently testable
  from US1, though demonstrating it meaningfully benefits from US1 already being connectable
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion and on `connection.ts`
  already being session-scoped by T018 (same file)
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- Tests are written and MUST fail before implementation begins
- US1: T018 (backend scoping) before T019/T020 (frontend `battletag` plumbing)
- US3: T025 depends on T018 having already scoped the rest of `connection.ts` (same file, same
  `request.sessionId` pattern)

### Parallel Opportunities

- T001–T003 can run in parallel with each other; T004/T005 are sequential (migration depends on
  the schema edit) but can proceed in parallel with T001–T003
- T009 and T010 (bringing the pre-existing suite forward) can run in parallel with each other
  once their respective dependencies (T004, T007) are done — they touch disjoint files
- T011–T017 (all US1 tests) can run in parallel with each other
- T021–T022 (all US2 tests) can run in parallel with each other
- Once Foundational (Phase 2) is done, US1 and US2 implementation can proceed in parallel
  (different files: `connection.ts` vs `characters.ts`); US3 must wait for T018 specifically

---

## Parallel Example: User Story 1 tests

```bash
# Launch all User Story 1 tests together:
Task: "Unit tests for the session plugin in backend/tests/unit/session.test.ts"
Task: "Integration test: three sessions connect different accounts independently (SC-001) in backend/tests/integration/multi-session.test.ts"
Task: "Integration test: the same account connected in two sessions succeeds in both (FR-006) in backend/tests/integration/multi-session.test.ts"
Task: "Integration test: OAuth callback attributes via state, not request cookie, in backend/tests/integration/multi-session.test.ts"
Task: "Contract test: GET /api/connection includes battletag in backend/tests/contract/connection.test.ts"
Task: "Integration test: migration clears pre-existing connection/character rows in backend/tests/integration/migration.test.ts"
Task: "Frontend unit test: ConnectionStatus renders battletag in frontend/tests/unit/ConnectionStatus.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

Both are P1: a session that can connect but never see its own roster back (or vice versa) isn't
a usable MVP, so treat them as the combined minimum viable slice.

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories, and brings the existing suite
   back to green)
3. Complete Phase 3: User Story 1
4. Complete Phase 4: User Story 2
5. **STOP and VALIDATE**: Run quickstart.md scenarios 1–2 with two real browser windows
6. Add User Story 3 (Phase 5) → validate scenario 3 → demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → session cookie flowing on every request, existing suite green
2. Add User Story 1 → two or more sessions can independently connect
3. Add User Story 2 → two sessions can independently view their own rosters (MVP complete)
4. Add User Story 3 → disconnect isolation
5. Polish → docs, full quickstart pass, UX review

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Backend tests use the existing real-in-memory-SQLite / Fastify-`inject` pattern from features
  001/002, per constitution Principle II — session isolation is simulated with distinct signed
  cookies across `inject` calls, not mocked
- Commit after each task or logical group
- Stop at the Phase 2 checkpoint to confirm `request.sessionId` is present on every response,
  and that the pre-existing suite (T009, T010) is green, before starting route-scoping work
