import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { battleNetConnection, character } from '../db/schema.js';
import { syncCharacters } from '../services/sync.js';

export async function charactersRoutes(app: FastifyInstance): Promise<void> {
  const { db, config } = app.appContext;

  app.get('/characters', async (request) => {
    const [connection] = await db
      .select()
      .from(battleNetConnection)
      .where(eq(battleNetConnection.sessionId, request.sessionId));
    if (!connection) {
      return { characters: [] };
    }

    const rows = await db
      .select()
      .from(character)
      .where(eq(character.connectionId, connection.id))
      .orderBy(desc(character.updatedAt));
    return {
      characters: rows.map((row) => ({
        id: row.id,
        name: row.name,
        realmName: row.realmName,
        faction: row.faction,
        class: row.class,
        race: row.race,
        level: row.level,
        itemLevel: row.itemLevel,
        activeSpec: row.activeSpec,
        professions: JSON.parse(row.professions) as { name: string; skillLevel: number }[],
        imageUrl: row.imageUrl,
        isRemoved: row.isRemoved,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  });

  app.post('/characters/refresh', async (request, reply) => {
    const [connection] = await db
      .select()
      .from(battleNetConnection)
      .where(eq(battleNetConnection.sessionId, request.sessionId));
    if (!connection) {
      reply.status(409).send({ error: 'No Battle.net account is connected' });
      return;
    }

    const result = await syncCharacters(db, config, connection.id);

    const [updated] = await db
      .select()
      .from(battleNetConnection)
      .where(eq(battleNetConnection.id, connection.id));

    return {
      lastSyncedAt: updated?.lastSyncedAt?.toISOString() ?? null,
      lastSyncStatus: result.status,
      lastSyncError: updated?.lastSyncError ?? null,
    };
  });
}
