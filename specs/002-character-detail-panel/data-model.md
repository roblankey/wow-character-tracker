# Phase 1 Data Model: Character Detail Panel

This feature makes one change to the existing schema from feature 001
(`specs/001-battlenet-character-comparison/data-model.md`) and introduces
one derived, non-persisted UI concept. No new tables.

## Change to `Character` (existing entity)

| Field | Type | Notes |
|---|---|---|
| `imageUrl` | text, nullable | **New.** Blizzard's `main-raw` (falling back to `avatar`) character render URL, resolved once per sync via the `character-media` API alongside the existing summary/professions calls. `null` when Blizzard has no media for that character yet (same 404-tolerant handling already used for `itemLevel`/`activeSpec`/`professions` — see feature 001's `fetchCharacterDetail`), in which case the panel shows a placeholder (FR-009). |

All other `Character` fields are unchanged from feature 001. This is a
backend-only, additive schema change (a new nullable column via a Drizzle
migration) — no changes to `BattleNetConnection` or to how characters are
matched/upserted/flagged-removed.

## Derived, non-persisted concept: Character Detail Panel

Matches spec.md's Key Entities section: the panel is not a new stored
entity. It's a client-side view over one already-fetched `Character` row
(including `imageUrl`), selected by ID. Opening, switching, and closing
the panel are pure frontend state changes (`selectedCharacterId` in
`RosterPage`) — they read already-loaded roster data and trigger no new
backend requests.

**State transitions** (all client-side only):
- No panel open → user clicks a row → panel open for that character's ID.
- Panel open for character A → user clicks character B's row → panel open
  for character B's ID (no intermediate closed state).
- Panel open for character A → user clicks character A's row again, or
  the explicit close control → no panel open.
- Roster refresh completes while the panel is open (feature 001's FR-005)
  → panel re-reads the (now possibly updated) `Character` row for the
  same selected ID from the refreshed roster data; if that character is
  now flagged `isRemoved`, the panel reflects that per FR-010.
