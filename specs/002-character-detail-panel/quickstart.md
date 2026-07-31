# Quickstart: Character Detail Panel

Validation guide for proving this feature works end-to-end. Builds on
feature 001's setup (`specs/001-battlenet-character-comparison/quickstart.md`)
— this guide assumes the app is already connected to a Battle.net account
with a synced roster. See `data-model.md` for the schema change and
`contracts/api.md` for the updated response shape referenced below.

## Prerequisites

- Everything from feature 001's quickstart (Battle.net developer app,
  `.env` configured, database migrated — including this feature's new
  migration adding `image_url`)
- A connected account with at least two characters, at least one of
  which has a Blizzard character render available (any character that
  has logged in recently) and, ideally, one that doesn't (to exercise
  the placeholder path)

## Setup

1. Run the database migration this feature adds (extends feature 001's
   migration set) to add the `image_url` column.
2. Start the backend and frontend dev servers as in feature 001's
   quickstart.
3. Connect (or confirm you're already connected) and refresh once so the
   roster is synced with the new `imageUrl` field populated.

## Validation scenarios

Each scenario maps to an acceptance scenario in `spec.md`.

### 1. Open the panel from a roster row

- Click anywhere on a character's row in the roster table.
- **Expect**: a panel slides in from the right edge of the screen,
  occupying half the browser width, within 1 second showing that
  character's name, class, race, faction, realm, level, item level,
  active specialization, and professions (SC-001, SC-002) — including
  professions, which the roster table itself doesn't display.
- **Expect**: the panel shows a character image, or a loading indicator
  briefly followed by the image once it loads.

### 2. Switch between characters without closing

- With the panel open for one character, click a different character's
  row.
- **Expect**: the panel updates in place to the newly clicked character
  — it does not close and reopen.

### 3. Close the panel

- With the panel open, use the explicit close control.
- **Expect**: the panel slides back out and the roster returns to its
  normal, unobstructed view (SC-003).
- Click the row of the character whose panel is currently open.
- **Expect**: the panel closes (the same as using the explicit close
  control).

### 4. Character with no available image

- Open the panel for a character whose `imageUrl` is `null` in the
  `GET /api/characters` response (or force an image load failure, e.g.
  by temporarily breaking network access to Blizzard's render CDN).
- **Expect**: a clear placeholder is shown in place of the image, not a
  broken image icon or blank space (SC-004).

### 5. Removed character

- Using a character already flagged `isRemoved` (see feature 001's
  refresh-flow quickstart scenario for how to produce one), open its
  detail panel.
- **Expect**: the panel clearly indicates the character's removed status
  alongside its last-known details, rather than presenting it as if
  still active on the account.
