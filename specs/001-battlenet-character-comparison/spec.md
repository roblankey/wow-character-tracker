# Feature Specification: Battle.net Character Comparison

**Feature Branch**: `001-battlenet-character-comparison`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "as a world of warcraft player, i want to track the characters on my Battle.net account, so that i can easily see differences between them"

**Scope note (2026-07-31)**: The side-by-side comparison capability
(originally User Story 2 / FR-004 / SC-002) was removed after
implementation at the user's request. This spec is kept as the historical
record of the original request; the sections below reflect the feature's
current, reduced scope — roster tracking only, no comparison view.

**Scope note (2026-07-31, UI refinements)**: After the roster view shipped
and was exercised against a real Battle.net account, several display-layer
requirements were added: sortable columns (FR-011), hiding characters
Blizzard hasn't indexed yet (FR-012), dropping professions from the
roster view (FR-013), and a clearly Battle.net-branded connect action
(FR-014). None of these change the backend API contract in
`contracts/api.md` — characters and their professions are still fetched
and stored exactly as before; only what the roster view displays changed.

**Scope note (2026-07-31, rebrand)**: The app was renamed from "Roster" to
"WoWster" — the wordmark, browser tab title, and project name were updated
accordingly. Cosmetic only; no functional or API change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect account and view roster (Priority: P1)

As a WoW player, I want to connect my Battle.net account so that all of my
characters are automatically pulled into one roster, instead of me manually
listing them.

**Why this priority**: This is the foundation the rest of the feature
depends on — without a roster pulled from the account, there is nothing to
track.

**Independent Test**: Can be fully tested by connecting a Battle.net account
and verifying the resulting roster matches the characters that account
actually has in-game.

**Acceptance Scenarios**:

1. **Given** a user has not yet connected a Battle.net account, **When**
   they authorize the connection, **Then** the system displays a roster
   listing every WoW character on that account, including name, class,
   realm, and faction.
2. **Given** a user's Battle.net account has no WoW characters, **When**
   they connect it, **Then** the system shows an empty roster with a clear
   explanation rather than an error.
3. **Given** a user has already connected their account, **When** they
   revisit the roster, **Then** the previously retrieved characters are
   still shown without requiring re-authorization.
4. **Given** a user has not connected a Battle.net account, **When** they
   view the page, **Then** they see a clearly Battle.net-branded connect
   action (not a plain text link) so it's unambiguous what service they're
   authorizing with.
5. **Given** a roster with two or more characters, **When** the user clicks
   a column header, **Then** the roster re-sorts by that column ascending;
   clicking the same header again reverses it to descending. The roster is
   sorted by name ascending by default.

---

### User Story 2 - Refresh character data (Priority: P2)

As a WoW player, I want to refresh my tracked character data on demand so
that my roster reflects my most recent play session.

**Why this priority**: Useful once the roster exists, but the feature
still delivers value with a one-time snapshot even before refresh is used.

**Independent Test**: Can be fully tested by changing something about a
character in-game, requesting a refresh, and confirming the updated value
appears in the roster.

**Acceptance Scenarios**:

1. **Given** a connected account, **When** the user requests a refresh,
   **Then** the system re-fetches character data and updates any values
   that changed since the last sync.
2. **Given** the Battle.net API is temporarily unavailable, **When** the
   user requests a refresh, **Then** the system clearly reports the refresh
   failed and continues showing the last successfully retrieved data
   labeled with its retrieval time.

---

### Edge Cases

- What happens when a character has been deleted, renamed, or transferred
  off the connected account since the last sync? The roster MUST reflect
  its removal or renaming rather than showing stale, orphaned entries.
- What happens if the Battle.net API is unavailable, rate-limited, or
  returns partial data during a sync?
- How does the system handle a character that hasn't logged in for a long
  time (data may be very stale relative to the rest of the roster)?
- What happens if the user revokes the app's access to their Battle.net
  account? The system MUST stop retrieving new data and inform the user
  their connection is no longer active.
- How does the system handle a character Blizzard hasn't indexed profile
  data for yet (observed in practice for low-activity characters, which
  come back from Blizzard with no item level)? The roster MUST exclude
  these rather than showing broken/placeholder rows (FR-012).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a user authorize a connection to their
  Battle.net account so the system can retrieve their World of Warcraft
  characters on that account.
- **FR-002**: System MUST display all WoW characters found on the connected
  account that have usable profile data (see FR-012) in a single roster
  view, showing each character's name, class, race, faction, realm, level,
  equipped item level, and active specialization.
- **FR-003**: System MUST retrieve, for each character, level, equipped
  item level, active specialization, and professions; professions are
  retrieved and stored but not shown in the roster view (FR-013).
- **FR-005**: System MUST let the user manually trigger a refresh that
  re-fetches the latest character data from the connected Battle.net
  account.
- **FR-006**: System MUST retain only the latest known state of each
  character (no historical/progression history is tracked in this
  feature); each refresh replaces the previous snapshot.
- **FR-007**: System MUST remove or clearly flag characters that are no
  longer present on the connected account (e.g., deleted or transferred)
  the next time the roster is refreshed.
- **FR-008**: System MUST clearly indicate when a refresh fails (e.g.,
  Battle.net API unavailable) and continue displaying the last
  successfully retrieved data along with when it was retrieved, rather than
  silently presenting stale data as current.
- **FR-009**: Users MUST be able to disconnect/revoke their Battle.net
  account connection, after which the system stops retrieving new
  character data for that account.
- **FR-010**: System MUST support exactly one connected Battle.net account
  per user in this feature.
- **FR-011**: System MUST let the user sort the roster by clicking any
  displayed column's header; a second click on the same column reverses
  the sort direction. The roster MUST be sorted by name ascending by
  default.
- **FR-012**: System MUST exclude characters with no usable profile data
  (observed in practice as an item level of 0, meaning Blizzard has not
  yet indexed that character) from the displayed roster, rather than
  showing broken or placeholder rows.
- **FR-013**: System MUST NOT display professions in the roster view.
- **FR-014**: System MUST present the Battle.net connect action as a
  clearly branded, recognizable button rather than a plain text link.

FR-004 numbering is intentionally retired, not reused, so it isn't
confused with a still-active requirement — it covered the removed
side-by-side comparison capability.

### Key Entities

- **Battle.net Account Connection**: The authorized link between a user and
  their Battle.net account; tracks connection status and when data was last
  successfully synced.
- **Character**: A single WoW character belonging to the connected account
  — name, class, race, faction, realm, level, item level, specialization,
  and professions. Professions are stored but not shown in the roster
  view (FR-013); characters with an item level of 0 are stored but
  excluded from the displayed roster (FR-012).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can connect their Battle.net account and see their
  full character roster appear in under 30 seconds.
- **SC-003**: 100% of the WoW characters present on a connected Battle.net
  account that have usable Blizzard profile data (item level > 0) appear
  correctly in the roster after connecting.
- **SC-004**: A requested refresh completes and reflects updated in-game
  progress within 2 minutes.

SC-002 numbering is intentionally retired for the same reason as FR-004.

## Assumptions

- The system integrates with the official Blizzard Battle.net/WoW APIs to
  retrieve character data directly; no manual character data entry is
  required for core functionality.
- A single Battle.net account is connected per user for this feature;
  linking multiple Battle.net accounts to one user is out of scope.
- The region associated with the connected Battle.net account is used as-is;
  explicit multi-region account switching is out of scope for this feature.
- Character data is refreshed on-demand rather than continuously in real
  time, consistent with the Blizzard API's polling model (no push/webhook
  updates are available).
- The roster in this feature is a snapshot of current state only; time-
  series/progression tracking of a character's history is out of scope and
  could be a future enhancement.
- Per-character data staleness (e.g., a character not played in months) is
  not visually distinguished from freshly-synced characters; only the
  account-level `lastSyncedAt`/`lastSyncStatus` indicates how recent the
  last sync was.
- Side-by-side character comparison is out of scope (removed post-
  implementation); the roster is a flat list of characters only.
- Battle.net's user-authorization OAuth flow does not issue a refresh
  token (confirmed against the live API); an expired access token
  requires the user to reconnect rather than being silently renewed.
- Some characters listed in the account summary may 404 on Blizzard's
  per-character profile/professions endpoints (observed against the live
  API for low-activity characters); those characters are still stored
  with default/unknown values for the fields that couldn't be fetched,
  rather than the whole sync failing — but per FR-012 they're then
  excluded from the *displayed* roster, since an item level of 0 is used
  as the signal that Blizzard hasn't indexed that character yet. This is
  a pragmatic proxy (Blizzard doesn't expose an explicit "indexed" flag)
  and would incorrectly hide a real, legitimately-0-item-level character
  if one existed — accepted as a reasonable trade-off since a fresh
  level-1 character has no meaningful roster data to show anyway.
