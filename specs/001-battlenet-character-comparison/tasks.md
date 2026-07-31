# Tasks: Battle.net Character Comparison

**Input**: Design documents from `/specs/001-battlenet-character-comparison/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included. The project constitution (Principle II, Testing Standards) requires automated tests covering core behavior before any feature is considered complete, so contract/integration tests are part of each user story rather than optional.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths follow the `backend/` + `frontend/` structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create `backend/` and `frontend/` directory structure per plan.md's Project Structure section
- [X] T002 Initialize the backend TypeScript + Fastify project (`backend/package.json`, `backend/tsconfig.json`) with `fastify`, `better-sqlite3`, `drizzle-orm`, `drizzle-kit` dependencies
- [X] T003 [P] Initialize the frontend TypeScript + Vite + React project (`frontend/package.json`, `frontend/tsconfig.json`)
- [X] T004 [P] Configure ESLint + Prettier for `backend/` per constitution Principle I (Code Quality)
- [X] T005 [P] Configure ESLint + Prettier for `frontend/` per constitution Principle I (Code Quality)
- [X] T006 [P] Configure Vitest for `backend/` in `backend/vitest.config.ts`
- [X] T007 [P] Configure Vitest + React Testing Library for `frontend/` in `frontend/vitest.config.ts`
- [X] T008 Add backend environment configuration (Battle.net client ID/secret, OAuth redirect URI, SQLite file path) in `backend/src/config.ts`
- [X] T009 [P] Configure CI (e.g., GitHub Actions) to run lint, type-check, and the Vitest suite for both `backend/` and `frontend/` on every pull request, per constitution Quality Gates

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 Define Drizzle schema for `BattleNetConnection` and `Character` (per data-model.md) in `backend/src/db/schema.ts`
- [X] T011 Configure `drizzle-kit` and generate the initial migration in `backend/drizzle.config.ts` and `backend/src/db/migrations/` (depends on T010)
- [X] T012 Create the SQLite client/connection singleton in `backend/src/db/client.ts` (depends on T010)
- [X] T013 [P] Implement the Battle.net OAuth client (authorize URL, code exchange, token refresh) in `backend/src/battlenet/oauth.ts`
- [X] T014 [P] Implement the Blizzard Game Data/Profile API client (fetch account character list), including handling HTTP 429/Retry-After responses with backoff so refresh/connect calls degrade gracefully instead of failing hard, in `backend/src/battlenet/client.ts`
- [X] T015 Set up the Fastify app instance, JSON schema validation, and error-handling middleware in `backend/src/server.ts`
- [X] T016 [P] Create the typed backend API client scaffold in `frontend/src/api/client.ts` (per contracts/api.md)
- [X] T017 [P] Set up the React app shell and page routing in `frontend/src/App.tsx`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Connect account and view roster (Priority: P1) 🎯 MVP

**Goal**: A user can authorize their Battle.net account, see all of their WoW characters in a roster, and disconnect the account when done.

**Independent Test**: Connect a Battle.net test account and verify `GET /api/characters` returns every character on that account with name, class, realm, and faction; verify an account with no characters shows an explicit empty state; verify `DELETE /api/connection` removes the connection and its characters.

### Tests for User Story 1

> Write these tests FIRST, ensure they FAIL before implementation

- [X] T018 [P] [US1] Contract test for `GET /api/connection` in `backend/tests/contract/connection.test.ts`
- [X] T019 [P] [US1] Contract test for `GET /api/connection/callback` success and failure paths in `backend/tests/contract/connection-callback.test.ts`
- [X] T020 [P] [US1] Contract test for `DELETE /api/connection` in `backend/tests/contract/connection-delete.test.ts`
- [X] T021 [P] [US1] Contract test for `GET /api/characters` in `backend/tests/contract/characters.test.ts`
- [X] T022 [P] [US1] Integration test: connect flow persists `BattleNetConnection` and `Character` rows using a real temp SQLite file and a stubbed Blizzard client in `backend/tests/integration/connect-flow.test.ts`
- [X] T023 [P] [US1] Integration test: disconnect cascade-deletes `Character` rows in `backend/tests/integration/disconnect-flow.test.ts`
- [X] T024 [P] [US1] Frontend integration test: roster page renders characters, an empty-roster state, and a disconnect action in `frontend/tests/integration/roster-page.test.tsx`
- [X] T025 [P] [US1] Contract test: `GET /api/connection/callback` when a connection already exists replaces it instead of creating a duplicate (FR-010), in `backend/tests/contract/connection-reconnect.test.ts`

### Implementation for User Story 1

- [X] T026 [US1] Implement the sync service (fetch via Blizzard client, upsert `Character` rows, update `BattleNetConnection` sync fields) in `backend/src/services/sync.ts` (depends on T010-T014)
- [X] T027 [US1] Implement `GET /api/connection/authorize` in `backend/src/routes/connection.ts` (depends on T013)
- [X] T028 [US1] Implement `GET /api/connection/callback` (token exchange + initial sync + redirect); if a `BattleNetConnection` already exists, replace it — delete the old connection's characters and store the new tokens — rather than creating a second row, satisfying FR-010, in `backend/src/routes/connection.ts` (depends on T026, T027)
- [X] T029 [US1] Implement `GET /api/connection` in `backend/src/routes/connection.ts`
- [X] T030 [US1] Implement `DELETE /api/connection` (cascade delete) in `backend/src/routes/connection.ts`
- [X] T031 [US1] Implement `GET /api/characters` in `backend/src/routes/characters.ts`
- [X] T032 [US1] Register connection and characters routes in `backend/src/server.ts` (depends on T027-T031)
- [X] T033 [P] [US1] Build the `RosterTable` component in `frontend/src/components/RosterTable.tsx`
- [X] T034 [P] [US1] Build the `ConnectionStatus` component (connect/disconnect controls, empty/error states) in `frontend/src/components/ConnectionStatus.tsx`
- [X] T035 [US1] Build `RosterPage`, wiring `ConnectionStatus` and `RosterTable` to the backend API in `frontend/src/pages/RosterPage.tsx` (depends on T016, T033, T034)
- [X] T036 [US1] Add explicit loading/error states to `RosterPage` per constitution Principle III in `frontend/src/pages/RosterPage.tsx` (depends on T035)

**Checkpoint**: User Story 1 is fully functional and independently testable

---

## Phase 4: User Story 2 - Compare characters side-by-side (Priority: P2)

**Goal**: A user can select two or more characters from the roster and see their differing attributes highlighted.

**Independent Test**: With a roster of 2+ characters, open the comparison view and verify differing attributes (level, item level, spec, professions) are highlighted; verify identical characters show "no differences"; verify a single-character roster shows a clear "need at least two" message instead of a broken view.

### Tests for User Story 2

- [X] T037 [P] [US2] Unit test for the character comparison diff utility in `frontend/tests/unit/compare.test.ts`
- [X] T038 [P] [US2] Frontend integration test: comparison view highlights differences, shows "no differences," and shows "need two characters" states in `frontend/tests/integration/compare-page.test.tsx`

### Implementation for User Story 2

- [X] T039 [P] [US2] Implement the `compareCharacters` diff utility (per data-model.md's derived Comparison concept) in `frontend/src/api/compare.ts`
- [X] T040 [P] [US2] Build the `ComparisonView` component (side-by-side table with highlighted differences) in `frontend/src/components/ComparisonView.tsx`
- [X] T041 [US2] Build `ComparePage`: character selection UI wired to `compareCharacters` and `ComparisonView` in `frontend/src/pages/ComparePage.tsx` (depends on T039, T040)
- [X] T042 [US2] Handle the single-character and identical-characters edge cases in `ComparePage` in `frontend/src/pages/ComparePage.tsx` (depends on T041)
- [X] T043 [US2] Add navigation from `RosterPage` to `ComparePage` with the selected characters — implemented as a selection UI in `RosterTable`/`RosterPage` (checkboxes + a "Compare selected" link carrying `?ids=`) with `ComparePage` reading the ids via `useSearchParams`, rather than in `App.tsx` itself, since the selection state naturally lives on the roster page (depends on T017, T035, T041)

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Refresh character data (Priority: P3)

**Goal**: A user can manually refresh their character data on demand, and refresh failures are surfaced clearly without losing the last good data.

**Independent Test**: Change a character's data in-game, trigger a refresh, and confirm the roster reflects the update; simulate a Blizzard API failure and confirm the roster keeps showing the last good data along with a clear failure indicator.

### Tests for User Story 3

- [X] T044 [P] [US3] Contract test for `POST /api/characters/refresh` success and failure responses in `backend/tests/contract/refresh.test.ts`
- [X] T045 [P] [US3] Integration test: refresh flags characters missing from the latest fetch as `isRemoved` instead of deleting them in `backend/tests/integration/refresh-flow.test.ts`
- [X] T046 [P] [US3] Frontend integration test: refresh button updates the roster and surfaces a failure banner without clearing existing data in `frontend/tests/integration/refresh.test.tsx`

### Implementation for User Story 3

- [X] T047 [US3] Implement `POST /api/characters/refresh` in `backend/src/routes/characters.ts` (depends on T026, T031)
- [X] T048 [US3] Extend the sync service to flag characters missing from the latest fetch as `isRemoved = true` instead of deleting them in `backend/src/services/sync.ts` (depends on T026)
- [X] T049 [P] [US3] Build the `RefreshButton` component with a loading state in `frontend/src/components/RefreshButton.tsx`
- [X] T050 [P] [US3] Build the `ErrorBanner` component surfacing `lastSyncError` in `frontend/src/components/ErrorBanner.tsx`
- [X] T051 [US3] Wire `RefreshButton` and `ErrorBanner` into `RosterPage` in `frontend/src/pages/RosterPage.tsx` (depends on T049, T050, T035)

**Checkpoint**: All three user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T052 [P] Unit tests for sync service upsert/removal logic in `backend/tests/unit/sync.test.ts`
- [X] T053 [P] Unit tests for OAuth token exchange/refresh logic in `backend/tests/unit/oauth.test.ts`
- [X] T054 Ran both dev servers locally and exercised connect/roster/compare/refresh/disconnect manually in a real browser. Could not complete a real OAuth login (requires a registered Battle.net app + user's own credentials, not available in this environment), but did validate against the *live* Blizzard API: a fake access token got a genuine 401 from `https://us.api.blizzard.com`, which was caught and surfaced as a clear failure banner while the previously-loaded roster stayed fully visible (FR-008). This also caught and fixed a real bug (see Notes). SC-001/SC-004 timing not measured — no real account was available to complete a full connect/refresh cycle against.
- [X] T055 [P] Add a root `README.md` documenting setup (environment variables, migrations, dev commands)
- [X] T056 Manually reviewed the full app against constitution Principle III: refactored `ComparePage`'s ad hoc error paragraph to reuse the shared `ErrorBanner` component (it was inconsistent with `RosterPage`), and added visible styling for `.error-banner` and the comparison table's differing-value highlight, which had no CSS at all before and so weren't actually "visually distinct" as Principle III requires
- [X] T057 [P] Unit test: Blizzard API client retries/backs off on 429 responses in `backend/tests/unit/battlenet-client.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - Can proceed in parallel if staffed, or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational; reads roster data produced by US1's routes/components but does not require US1's UI to be finished to build its own components
- **User Story 3 (P3)**: Can start after Foundational; extends the sync service built in US1 (T026) and the `RosterPage` built in US1 (T035)

### Within Each User Story

- Tests are written and MUST fail before implementation begins
- Backend routes depend on the sync/OAuth/DB foundation from Phase 2
- Frontend components before the pages that wire them together
- Story complete before moving to next priority (or work in parallel per team capacity)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- Once Foundational completes, US1, US2, and US3 test-writing can start in parallel (implementation of US2/US3 has soft dependencies on US1's sync service and RosterPage — see above)
- All [P] tests within a story can run in parallel
- All [P] components within a story can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for GET /api/connection in backend/tests/contract/connection.test.ts"
Task: "Contract test for GET /api/connection/callback in backend/tests/contract/connection-callback.test.ts"
Task: "Contract test for DELETE /api/connection in backend/tests/contract/connection-delete.test.ts"
Task: "Contract test for GET /api/characters in backend/tests/contract/characters.test.ts"
Task: "Integration test for connect flow in backend/tests/integration/connect-flow.test.ts"
Task: "Integration test for disconnect flow in backend/tests/integration/disconnect-flow.test.ts"
Task: "Frontend integration test for roster page in frontend/tests/integration/roster-page.test.tsx"
Task: "Contract test for reconnect-replaces-existing-connection in backend/tests/contract/connection-reconnect.test.ts"

# Launch independent components for User Story 1 together:
Task: "Build RosterTable component in frontend/src/components/RosterTable.tsx"
Task: "Build ConnectionStatus component in frontend/src/components/ConnectionStatus.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run the connect/roster/disconnect scenarios from quickstart.md independently
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate independently → MVP demo
3. Add User Story 2 → validate independently → demo
4. Add User Story 3 → validate independently → demo
5. Each story adds value without breaking the previous ones

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2 (component/diff work can start immediately; final wiring waits on US1's RosterPage)
   - Developer C: User Story 3 (component work can start immediately; final wiring waits on US1's sync service and RosterPage)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Contract and integration tests use a real temporary SQLite file per constitution Principle II (prefer real integration tests over heavy mocking); only the Blizzard API client is stubbed
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
