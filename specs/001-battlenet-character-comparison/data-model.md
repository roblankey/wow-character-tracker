# Phase 1 Data Model: Battle.net Character Comparison

Two persisted entities, both owned by the backend's SQLite database. There
is no separate "User" entity — the app is single-user by design (see
research.md). Side-by-side comparison (and the derived, non-persisted
"Comparison" concept originally documented here) was removed after
implementation — see spec.md's Scope note.

## BattleNetConnection

The authorized link between this app instance and one Battle.net account.
Exactly zero or one row exists at a time (FR-010).

| Field | Type | Notes |
|---|---|---|
| `id` | integer, PK | |
| `battlenetAccountId` | text | Stable account identifier from Blizzard's OAuth `userinfo` response |
| `region` | text | Region the account authorized against (e.g. `us`, `eu`); used as-is, not switchable (per spec Assumptions) |
| `accessToken` | text | Encrypted at rest; backend-only, never serialized to the frontend |
| `tokenExpiresAt` | datetime | Used to detect an expired token before a Blizzard API call; there is no `refreshToken` — see note below |
| `connectedAt` | datetime | When the authorization was first completed |
| `lastSyncedAt` | datetime, nullable | Timestamp of the last successful roster sync |
| `lastSyncStatus` | text enum: `success` \| `failure` \| `never_run` | Drives the loading/error state required by FR-008 |
| `lastSyncError` | text, nullable | Human-readable reason for the last failure, shown to the user rather than a silent stale view |

**Validation rules**: at most one row ever exists (enforced at the service
layer, not a DB constraint, since SQLite has no native "singleton table"
concept). `region` must be a Blizzard-supported region code.

**Lifecycle**: created on successful OAuth callback; deleted when the user
disconnects (FR-009), which also cascades to delete all `Character` rows
for that connection.

**Note (discovered against the live Blizzard API)**: Battle.net's
user-authorization flow does not issue a refresh token, so there is no
`refreshToken` field to store. When `tokenExpiresAt` has passed, a sync
fails with a clear "reconnect your account" error (FR-008) rather than
silently renewing — reconnecting creates a fresh row via the same
FR-010 replace-existing-connection path used for the initial connect.

## Character

One WoW character belonging to the connected account.

| Field | Type | Notes |
|---|---|---|
| `id` | integer, PK | |
| `connectionId` | integer, FK → `BattleNetConnection.id`, cascade delete | |
| `battlenetCharacterId` | text | Blizzard's stable per-character identifier; used to match across syncs even through a rename |
| `name` | text | |
| `realmSlug` | text | |
| `realmName` | text | |
| `faction` | text enum: `Alliance` \| `Horde` | |
| `class` | text | Official WoW class name (FR-002, constitution Principle III terminology rule) |
| `race` | text | |
| `level` | integer | 1–80 at time of writing; not hard-coded as a constraint value, validated as a positive integer |
| `itemLevel` | integer | Equipped item level (FR-003) |
| `activeSpec` | text | Active specialization name (FR-003) |
| `professions` | text (JSON array of `{ name, skillLevel }`) | Stored as a JSON column — a normalized child table is unnecessary complexity for a small, always-read-together list (YAGNI) |
| `isRemoved` | boolean, default `false` | Set when a sync no longer finds this character on the account (FR-007), instead of hard-deleting |
| `updatedAt` | datetime | Timestamp of the last sync that touched this row |

**Validation rules**: `level` and `itemLevel` are non-negative integers;
`faction` is restricted to the two valid values; `battlenetCharacterId` is
unique per `connectionId`.

**State transitions**:
- New character appears in a sync → row inserted with `isRemoved = false`.
- Character present in a previous sync but absent from the latest one →
  `isRemoved` set to `true`, `updatedAt` bumped; row is kept (not deleted)
  so the roster can show it was removed rather than having it vanish
  silently.
- Character reappears in a later sync (e.g., transferred back) →
  `isRemoved` reset to `false` and fields refreshed.
- Connection disconnected (FR-009) → all `Character` rows for that
  connection are deleted via cascade.
