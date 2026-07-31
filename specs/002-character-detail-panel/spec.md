# Feature Specification: Character Detail Panel

**Feature Branch**: `002-character-detail-panel`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Clicking a table row should launch a character panel that comes in from the right, takes up half the width, and displays all the character information, including a character image"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View full character details in a side panel (Priority: P1)

As a WoW player looking at my roster, I want to click on a character to see
all of its details — including a picture of the character — in a panel
beside the roster, so I can look closer at one character without leaving
the roster view.

**Why this priority**: This is the entire feature — there is no smaller
independently-valuable slice. Opening, switching between characters, and
closing the panel are all part of one cohesive interaction.

**Independent Test**: Can be fully tested by clicking a character row in a
populated roster and confirming a panel slides in from the right showing
that character's full details and image, then confirming it can be closed
and switched between characters.

**Acceptance Scenarios**:

1. **Given** a roster with at least one character, **When** the user clicks
   anywhere on that character's row, **Then** a panel slides in from the
   right edge of the screen, occupying half the available width, showing
   that character's full details and an image of the character.
2. **Given** the detail panel is open for a character, **When** the user
   clicks a different character's row, **Then** the panel updates in place
   to show the newly selected character rather than requiring the panel to
   be closed and reopened.
3. **Given** the detail panel is open, **When** the user closes it, **Then**
   the panel slides back out and the roster returns to its normal,
   unobstructed view.
4. **Given** the detail panel is open for a character, **When** the user
   clicks that same character's row again, **Then** the panel closes.
5. **Given** a character whose image cannot be retrieved, **When** its
   detail panel is opened, **Then** the panel shows a clear placeholder in
   place of the image rather than a broken image or blank space.
6. **Given** a character flagged as removed from the account, **When** its
   detail panel is opened, **Then** the panel clearly indicates the
   character's removed status alongside its last-known details.

---

### Edge Cases

- What happens if the character's image is still loading when the panel
  opens? The panel MUST show a loading indicator for the image rather than
  a blank or broken image area.
- What happens if the user opens the panel, then the roster refreshes
  (FR-005 of the roster tracking feature) while the panel is still open?
  The panel MUST reflect the refreshed data for that character, or clearly
  indicate if the character is no longer present.
- What happens on a narrow browser window where a half-width panel would
  leave very little room for either side? No specific narrow-window
  behavior is defined for this feature (see Assumptions).
- What happens if the user opens the panel for a character and then that
  character is removed by a refresh while the panel stays open? The panel
  MUST reflect the character's removed status rather than showing stale
  data as if nothing changed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let the user open a character's detail panel by
  clicking anywhere on that character's row in the roster table.
- **FR-002**: The detail panel MUST slide in from the right edge of the
  screen when it opens, rather than appearing instantly or from another
  direction.
- **FR-003**: The detail panel MUST occupy half of the available viewing
  width while open.
- **FR-004**: The detail panel MUST display all tracked information for
  the selected character: name, class, race, faction, realm, level, item
  level, active specialization, and professions (listed by name; per-
  profession skill level is not surfaced in this panel).
- **FR-005**: The detail panel MUST display an image representing the
  character.
- **FR-006**: System MUST let the user close the detail panel and return
  to an unobstructed view of the roster.
- **FR-007**: Clicking a different character's row while the panel is open
  MUST update the panel to the newly selected character rather than
  requiring the user to close and reopen it.
- **FR-008**: Clicking the row of the character whose panel is already
  open MUST close the panel.
- **FR-009**: If a character's image cannot be retrieved, System MUST show
  a clear placeholder instead of a broken or blank image.
- **FR-010**: The detail panel MUST work for characters flagged as removed
  from the account, and MUST clearly indicate that removed status.

### Key Entities

- **Character Detail Panel**: An on-demand, single-character view derived
  from the same roster data already tracked for that character, plus an
  image of the character. Not a new stored entity — it reflects whichever
  one character is currently selected, and closes/updates without
  affecting the underlying roster data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open a character's detail panel and see its
  tracked information within 1 second of clicking the row.
- **SC-002**: 100% of the character attributes already tracked in the
  roster are visible in the detail panel without further navigation.
- **SC-003**: Users can return to a fully unobstructed roster view in a
  single action from an open detail panel.
- **SC-004**: When a character's image can't be retrieved, a placeholder
  is shown instead of a broken image 100% of the time.

## Assumptions

- "Character image" means a visual rendering of the in-game character
  sourced from Blizzard, consistent with this app's existing
  Blizzard-API-driven data model — not a user-uploaded avatar or a generic
  class/race icon.
- "Half the width" means half of the browser viewport's width, not a fixed
  pixel value or half of some inner container.
- The panel is non-modal: the roster remains visible (though visually
  secondary) in the other half of the screen while the panel is open,
  rather than the panel blocking the whole page.
- Only one character's detail panel can be open at a time.
- Character image data is not part of what this app currently syncs or
  stores from Blizzard; how and when it's retrieved (e.g., on-demand when
  the panel opens vs. fetched alongside the rest of the roster) is a
  planning-level decision, not a constraint of this specification.
- No specific behavior is defined for narrow browser windows; this feature
  targets the same desktop-width usage the rest of the app already assumes.
- This feature only adds a way to view existing tracked character data
  (plus an image) in more detail — it does not add any new trackable
  character attributes beyond what the roster already stores.
- Character details are laid out as a compact table beneath the image
  rather than a long vertically-stacked list, so the panel does not
  require excessive scrolling to see all fields at once.
