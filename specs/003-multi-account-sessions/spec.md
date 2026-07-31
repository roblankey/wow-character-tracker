# Feature Specification: Multi-Account Support Across Browser Sessions

**Feature Branch**: `003-multi-account-sessions`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "The application must support multiple Battle.net accounts across different browser sessions (e.g. opening multiple incognito windows)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect a different account per browser session (Priority: P1)

A player who has more than one Battle.net account (e.g. a main and an alt account) wants to
connect a different account in each of several open browser sessions — for example, one
regular browser window and one or more incognito windows — so each session shows that
session's own account and roster.

**Why this priority**: This is the core capability being requested. Without it, connecting a
second account in another session would overwrite or disconnect the first, which is the exact
problem this feature exists to solve.

**Independent Test**: Open two separate browser sessions (e.g. a normal window and an incognito
window), connect a different Battle.net account in each, and confirm each session shows only
the roster for the account connected within it.

**Acceptance Scenarios**:

1. **Given** no account is connected in either of two open browser sessions, **When** the user
   connects Account A in session 1 and Account B in session 2, **Then** session 1 shows Account
   A's roster and session 2 shows Account B's roster.
2. **Given** Account A is already connected in session 1, **When** the user connects Account B
   in a newly opened session 2, **Then** session 1's connection to Account A remains active and
   unaffected.

---

### User Story 2 - Session-scoped roster visibility (Priority: P1)

Within any given browser session, a player only ever sees the connection status and character
roster belonging to the account connected in that same session — never data belonging to an
account connected in a different session.

**Why this priority**: Data isolation is what makes multi-session support safe and useful; a
leak of one session's roster into another would make the feature actively misleading rather
than simply incomplete.

**Independent Test**: With two different accounts connected in two sessions, refresh the roster
in session 1 and confirm session 2's displayed roster and connection status do not change.

**Acceptance Scenarios**:

1. **Given** Account A is connected in session 1 and Account B is connected in session 2,
   **When** the user refreshes the roster in session 1, **Then** only session 1's roster
   updates and session 2's roster and connection status are unchanged.
2. **Given** Account A is connected in session 1, **When** the user opens a brand-new session
   with no connection yet, **Then** that new session shows a disconnected state, not Account
   A's data.

---

### User Story 3 - Disconnect one session without affecting others (Priority: P2)

A player disconnects the Battle.net account in one browser session and expects the connections
active in their other open sessions to be unaffected.

**Why this priority**: Builds directly on isolation (User Story 2) and is necessary for the
feature to be trustworthy in daily use, but the app is still usable for its primary purpose
(viewing multiple rosters at once) without it.

**Independent Test**: With two sessions each connected to a different account, disconnect the
account in session 1 and confirm session 2 remains connected and its roster is still visible.

**Acceptance Scenarios**:

1. **Given** Account A is connected in session 1 and Account B is connected in session 2,
   **When** the user disconnects in session 1, **Then** session 1 shows a disconnected state
   and session 2 still shows Account B connected with its roster intact.

---

### Edge Cases

- What happens when two sessions attempt to connect the same Battle.net account at the same
  time? (Both should be allowed to succeed independently; the app does not need to prevent the
  same account being connected in more than one session.)
- What happens when the OAuth callback for a "Connect" action lands after the user has opened
  or switched to a different session than the one that started the connection? The connection
  must be attributed back to the session that initiated it, not whichever session happens to be
  active when Battle.net redirects back.
- What happens when one session's Battle.net token expires while another session's token is
  still valid? Only the expired session should be prompted to reconnect; other sessions must be
  unaffected.
- What happens to a session's connection and roster data when the browser session ends (e.g.
  the incognito window is closed) without the user explicitly disconnecting first?
- What happens to the single Battle.net connection that already exists in the app today, once
  this feature ships?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow each distinct browser session to establish and maintain its own
  independent Battle.net account connection.
- **FR-002**: System MUST scope character roster data to the browser session that owns the
  underlying connection — a session MUST only ever display characters belonging to the account
  connected within that same session.
- **FR-003**: Connecting, refreshing, or disconnecting the Battle.net account in one session
  MUST NOT change the connection state or roster data of any other session.
- **FR-004**: System MUST correctly attribute an in-progress "Connect" action's OAuth callback
  back to the browser session that initiated it, even when connection attempts are in progress
  concurrently in other sessions.
- **FR-005**: System MUST continue to allow at most one active Battle.net connection per
  session at a time (the existing one-connection rule, now scoped to the session rather than
  the whole application).
- **FR-006**: System MUST allow the same Battle.net account to be connected in more than one
  session simultaneously without error.
- **FR-007**: System MUST clear the pre-existing single global Battle.net connection and its
  roster when this feature ships; no session, including one previously connected before the
  upgrade, automatically inherits it — every session must connect (or reconnect) explicitly
  under the new session-scoped model.
- **FR-008**: System MUST retain a session's Battle.net connection and roster data in local
  storage after the browser session ends (e.g. an incognito window is closed) without an
  explicit disconnect; data is only removed by an explicit disconnect action or by being
  overwritten by a new connection, consistent with the app's existing practice of never silently
  losing character data.
- **FR-009**: Every view (connection status, roster, refresh, error states) MUST continue to
  show loading and error states explicitly and visibly, scoped to the current session only.

### Key Entities

- **Browser Session**: A single browsing context (e.g. one incognito window, or one persistent
  normal-browser session) that determines which Battle.net connection and character roster a
  given interaction with the app belongs to. Multiple sessions can be open on the same machine
  at the same time.
- **Battle.net Connection**: An authorized link to one Battle.net account. Previously a single
  global record for the whole app; now owned by exactly one browser session.
- **Character Roster**: The set of WoW characters synced for a given connection, visible only
  within the session that owns that connection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can have at least 3 different Battle.net accounts connected at the same
  time across separate browser sessions on one machine, each showing its own correct roster.
- **SC-002**: Connecting, refreshing, or disconnecting an account in one browser session never
  alters the connection status or roster displayed in another already-open session, verified
  across 100% of tested concurrent-session scenarios.
- **SC-003**: A newly opened browser session with no prior connection always starts in a clearly
  disconnected state, never showing another session's account or roster.
- **SC-004**: Users can distinguish, without ambiguity, which Battle.net account's data they are
  currently viewing in any given session.

## Assumptions

- "Multiple Battle.net accounts across different browser sessions" refers to multiple Battle.net
  accounts used from the same local install of the app, distinguished by browser session — not a
  hosted, multi-user login system with usernames/passwords for the app itself.
- A "browser session" is distinguished the way browsers naturally distinguish them (e.g.
  separate incognito windows, or a normal browser profile vs. an incognito one) rather than by
  any in-app account switcher UI; no such switcher is in scope for this feature.
- The app remains locally run and single-machine; this feature does not introduce remote
  multi-tenant hosting or cross-device session sync.
- No limit is placed on the number of concurrent sessions/connections other than what the
  Blizzard API's existing rate limiting naturally imposes.
- Retained data for a session whose browser session has ended (e.g. an incognito window that
  was closed, discarding its session identifier) becomes unreachable through the UI since
  nothing can present the session identifier needed to access it again; this is accepted as a
  consequence of never silently deleting character data, and managing or purging such orphaned
  data is out of scope for this feature.
- The app's existing single Battle.net connection and roster (from before this feature ships)
  is cleared as part of this feature's rollout; the user who owns that connection today will
  need to reconnect afterward.
