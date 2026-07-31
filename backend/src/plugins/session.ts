import { randomUUID } from 'node:crypto';
import fastifyCookie from '@fastify/cookie';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';

export const SESSION_COOKIE_NAME = 'wowster_session';

/** ~400 days: the practical maximum browsers honor for a cookie's Max-Age. */
const SESSION_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export interface SessionPluginOptions {
  config: Config;
}

/**
 * Assigns every request a signed, long-lived session id (via cookie), so
 * each browser session (e.g. a separate incognito window) can own its own
 * BattleNetConnection independently of any other session. No Domain
 * attribute is set, so the cookie is host-only — scoped to whichever origin
 * the browser actually used (see research.md's "Session cookie scope across
 * the OAuth detour" for why the OAuth callback deliberately does not rely on
 * this cookie for attribution).
 *
 * Wrapped with `fastify-plugin` so the hook/decoration apply globally
 * (not just within this plugin's own encapsulated scope) — every route
 * registered afterward, including sibling registrations, needs
 * `request.sessionId`.
 */
async function sessionPlugin(app: FastifyInstance, opts: SessionPluginOptions): Promise<void> {
  const { config } = opts;

  await app.register(fastifyCookie, {
    secret: config.sessionCookieSecret,
    hook: 'onRequest',
  });

  app.decorateRequest('sessionId', '');

  app.addHook('onRequest', async (request, reply) => {
    const raw = request.cookies[SESSION_COOKIE_NAME];
    const unsigned = raw ? request.unsignCookie(raw) : undefined;

    if (unsigned?.valid && unsigned.value) {
      request.sessionId = unsigned.value;
      return;
    }

    const sessionId = randomUUID();
    request.sessionId = sessionId;
    reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    });
  });
}

export default fp(sessionPlugin, { name: 'session-plugin' });
