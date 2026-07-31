import { describe, expect, it } from 'vitest';
import { battleNetConnection, character } from '../../src/db/schema.js';
import { buildTestApp } from '../helpers/testApp.js';

describe('GET /api/characters', () => {
  it('returns an empty roster when nothing is connected', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/characters' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ characters: [] });
  });

  it('returns characters with name, class, realm, and faction', async () => {
    const { app, db } = buildTestApp();
    const [connection] = await db
      .insert(battleNetConnection)
      .values({
        battlenetAccountId: 'acct-1',
        region: 'us',
        accessToken: 'enc-access',
        tokenExpiresAt: new Date(),
        connectedAt: new Date(),
        lastSyncStatus: 'success',
      })
      .returning();
    await db.insert(character).values({
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
      professions: JSON.stringify([{ name: 'Blacksmithing', skillLevel: 100 }]),
      updatedAt: new Date(),
    });

    const response = await app.inject({ method: 'GET', url: '/api/characters' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { characters: unknown[] };
    expect(body.characters).toHaveLength(1);
    expect(body.characters[0]).toMatchObject({
      name: 'Thrallmar',
      realmName: 'Area 52',
      faction: 'Horde',
      class: 'Warrior',
      professions: [{ name: 'Blacksmithing', skillLevel: 100 }],
    });
  });
});
