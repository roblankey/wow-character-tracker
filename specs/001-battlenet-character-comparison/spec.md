# Feature Specification: Battle.net Character Comparison

**Feature Branch**: `001-battlenet-character-comparison`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "as a world of warcraft player, i want to track the characters on my Battle.net account, so that i can easily see differences between them"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect account and view roster (Priority: P1)

As a WoW player, I want to connect my Battle.net account so that all of my
characters are automatically pulled into one roster, instead of me manually
listing them.

**Why this priority**: Without a roster of characters pulled from the
account, there is nothing to compare. This is the foundation every other
story depends on.

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

---

### User Story 2 - Compare characters side-by-side (Priority: P2)

As a WoW player, I want to see my characters side-by-side so that I can
quickly spot how they differ from one another.

**Why this priority**: This is the stated reason the user wants tracking in
the first place — the roster alone doesn't deliver the "see differences"
value on its own.

**Independent Test**: Can be fully tested by selecting two or more
characters from the roster and confirming the comparison view highlights
attributes where their values differ.

**Acceptance Scenarios**:

1. **Given** a roster with two or more characters, **When** the user opens
   the comparison view, **Then** the system displays the tracked attributes
   for each character side-by-side with differing values visually
   highlighted.
2. **Given** a roster with only one character, **When** the user opens the
   comparison view, **Then** the system explains that at least two
   characters are needed to compare, rather than showing a broken or empty
   view.
3. **Given** two characters with identical values for every tracked
   attribute, **When** the user compares them, **Then** the system
   indicates there are no differences rather than showing a misleading
   empty highlight state.

---

### User Story 3 - Refresh character data (Priority: P3)

As a WoW player, I want to refresh my tracked character data on demand so
that comparisons reflect my most recent play session.

**Why this priority**: Useful once roster and comparison exist, but the
feature still delivers value with a one-time snapshot even before refresh
is used.

**Independent Test**: Can be fully tested by changing something about a
character in-game, requesting a refresh, and confirming the updated value
appears in the roster and comparison view.

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
- How does the system handle a Battle.net account with only one WoW
  character (nothing to compare against)?
- What happens if the Battle.net API is unavailable, rate-limited, or
  returns partial data during a sync?
- How does the system handle a character that hasn't logged in for a long
  time (data may be very stale relative to the rest of the roster)?
- What happens if the user revokes the app's access to their Battle.net
  account? The system MUST stop retrieving new data and inform the user
  their connection is no longer active.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a user authorize a connection to their
  Battle.net account so the system can retrieve their World of Warcraft
  characters on that account.
- **FR-002**: System MUST display all WoW characters found on the connected
  account in a single roster view, showing at minimum each character's
  name, class, realm, and faction.
- **FR-003**: System MUST retrieve and display, for each character: level,
  equipped item level, active specialization, and professions.
- **FR-004**: System MUST let the user select two or more characters from
  the roster and view them side-by-side, with attributes that differ
  between the selected characters visually highlighted.
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

### Key Entities

- **Battle.net Account Connection**: The authorized link between a user and
  their Battle.net account; tracks connection status and when data was last
  successfully synced.
- **Character**: A single WoW character belonging to the connected account
  — name, class, race, faction, realm, level, item level, specialization,
  and professions.
- **Comparison View**: An on-demand grouping of two or more characters from
  the roster with their differing tracked attributes highlighted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can connect their Battle.net account and see their
  full character roster appear in under 30 seconds.
- **SC-002**: A user can identify at least one meaningful difference
  between two of their characters within 10 seconds of opening the
  comparison view.
- **SC-003**: 100% of the WoW characters present on a connected Battle.net
  account appear correctly in the roster after connecting.
- **SC-004**: A requested refresh completes and reflects updated in-game
  progress within 2 minutes.

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
- "Differences between characters" means comparing characters on the same
  connected account against each other, not against other players'
  characters.
- The comparison in this feature is a snapshot of current state only; time-
  series/progression tracking of a character's history is out of scope and
  could be a future enhancement.
