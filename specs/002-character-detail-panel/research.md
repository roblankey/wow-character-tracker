# Phase 0 Research: Character Detail Panel

## Source of the character image

**Decision**: Use Blizzard's WoW Profile API `character-media` endpoint
(`GET /profile/wow/character/{realmSlug}/{characterName}/character-media`),
fetched alongside the existing per-character summary/professions calls in
`fetchFullCharacterRoster`. Its `assets` array is keyed by image type
(`avatar`, `inset`, `main-raw`, `main`); use `main-raw` (the full character
render without a frame) as the primary image, falling back to `avatar` if
`main-raw` isn't present. Store the resolved URL on the `character` row as
`imageUrl` (nullable).

**Rationale**: This is the same Blizzard Profile API family the app
already integrates with (spec.md's Assumption: "a visual rendering of the
in-game character sourced from Blizzard"), and it slots into the existing
404-tolerant per-character fetch pattern (`fetchCharacterDetail` in
`backend/src/battlenet/client.ts`) with no new architecture. Fetching it
during sync (not on-demand at panel-open time) means opening the panel
does zero backend network calls — the URL is already sitting in the
already-fetched roster — which satisfies the constitution's "no redundant
external calls" requirement more directly than an on-demand fetch would.

**Alternatives considered**: Fetching character-media on-demand when the
panel opens (a new `GET /api/characters/:id/media` endpoint) — rejected
because it adds a Blizzard API call every time a user opens a panel for a
character they've already synced, which is exactly the kind of redundant
call the constitution's Performance principle rules out, and it would
also make SC-001 (details visible within 1 second) dependent on a live
Blizzard round-trip instead of already-local data.

## Serving the actual image bytes

**Decision**: The frontend's `<img>` tag points directly at the Blizzard
render URL returned by `character-media` (e.g.
`https://render-us.worldofwarcraft.com/character/...`) — the backend
never proxies or re-hosts the image bytes.

**Rationale**: Blizzard's character render URLs are public, unauthenticated
static assets (only the API call that *resolves* the URL needs the OAuth
access token — the resulting image itself doesn't). Proxying image bytes
through our own backend would add bandwidth/latency for no benefit and
contradicts the constitution's Code Quality principle (no speculative
complexity beyond what FR-005 requires).

**Alternatives considered**: Backend proxy/cache of image bytes —
rejected as unnecessary complexity for a single-user local app with no
CORS, rate-limit, or credential-leak reason to hide the destination URL
(it's already a public Blizzard CDN URL once resolved).

## Panel implementation approach

**Decision**: A single new `CharacterDetailPanel` React component,
rendered by `RosterPage` when a `selectedCharacterId` piece of state is
set. `RosterTable` gains an `onSelectCharacter` callback invoked on row
click. The panel is positioned with CSS (`position: fixed`, `right: 0`,
`width: 50vw`) and uses a CSS transition on `transform: translateX(...)`
for the slide-in/out animation, consistent with the app's existing
approach of hand-written CSS in `App.css` (no animation library).

**Rationale**: Matches feature 001's established pattern of small,
single-purpose components with page-level state (e.g. how `RosterPage`
already owns `refreshing`/`disconnecting` state for its child
components) and hand-written CSS (no dependency added for a single
slide-in transition, consistent with the Code Quality principle's
YAGNI stance).

**Alternatives considered**: A dedicated modal/drawer library — rejected
as unnecessary for one slide-in panel with simple, well-understood CSS;
would add a dependency for something achievable in a few CSS rules,
against the constitution's simplicity guidance.

## Loading and unavailable-image states

**Decision**: The `<img>` element's native `onError` handler swaps to a
placeholder graphic (reusing the app's existing muted/neutral visual
style) when `imageUrl` is `null` (Blizzard never had it) or when the
browser fails to load the URL (network hiccup, expired render). A brief
loading state (skeleton/placeholder) shows until the `<img>` fires
`onLoad` or `onError`.

**Rationale**: Directly satisfies FR-009/SC-004 (placeholder instead of a
broken image) and the Edge Cases entry about a still-loading image,
using standard, dependency-free `<img>` event handling rather than a
custom image-loading library.

**Alternatives considered**: A generic "loading state" wrapper component
reusable beyond this one image — rejected as speculative given there's
currently exactly one place in the app that needs this (YAGNI).
