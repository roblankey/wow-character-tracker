import { describe, expect, it } from 'vitest';
import { battleNetConnection, character } from '../../src/db/schema.js';
import { buildTestApp } from '../helpers/testApp.js';

describe('DELETE /api/connection', () => {
  it('deletes the connection and cascade-deletes its characters', async () => {
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
      name: 'Toon',
      realmSlug: 'area-52',
      realmName: 'Area 52',
      faction: 'Horde',
      class: 'Warrior',
      race: 'Orc',
      level: 80,
      itemLevel: 400,
      activeSpec: 'Fury',
      professions: '[]',
      updatedAt: new Date(),
    });

    const response = await app.inject({ method: 'DELETE', url: '/api/connection' });

    expect(response.statusCode).toBe(204);
    expect(await db.select().from(battleNetConnection)).toHaveLength(0);
    expect(await db.select().from(character)).toHaveLength(0);
  });

  it('is a no-op when no connection exists', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({ method: 'DELETE', url: '/api/connection' });

    expect(response.statusCode).toBe(204);
  });
});
