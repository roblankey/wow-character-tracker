import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { battleNetConnection } from '../db/schema.js';
import { encryptSecret } from '../db/crypto.js';
import { buildAuthorizeUrl, exchangeCodeForTokens, fetchUserInfo } from '../battlenet/oauth.js';
import { syncCharacters } from '../services/sync.js';

const STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map<string, number>();

function issueState(): string {
  const state = randomUUID();
  pendingStates.set(state, Date.now() + STATE_TTL_MS);
  return state;
}

function consumeState(state: string | undefined): boolean {
  if (!state) return false;
  const expiresAt = pendingStates.get(state);
  pendingStates.delete(state);
  return expiresAt !== undefined && expiresAt >= Date.now();
}

export async function connectionRoutes(app: FastifyInstance): Promise<void> {
  const { db, config } = app.appContext;

  app.get('/connection', async () => {
    const [connection] = await db.select().from(battleNetConnection).limit(1);
    if (!connection) {
      return { connected: false };
    }
    return {
      connected: true,
      region: connection.region,
      connectedAt: connection.connectedAt.toISOString(),
      lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
      lastSyncStatus: connection.lastSyncStatus,
      lastSyncError: connection.lastSyncError ?? null,
    };
  });

  app.get('/connection/authorize', async (_request, reply) => {
    const state = issueState();
    reply.redirect(buildAuthorizeUrl(config, state));
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/connection/callback',
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error || !code || !consumeState(state)) {
        reply.redirect(`${config.frontendUrl}/?connectionError=1`);
        return;
      }

      try {
        const tokens = await exchangeCodeForTokens(config, code);
        const userInfo = await fetchUserInfo(config, tokens.accessToken);

        // FR-010: only one connection at a time — replace any existing one
        // (cascade-deletes its characters) rather than creating a duplicate.
        await db.delete(battleNetConnection);

        const [connection] = await db
          .insert(battleNetConnection)
          .values({
            battlenetAccountId: userInfo.id,
            region: config.battlenet.region,
            accessToken: encryptSecret(tokens.accessToken, config.tokenEncryptionKey),
            tokenExpiresAt: tokens.expiresAt,
            connectedAt: new Date(),
            lastSyncStatus: 'never_run',
          })
          .returning();

        if (connection) {
          await syncCharacters(db, config, connection.id);
        }

        reply.redirect(config.frontendUrl);
      } catch (err) {
        app.log.error(err);
        reply.redirect(`${config.frontendUrl}/?connectionError=1`);
      }
    },
  );

  app.delete('/connection', async (_request, reply) => {
    await db.delete(battleNetConnection);
    reply.status(204).send();
  });
}
