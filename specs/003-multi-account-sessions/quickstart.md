# Quickstart: Multi-Account Support Across Browser Sessions

Validation guide for proving this feature works end-to-end. Builds on feature 001's setup
(`specs/001-battlenet-character-comparison/quickstart.md`) — this guide assumes the Battle.net
developer app, `.env`, and database are already set up. See `data-model.md` for the schema
change and `contracts/api.md` for the updated response shapes referenced below.

## Prerequisites

- Everything from feature 001's quickstart, plus a new required `.env` value:
  `SESSION_COOKIE_SECRET` (see `.env.example` for how to generate one).
- Two Battle.net accounts to connect (or the same account twice — FR-006 allows this), so
  isolation is actually observable.
- A browser that supports multiple isolated cookie jars at once — e.g. one normal window plus
  one or more incognito/private windows, or two different browser profiles.

## Setup

1. Run the database migration this feature adds (extends feature 001/002's migration set) —
   this clears any existing connection/roster per FR-007, so expect to reconnect afterward.
2. Start the backend and frontend dev servers as in feature 001's quickstart.

## Validation scenarios

Each scenario maps to an acceptance scenario in `spec.md`.

### 1. Connect a different account per session (User Story 1)

- Open a normal browser window and an incognito window, both pointed at the frontend dev
  server.
- In the normal window, connect Account A. In the incognito window, connect Account B.
- **Expect**: each window shows "Connected as" its own account's battletag and its own roster;
  connecting Account B did not disconnect or change Account A's window.

### 2. Session-scoped roster visibility (User Story 2)

- With Account A connected in window 1 and Account B connected in window 2 (from scenario 1),
  refresh the roster in window 1.
- **Expect**: only window 1's roster/last-synced time updates; window 2's roster and connection
  status are unchanged.
- Open a third, brand-new session (another incognito window) with no connection made yet.
- **Expect**: it shows a disconnected state, never Account A's or B's data.

### 3. Disconnect one session without affecting others (User Story 3)

- With Account A connected in window 1 and Account B connected in window 2, disconnect in
  window 1.
- **Expect**: window 1 returns to the disconnected/"Log In" state; window 2 still shows Account
  B connected with its roster intact.

### 4. OAuth callback attribution under concurrent connects (Edge Case)

- Start connecting an account in window 1 (click "Log In", but pause on Battle.net's
  authorization page before approving).
- In window 2, connect a different account fully.
- Now approve the window-1 authorization on Battle.net.
- **Expect**: window 1 ends up connected to the account it actually authorized, not window 2's
  account, even though window 2's connect attempt completed while window 1's was still pending.

### 5. Session data survives the window closing (FR-008)

- Connect an account in an incognito window, confirm the roster loads, then close that
  incognito window entirely (discarding its cookie) without disconnecting.
- **Expect**: no error occurs on close; the app has no way to show that data again (a new
  incognito window starts fresh/disconnected, per scenario 2) — this is expected, not a bug (see
  data-model.md's session lifecycle and the resolved retention clarification in spec.md).

### 6. Pre-existing connection is cleared by the upgrade (FR-007)

- Only meaningful when upgrading a database that had a connection from before this feature —
  confirm that after running the migration, the previously-connected session now shows
  disconnected and must reconnect.
