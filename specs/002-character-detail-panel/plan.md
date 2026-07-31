# Implementation Plan: Character Detail Panel

**Branch**: `002-character-detail-panel` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-character-detail-panel/spec.md`

## Summary

Clicking a roster row opens a half-viewport-width panel that slides in
from the right, showing that character's full tracked details (including
professions, which the roster table itself hides) plus a Blizzard-rendered
character image. This builds entirely on the existing `wow-character-tracker`
app from feature 001: the backend's existing per-character sync loop gains
one more Blizzard API call (character media) alongside the summary and
professions calls it already makes, storing the resulting image URL on the
`Character` row so it's already available the moment the roster loads — no
new network round-trip when the panel opens. The frontend gains a new
slide-in panel component and per-row click handling; no new backend routes.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (backend) and in the
browser via the existing Vite-built bundle (frontend) — unchanged from
feature 001

**Primary Dependencies**: Same as feature 001 — Fastify, Drizzle ORM +
better-sqlite3, React + Vite, the existing `fetch`-based Blizzard API
client in `backend/src/battlenet/client.ts`. No new dependencies.

**Storage**: The existing local SQLite file; one new nullable column
(`image_url`) on the existing `character` table, added via a Drizzle
migration.

**Testing**: Vitest for both backend and frontend, matching feature 001's
existing test suite structure (contract/integration/unit for backend,
integration/unit for frontend).

**Target Platform**: Same locally self-hosted single-user app as feature
001 — no new platform considerations.

**Project Type**: Web application (frontend + backend) — extending the
existing feature 001 codebase, not a new project.

**Performance Goals**: Panel MUST show the character's tracked data within
1 second of the row click (SC-001) — achievable trivially since the data
is already loaded with the roster; the character image itself loads
directly from Blizzard's CDN in the browser (not proxied through our
backend), so its load time is independent of our server.

**Constraints**: Must not add a new Blizzard API call at panel-open time
(constitution Principle IV: no redundant external calls) — the image URL
is fetched once per sync, same cadence as item level/spec/professions,
not once per panel open. Must not require Blizzard credentials in the
frontend — the browser loads the image directly from Blizzard's
publicly-accessible render CDN using the URL our backend already
resolved and stored (Blizzard's `character-media` API call itself needs
the OAuth access token to look up the URL, but the resulting image files
are public static assets that don't need auth to load).

**Scale/Scope**: Same single-user, single-account, few-dozen-characters
scope as feature 001. Adds one more per-character Blizzard API call
during sync (character-media), following the same 404-tolerant pattern
already used for summary/professions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality** — PASS. Reuses the existing `blizzardFetch` /
  `fetchCharacterDetail` (404-tolerant) helpers in
  `backend/src/battlenet/client.ts` rather than introducing a parallel
  pattern; the frontend panel is a new, single-purpose component, not a
  speculative generic "modal system."
- **II. Testing Standards** — PASS. Character-media fetch failure modes
  (success, 404, other error) get the same unit-test treatment as the
  existing summary/professions calls in
  `backend/tests/unit/battlenet-client.test.ts`; the new `image_url`
  column and its 404-fallback (`null`) get covered in
  `backend/tests/unit/sync.test.ts`; the panel's open/switch/close/
  placeholder/removed-character behavior gets frontend integration
  tests, consistent with `RosterPage`'s existing test coverage.
- **III. User Experience Consistency** — PASS. The panel reuses the same
  visual language already established (dark theme, existing WoW
  terminology, the same `ErrorBanner`-style explicit-state philosophy)
  for its image-loading and image-unavailable states, rather than
  inventing new patterns.
- **IV. Performance Requirements** — PASS. The image URL is fetched once
  during sync (same cadence as everything else already fetched), not
  once per panel open — no redundant Blizzard calls. Opening the panel
  itself does no network I/O to our own backend at all, since the
  character is already in the already-fetched roster list; only the
  browser's own image-loading (from Blizzard's CDN, not our server)
  happens after that.

No violations identified; Complexity Tracking table is intentionally left
empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-character-detail-panel/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This feature extends the existing `backend/` + `frontend/` structure from
feature 001 — no new top-level directories.

```text
backend/
├── src/
│   ├── db/
│   │   ├── schema.ts              # +imageUrl column on `character`
│   │   └── migrations/            # +migration adding image_url
│   ├── battlenet/
│   │   └── client.ts              # +fetchCharacterMedia, wired into fetchFullCharacterRoster
│   ├── routes/
│   │   └── characters.ts          # GET /characters response +imageUrl field
│   └── services/
│       └── sync.ts                # passes imageUrl through to the upserted Character row
└── tests/
    ├── unit/
    │   ├── battlenet-client.test.ts   # +character-media fetch tests
    │   └── sync.test.ts               # +imageUrl persisted / null-on-404 tests
    └── contract/
        └── characters.test.ts         # +imageUrl present in response

frontend/
├── src/
│   ├── api/
│   │   └── client.ts              # CharacterDto +imageUrl
│   ├── components/
│   │   ├── RosterTable.tsx        # row click → onSelectCharacter
│   │   └── CharacterDetailPanel.tsx   # new: slide-in half-width panel
│   └── pages/
│       └── RosterPage.tsx         # selected-character state, renders the panel
└── tests/
    ├── unit/
    │   └── CharacterDetailPanel.test.tsx  # new
    └── integration/
        └── roster-page.test.tsx   # +open/switch/close scenarios
```

**Structure Decision**: No new projects or top-level directories — this
feature is purely additive within the existing `backend/` (one new
Blizzard API call in the sync pipeline, one new DB column) and `frontend/`
(one new component, wiring in existing files) structure from feature 001.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
