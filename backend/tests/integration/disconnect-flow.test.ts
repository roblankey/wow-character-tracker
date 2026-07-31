import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { battleNetConnection, character } from '../../src/db/schema.js';
import { buildTestApp } from '../helpers/testApp.js';

let tempDir: string;
let dbPath: string;
let currentDb: ReturnType<typeof buildTestApp>['db'] | undefined;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'wow-tracker-test-'));
  dbPath = join(tempDir, 'test.sqlite');
});

afterEach(() => {
  currentDb?.$client.close();
  currentDb = undefined;
  rmSync(tempDir, { recursive: true, force: true });
});

describe('disconnect flow (real temp SQLite file)', () => {
  it('cascade-deletes Character rows when the connection is deleted', async () => {
    const { app, db } = buildTestApp(dbPath);
    currentDb = db;
    const [connection] = await db
      .insert(battleNetConnection)
      .values({
        battlenetAccountId: 'acct-1',
        region: 'us',
        accessToken: 'enc-access',
        refreshToken: 'enc-refresh',
        tokenExpiresAt: new Date(),
        connectedAt: new Date(),
        lastSyncStatus: 'success',
      })
      .returning();

    await db.insert(character).values([
      {
        connectionId: connection!.id,
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
        professions: '[]',
        updatedAt: new Date(),
      },
      {
        connectionId: connection!.id,
        battlenetCharacterId: 'char-2',
        name: 'Secondtoon',
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

    expect(await db.select().from(character)).toHaveLength(2);

    const response = await app.inject({ method: 'DELETE', url: '/api/connection' });

    expect(response.statusCode).toBe(204);
    expect(await db.select().from(battleNetConnection)).toHaveLength(0);
    expect(await db.select().from(character)).toHaveLength(0);
  });
});
