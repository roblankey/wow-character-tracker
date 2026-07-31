# Backend REST API Contract Changes: Character Detail Panel

This feature changes exactly one existing endpoint from feature 001's
contract (`specs/001-battlenet-character-comparison/contracts/api.md`).
No new endpoints are introduced — the panel is populated entirely from
data the frontend already fetches for the roster.

## `GET /api/characters` (changed)

Adds one field, `imageUrl`, to each character in the response.

**Response 200**:

```json
{
  "characters": [
    {
      "id": 1,
      "name": "Thrallmar",
      "realmName": "Area 52",
      "faction": "Horde",
      "class": "Warrior",
      "race": "Orc",
      "level": 80,
      "itemLevel": 489,
      "activeSpec": "Protection",
      "professions": [{ "name": "Blacksmithing", "skillLevel": 100 }],
      "imageUrl": "https://render-us.worldofwarcraft.com/character/area-52/123/456789-main.jpg",
      "isRemoved": false,
      "updatedAt": "2026-07-30T12:05:00Z"
    }
  ]
}
```

`imageUrl` is `null` when Blizzard has no character-media available for
that character (same per-character indexing gap already tolerated for
`itemLevel`/`activeSpec`/`professions` — see feature 001's
`fetchCharacterDetail`). The frontend treats `null` the same as an
`<img>` load failure: show a placeholder (FR-009).

Covers: FR-004, FR-005, FR-009, FR-010 (roster data — including the new
image — is already present for the panel to read; no additional request
needed when the panel opens).

## No new endpoints

Opening, switching, and closing the character detail panel are pure
frontend state changes over the already-fetched `GET /api/characters`
response (see data-model.md's "Derived, non-persisted concept"). There is
no `GET /api/characters/:id` or `/media` endpoint — adding one would be a
redundant Blizzard-API round trip at panel-open time, which
research.md's "Source of the character image" decision explicitly
rejects.
