import { sign } from '@fastify/cookie';
import { SESSION_COOKIE_NAME } from '../../src/plugins/session.js';
import type { Config } from '../../src/config.js';

/**
 * Builds a `Cookie` header value that authenticates an `app.inject()` call
 * as the given session id — for tests that need a request to be recognized
 * as the same session a fixture row (or an earlier request) was created
 * under.
 */
export function sessionCookieHeader(sessionId: string, config: Config): string {
  return `${SESSION_COOKIE_NAME}=${sign(sessionId, config.sessionCookieSecret)}`;
}
