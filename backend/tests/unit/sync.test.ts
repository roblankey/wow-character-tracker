import { describe, expect, it, vi, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';

vi.mock('../../src/battlenet/client.js', () => ({
  fetchFullCharacterRoster: vi.fn(),
}));

import { fetchFullCharacterRoster } from '../../src/battlenet/client.js';
import { battleNetConnection, character } from '../../src/db/schema.js';
import { encryptSecret } from '../../src/db/crypto.js';
import { syncCharacters } from '../../src/services/sync.js';
import { createTestConfig, createTestDb } from '../helpers/testApp.js';

const config = createTestConfig();

async function insertConnection(
  db: ReturnType<typeof createTestDb>,
  overrides: Partial<typeof battleNetConnection.$inferInsert> = {},
) {
  const [connection] = await db
    .insert(battleNetConnection)
    .values({
      sessionId: 'session-1',
      battlenetAccountId: 'acct-1',
      battletag: 'Tester#1234',
      region: 'us',
      accessToken: encryptSecret('access-token', config.tokenEncryptionKey),
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      connectedAt: new Date(),
      lastSyncStatus: 'never_run',
      ...overrides,
    })
    .returning();
  return connection!;
}

describe('syncCharacters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts new characters returned by the Blizzard client', async () => {
    const db = createTestDb();
    const connection = await insertConnection(db);
    vi.mocked(fetchFullCharacterRoster).mockResolvedValue([
      {
        battlenetCharacterId: 'char-1',
        name: 'Thrallmar',
        realmSlug: 'area-52',
        realmName: 'Area 52',
        faction: 'Horde',
        class: 'Warrior',
        race: 'Orc',
        level: 80,
        itemLevel: 489,
        activeSpec: 'Protection',
        imageUrl: null,
        professions: [{ name: 'Blacksmithing', skillLevel: 100 }],
      },
    ]);

    const result = await syncCharacters(db, config, connection.id);

    expect(result.status).toBe('success');
    const rows = await db.select().from(character);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Thrallmar');
  });

  it('updates an existing character in place rather than duplicating it', async () => {
    const db = createTestDb();
    const connection = await insertConnection(db);
    vi.mocked(fetchFullCharacterRoster).mockResolvedValue([
      {
        battlenetCharacterId: 'char-1',
        name: 'Thrallmar',
        realmSlug: 'area-52',
        realmName: 'Area 52',
        faction: 'Horde',
        class: 'Warrior',
        race: 'Orc',
        level: 79,
        itemLevel: 480,
        activeSpec: 'Protection',
        imageUrl: null,
        professions: [],
      },
    ]);
    await syncCharacters(db, config, connection.id);

    vi.mocked(fetchFullCharacterRoster).mockResolvedValue([
      {
        battlenetCharacterId: 'char-1',
        name: 'Thrallmar',
        realmSlug: 'area-52',
        realmName: 'Area 52',
        faction: 'Horde',
        class: 'Warrior',
        race: 'Orc',
        level: 80,
        itemLevel: 489,
        activeSpec: 'Protection',
        imageUrl: null,
        professions: [],
      },
    ]);
    await syncCharacters(db, config, connection.id);

    const rows = await db.select().from(character);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.level).toBe(80);
    expect(rows[0]?.itemLevel).toBe(489);
  });

  it('persists imageUrl, and null when Blizzard has no media for the character', async () => {
    const db = createTestDb();
    const connection = await insertConnection(db);
    vi.mocked(fetchFullCharacterRoster).mockResolvedValue([
      {
        battlenetCharacterId: 'char-1',
        name: 'Thrallmar',
        realmSlug: 'area-52',
        realmName: 'Area 52',
        faction: 'Horde',
        class: 'Warrior',
        race: 'Orc',
        level: 80,
        itemLevel: 489,
        activeSpec: 'Protection',
        imageUrl: 'https://render.example.com/thrallmar.jpg',
        professions: [],
      },
      {
        battlenetCharacterId: 'char-2',
        name: 'NoImage',
        realmSlug: 'area-52',
        realmName: 'Area 52',
        faction: 'Horde',
        class: 'Mage',
        race: 'Undead',
        level: 10,
        itemLevel: 0,
        activeSpec: 'Unknown',
        imageUrl: null,
        professions: [],
      },
    ]);

    await syncCharacters(db, config, connection.id);

    const rows = await db.select().from(character);
    const withImage = rows.find((r) => r.battlenetCharacterId === 'char-1');
    const withoutImage = rows.find((r) => r.battlenetCharacterId === 'char-2');
    expect(withImage?.imageUrl).toBe('https://render.example.com/thrallmar.jpg');
    expect(withoutImage?.imageUrl).toBeNull();
  });

  it('flags a character absent from the latest fetch as removed', async () => {
    const db = createTestDb();
    const connection = await insertConnection(db);
    vi.mocked(fetchFullCharacterRoster).mockResolvedValue([
      {
        battlenetCharacterId: 'char-1',
        name: 'Thrallmar',
        realmSlug: 'area-52',
        realmName: 'Area 52',
        faction: 'Horde',
        class: 'Warrior',
        race: 'Orc',
        level: 80,
        itemLevel: 489,
        activeSpec: 'Protection',
        imageUrl: null,
        professions: [],
      },
    ]);
    await syncCharacters(db, config, connection.id);

    vi.mocked(fetchFullCharacterRoster).mockResolvedValue([]);
    await syncCharacters(db, config, connection.id);

    const rows = await db.select().from(character);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.isRemoved).toBe(true);
  });

  it('fails clearly (rather than crashing) when the access token has expired', async () => {
    const db = createTestDb();
    const connection = await insertConnection(db, { tokenExpiresAt: new Date(Date.now() - 1000) });

    const result = await syncCharacters(db, config, connection.id);

    expect(result.status).toBe('failure');
    expect(result.error).toContain('reconnect');
    expect(fetchFullCharacterRoster).not.toHaveBeenCalled();
    const [updated] = await db
      .select()
      .from(battleNetConnection)
      .where(eq(battleNetConnection.id, connection.id));
    expect(updated?.lastSyncStatus).toBe('failure');
  });

  it('records a failure status and preserves the previous lastSyncedAt when the fetch throws', async () => {
    const db = createTestDb();
    const previousSync = new Date('2026-01-01T00:00:00Z');
    const connection = await insertConnection(db, {
      lastSyncStatus: 'success',
      lastSyncedAt: previousSync,
    });
    vi.mocked(fetchFullCharacterRoster).mockRejectedValue(new Error('Blizzard API unavailable'));

    const result = await syncCharacters(db, config, connection.id);

    expect(result.status).toBe('failure');
    expect(result.error).toContain('Blizzard API unavailable');
    const [updated] = await db
      .select()
      .from(battleNetConnection)
      .where(eq(battleNetConnection.id, connection.id));
    expect(updated?.lastSyncStatus).toBe('failure');
    expect(updated?.lastSyncedAt?.toISOString()).toBe(previousSync.toISOString());
  });
});
