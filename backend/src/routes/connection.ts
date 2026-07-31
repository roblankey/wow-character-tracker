import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { battleNetConnection } from '../db/schema.js';
import { encryptSecret } from '../db/crypto.js';
import { buildAuthorizeUrl, exchangeCodeForTokens, fetchUserInfo } from '../battlenet/oauth.js';
import { syncCharacters } from '../services/sync.js';

const STATE_TTL_MS = 10 * 60 * 1000;

interface PendingState {
  expiresAt: number;
  /** The browser session that initiated this authorize attempt. */
  sessionId: string;
}

const pendingStates = new Map<string, PendingState>();

function issueState(sessionId: string): string {
  const state = randomUUID();
  pendingStates.set(state, { expiresAt: Date.now() + STATE_TTL_MS, sessionId });
  return state;
}

/**
 * Resolves and consumes a `state` value, returning the session id that
 * initiated it. Deliberately does not consult the callback request's own
 * cookie — Blizzard redirects the browser directly to this endpoint,
 * bypassing the frontend dev proxy the session cookie was originally set
 * through, so the request's cookie can't be trusted here (see research.md's
 * "Session cookie scope across the OAuth detour").
 */
function consumeState(state: string | undefined): string | undefined {
  if (!state) return undefined;
  const entry = pendingStates.get(state);
  pendingStates.delete(state);
  if (!entry || entry.expiresAt < Date.now()) return undefined;
  return entry.sessionId;
}

export async function connectionRoutes(app: FastifyInstance): Promise<void> {
  const { db, config } = app.appContext;

  app.get('/connection', async (request) => {
    const [connection] = await db
      .select()
      .from(battleNetConnection)
      .where(eq(battleNetConnection.sessionId, request.sessionId));
    if (!connection) {
      return { connected: false };
    }
    return {
      connected: true,
      battletag: connection.battletag,
      region: connection.region,
      connectedAt: connection.connectedAt.toISOString(),
      lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
      lastSyncStatus: connection.lastSyncStatus,
      lastSyncError: connection.lastSyncError ?? null,
    };
  });

  app.get('/connection/authorize', async (request, reply) => {
    const state = issueState(request.sessionId);
    reply.redirect(buildAuthorizeUrl(config, state));
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/connection/callback',
    async (request, reply) => {
      const { code, state, error } = request.query;
      const sessionId = consumeState(state);

      if (error || !code || !sessionId) {
        reply.redirect(`${config.frontendUrl}/?connectionError=1`);
        return;
      }

      try {
        const tokens = await exchangeCodeForTokens(config, code);
        const userInfo = await fetchUserInfo(config, tokens.accessToken);

        // FR-005: at most one connection per session — replace this
        // session's existing row (cascade-deletes its characters) rather
        // than creating a duplicate. Other sessions' rows are untouched.
        await db.delete(battleNetConnection).where(eq(battleNetConnection.sessionId, sessionId));

        const [connection] = await db
          .insert(battleNetConnection)
          .values({
            sessionId,
            battlenetAccountId: userInfo.id,
            battletag: userInfo.battletag,
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

  app.delete('/connection', async (request, reply) => {
    await db
      .delete(battleNetConnection)
      .where(eq(battleNetConnection.sessionId, request.sessionId));
    reply.status(204).send();
  });
}
