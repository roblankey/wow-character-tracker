import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/battlenet/oauth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/battlenet/oauth.js')>();
  return {
    ...actual,
    exchangeCodeForTokens: vi.fn(),
    fetchUserInfo: vi.fn(),
  };
});

vi.mock('../../src/battlenet/client.js', () => ({
  fetchFullCharacterRoster: vi.fn(),
}));

import { fetchFullCharacterRoster } from '../../src/battlenet/client.js';
import { battleNetConnection, character } from '../../src/db/schema.js';
import { encryptSecret } from '../../src/db/crypto.js';
import { buildTestApp, createTestConfig } from '../helpers/testApp.js';
import { sessionCookieHeader } from '../helpers/session.js';

const testConfig = createTestConfig();
const encryptedAccess = encryptSecret('access-token', testConfig.tokenEncryptionKey);

let tempDir: string;
let dbPath: string;
let currentDb: ReturnType<typeof buildTestApp>['db'] | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  tempDir = mkdtempSync(join(tmpdir(), 'wow-tracker-test-'));
  dbPath = join(tempDir, 'test.sqlite');
});

afterEach(() => {
  currentDb?.$client.close();
  currentDb = undefined;
  rmSync(tempDir, { recursive: true, force: true });
});

describe('refresh flow (real temp SQLite file, stubbed Blizzard client)', () => {
  it('flags a character missing from the latest fetch as isRemoved instead of deleting it', async () => {
    const { app, db } = buildTestApp(dbPath);
    currentDb = db;

    const [connection] = await db
      .insert(battleNetConnection)
      .values({
        sessionId: 'session-1',
        battlenetAccountId: 'acct-1',
        battletag: 'Tester#1234',
        region: 'us',
        accessToken: encryptedAccess,
        tokenExpiresAt: new Date(Date.now() + 3600_000),
        connectedAt: new Date(),
        lastSyncStatus: 'success',
      })
      .returning();

    await db.insert(character).values([
      {
        connectionId: connection!.id,
        battlenetCharacterId: 'char-stays',
        name: 'Stays',
        realmSlug: 'area-52',
        realmName: 'Area 52',
        faction: 'Horde',
        class: 'Warrior',
        race: 'Orc',
        level: 80,
        itemLevel: 489,
        activeSpec: 'Protection',
        professions: '[]',
        updatedAt: new Date(),
      },
      {
        connectionId: connection!.id,
        battlenetCharacterId: 'char-gone',
        name: 'Gone',
        realmSlug: 'area-52',
        realmName: 'Area 52',
        faction: 'Horde',
        class: 'Mage',
        race: 'Undead',
        level: 75,
        itemLevel: 420,
        activeSpec: 'Frost',
        professions: '[]',
        updatedAt: new Date(),
      },
    ]);

    // Latest fetch only returns "Stays" — "Gone" was deleted/transferred off the account.
    vi.mocked(fetchFullCharacterRoster).mockResolvedValue([
      {
        battlenetCharacterId: 'char-stays',
        name: 'Stays',
        realmSlug: 'area-52',
        realmName: 'Area 52',
        faction: 'Horde',
        class: 'Warrior',
        race: 'Orc',
        level: 80,
        itemLevel: 489,
        activeSpec: 'Protection',
        professions: [],
        imageUrl: null,
      },
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/characters/refresh',
      headers: { cookie: sessionCookieHeader('session-1', testConfig) },
    });
    expect(response.statusCode).toBe(200);

    const rows = await db.select().from(character);
    expect(rows).toHaveLength(2);
    const stays = rows.find((r) => r.battlenetCharacterId === 'char-stays');
    const gone = rows.find((r) => r.battlenetCharacterId === 'char-gone');
    expect(stays?.isRemoved).toBe(false);
    expect(gone?.isRemoved).toBe(true);
  });
});
