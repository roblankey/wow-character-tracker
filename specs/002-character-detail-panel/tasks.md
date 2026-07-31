# Tasks: Character Detail Panel

**Input**: Design documents from `/specs/002-character-detail-panel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included. The project constitution (Principle II, Testing Standards) requires automated tests covering core behavior before any feature is considered complete.

**Organization**: This feature has a single user story (spec.md defines only User Story 1 — there is no smaller independently-valuable slice), so Setup/Foundational carry the shared backend plumbing (schema, Blizzard client, sync, API response) that the story's UI depends on, and Phase 3 is the entire user-facing feature.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1)
- Paths follow the existing `backend/` + `frontend/` structure from feature 001, extended per plan.md

---

## Phase 1: Setup

**Purpose**: Schema change needed before any Blizzard-media or sync work can proceed

- [ ] T001 Add a nullable `imageUrl` column to the `character` table in `backend/src/db/schema.ts`
- [ ] T002 Generate and review the Drizzle migration for the new `image_url` column in `backend/src/db/migrations/` (depends on T001)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Gets `imageUrl` flowing end-to-end from Blizzard through sync to the API response, before any panel UI work begins

**⚠️ CRITICAL**: No User Story 1 UI work can begin until this phase is complete — the panel has nothing to display without it

- [ ] T003 [P] Implement `fetchCharacterMedia` (Blizzard `character-media` endpoint; use the `main-raw` asset, falling back to `avatar`; reuse the existing 404-tolerant `fetchCharacterDetail` helper) in `backend/src/battlenet/client.ts`
- [ ] T004 Wire `fetchCharacterMedia` into `fetchFullCharacterRoster`'s per-character `Promise.all`, adding `imageUrl` to the `FetchedCharacter` shape in `backend/src/battlenet/client.ts` (depends on T003)
- [ ] T005 Pass `imageUrl` through when upserting `Character` rows in `backend/src/services/sync.ts` (depends on T002, T004)
- [ ] T006 Include `imageUrl` in the `GET /api/characters` response in `backend/src/routes/characters.ts` (depends on T005)
- [ ] T007 [P] Add `imageUrl: string | null` to `CharacterDto` in `frontend/src/api/client.ts`

**Checkpoint**: `GET /api/characters` returns real (or `null`) `imageUrl` values — User Story 1 UI work can now begin

---

## Phase 3: User Story 1 - View full character details in a side panel (Priority: P1) 🎯 MVP

**Goal**: Clicking a roster row opens a half-width panel sliding in from the right, showing the character's full tracked details (including professions, which the roster table hides) and an image, with support for switching between characters, closing, missing-image placeholders, and removed characters.

**Independent Test**: Click a character row in a populated roster and confirm a panel slides in from the right showing that character's full details and image; confirm clicking another row switches it in place; confirm closing it (via the close control or re-clicking the same row) returns to an unobstructed roster.

### Tests for User Story 1

> Write these tests FIRST, ensure they FAIL before implementation

- [ ] T008 [P] [US1] Unit tests for `fetchCharacterMedia` — success, 404 → `null`, other errors propagate — in `backend/tests/unit/battlenet-client.test.ts`
- [ ] T009 [P] [US1] Unit test: sync persists `imageUrl`, and stores `null` when Blizzard 404s, in `backend/tests/unit/sync.test.ts`
- [ ] T010 [P] [US1] Contract test: `GET /api/characters` response includes `imageUrl` in `backend/tests/contract/characters.test.ts`
- [ ] T011 [P] [US1] Frontend unit tests for `CharacterDetailPanel` — renders all tracked fields including professions, shows the image, shows a placeholder when `imageUrl` is `null` or the image fails to load, shows removed status for `isRemoved` characters — in `frontend/tests/unit/CharacterDetailPanel.test.tsx`
- [ ] T012 [P] [US1] Frontend integration tests: clicking a row opens the panel for that character, clicking a different row switches it, clicking the same row again or the close control closes it, in `frontend/tests/integration/roster-page.test.tsx`

### Implementation for User Story 1

- [ ] T013 [US1] Build the `CharacterDetailPanel` component — name, class, race, faction, realm, level, item level, active spec, professions, character image with `onError`/loading-state handling and a placeholder, a close control, and a removed-status indicator — in `frontend/src/components/CharacterDetailPanel.tsx` (depends on T007)
- [ ] T014 [US1] Add row click handling (an `onSelectCharacter` callback) to `RosterTable` in `frontend/src/components/RosterTable.tsx`
- [ ] T015 [US1] Add `selectedCharacterId` state to `RosterPage`; wire row clicks to open/switch/toggle-close; render `CharacterDetailPanel` for the selected character in `frontend/src/pages/RosterPage.tsx` (depends on T013, T014)
- [ ] T016 [US1] Add the slide-in-from-right, half-viewport-width CSS transition for the panel in `frontend/src/App.css` (depends on T013)

**Checkpoint**: User Story 1 is fully functional and independently testable

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final validation against a real account and UX consistency review

- [ ] T017 [P] Run the `quickstart.md` validation scenarios end-to-end against a real Battle.net account, confirming the image actually loads from Blizzard's CDN and the placeholder appears for a character with no available media
- [ ] T018 Manually review the panel against constitution Principle III (consistent visual language, WoW terminology, explicit loading/error states) before marking the feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS User Story 1
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **Polish (Phase 4)**: Depends on User Story 1 being complete

### Within User Story 1

- Tests (T008–T012) are written and MUST fail before implementation (T013–T016) begins
- `CharacterDetailPanel` (T013) before wiring it into `RosterPage` (T015)
- Row click handling (T014) can be built in parallel with the panel component (T013) — both are needed by T015

### Parallel Opportunities

- T001 and T002 are sequential (migration depends on the schema edit), but T003 and T007 can start in parallel with each other once Setup is done
- All T008–T012 tests can run in parallel with each other
- T013 and T014 can be built in parallel (different files); both must finish before T015

---

## Parallel Example: User Story 1 tests

```bash
# Launch all tests for User Story 1 together:
Task: "Unit tests for fetchCharacterMedia in backend/tests/unit/battlenet-client.test.ts"
Task: "Unit test: sync persists imageUrl / null-on-404 in backend/tests/unit/sync.test.ts"
Task: "Contract test: GET /api/characters includes imageUrl in backend/tests/contract/characters.test.ts"
Task: "Frontend unit tests for CharacterDetailPanel in frontend/tests/unit/CharacterDetailPanel.test.tsx"
Task: "Frontend integration tests for open/switch/close in frontend/tests/integration/roster-page.test.tsx"
```

---

## Implementation Strategy

### MVP (the whole feature)

Since spec.md defines only one user story, there is no smaller MVP slice:

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all UI work)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run the quickstart.md scenarios against a real account
5. Demo if ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Backend tests use the existing real-temp-SQLite-file / stubbed-Blizzard-client pattern from feature 001, per constitution Principle II
- Commit after each task or logical group
- Stop at the Phase 2 checkpoint to confirm `imageUrl` is flowing correctly before starting UI work
