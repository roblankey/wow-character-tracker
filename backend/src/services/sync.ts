import { and, eq, notInArray } from 'drizzle-orm';
import type { DbClient } from '../db/client.js';
import type { Config } from '../config.js';
import { battleNetConnection, character } from '../db/schema.js';
import { decryptSecret, encryptSecret } from '../db/crypto.js';
import { refreshAccessToken } from '../battlenet/oauth.js';
import { fetchFullCharacterRoster } from '../battlenet/client.js';

export interface SyncResult {
  status: 'success' | 'failure';
  error?: string;
}

/**
 * Returns a valid (non-expired) access token for the connection, refreshing
 * and persisting new tokens first if the current one has expired.
 */
async function getValidAccessToken(
  db: DbClient,
  config: Config,
  connectionId: number,
): Promise<string> {
  const [connection] = await db
    .select()
    .from(battleNetConnection)
    .where(eq(battleNetConnection.id, connectionId));

  if (!connection) {
    throw new Error(`No BattleNetConnection with id ${connectionId}`);
  }

  const isExpired = connection.tokenExpiresAt.getTime() <= Date.now() + 60_000;
  if (!isExpired) {
    return decryptSecret(connection.accessToken, config.tokenEncryptionKey);
  }

  const refreshToken = decryptSecret(connection.refreshToken, config.tokenEncryptionKey);
  const tokens = await refreshAccessToken(config, refreshToken);

  await db
    .update(battleNetConnection)
    .set({
      accessToken: encryptSecret(tokens.accessToken, config.tokenEncryptionKey),
      refreshToken: encryptSecret(tokens.refreshToken, config.tokenEncryptionKey),
      tokenExpiresAt: tokens.expiresAt,
    })
    .where(eq(battleNetConnection.id, connectionId));

  return tokens.accessToken;
}

/**
 * Fetches the latest roster from Blizzard and upserts it for the given
 * connection, then records the sync outcome on the connection row. Never
 * throws: failures are captured in the returned SyncResult and in
 * lastSyncStatus/lastSyncError so the last good roster stays visible (FR-008).
 */
export async function syncCharacters(
  db: DbClient,
  config: Config,
  connectionId: number,
): Promise<SyncResult> {
  try {
    const accessToken = await getValidAccessToken(db, config, connectionId);
    const fetched = await fetchFullCharacterRoster(config, accessToken);
    const now = new Date();

    for (const fetchedCharacter of fetched) {
      const existing = await db
        .select({ id: character.id })
        .from(character)
        .where(eq(character.battlenetCharacterId, fetchedCharacter.battlenetCharacterId));

      const row = {
        connectionId,
        battlenetCharacterId: fetchedCharacter.battlenetCharacterId,
        name: fetchedCharacter.name,
        realmSlug: fetchedCharacter.realmSlug,
        realmName: fetchedCharacter.realmName,
        faction: fetchedCharacter.faction,
        class: fetchedCharacter.class,
        race: fetchedCharacter.race,
        level: fetchedCharacter.level,
        itemLevel: fetchedCharacter.itemLevel,
        activeSpec: fetchedCharacter.activeSpec,
        professions: JSON.stringify(fetchedCharacter.professions),
        isRemoved: false,
        updatedAt: now,
      };

      if (existing[0]) {
        await db.update(character).set(row).where(eq(character.id, existing[0].id));
      } else {
        await db.insert(character).values(row);
      }
    }

    // FR-007: characters no longer returned by Blizzard for this account are
    // flagged as removed rather than deleted, so the roster can explain what
    // happened instead of the row silently vanishing.
    const fetchedIds = fetched.map((f) => f.battlenetCharacterId);
    await db
      .update(character)
      .set({ isRemoved: true, updatedAt: now })
      .where(
        fetchedIds.length > 0
          ? and(
              eq(character.connectionId, connectionId),
              notInArray(character.battlenetCharacterId, fetchedIds),
            )
          : eq(character.connectionId, connectionId),
      );

    await db
      .update(battleNetConnection)
      .set({ lastSyncedAt: now, lastSyncStatus: 'success', lastSyncError: null })
      .where(eq(battleNetConnection.id, connectionId));

    return { status: 'success' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(battleNetConnection)
      .set({ lastSyncStatus: 'failure', lastSyncError: message })
      .where(eq(battleNetConnection.id, connectionId));
    return { status: 'failure', error: message };
  }
}
