import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import sessionPlugin, { SESSION_COOKIE_NAME } from '../../src/plugins/session.js';
import { createTestConfig } from '../helpers/testApp.js';

function buildTestSessionApp() {
  const app = Fastify();
  const config = createTestConfig();
  app.register(sessionPlugin, { config });
  app.get('/whoami', async (request) => ({ sessionId: request.sessionId }));
  return { app, config };
}

describe('session plugin', () => {
  it('issues a fresh signed session cookie when none is present', async () => {
    const { app } = buildTestSessionApp();

    const response = await app.inject({ method: 'GET', url: '/whoami' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { sessionId: string };
    expect(body.sessionId).toMatch(/^[0-9a-f-]{36}$/);

    const setCookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    expect(setCookie).toBeDefined();
    expect(setCookie?.httpOnly).toBe(true);
    expect(setCookie?.sameSite).toBe('Lax');
    expect(setCookie?.path).toBe('/');
  });

  it('reuses a valid signed session cookie across requests instead of issuing a new one', async () => {
    const { app } = buildTestSessionApp();

    const first = await app.inject({ method: 'GET', url: '/whoami' });
    const issued = first.cookies.find((c) => c.name === SESSION_COOKIE_NAME)!;

    const second = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { cookie: `${issued.name}=${issued.value}` },
    });

    const firstBody = first.json() as { sessionId: string };
    const secondBody = second.json() as { sessionId: string };
    expect(secondBody.sessionId).toBe(firstBody.sessionId);
    expect(second.cookies.find((c) => c.name === SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it('issues a fresh session id (rather than trusting it) when the cookie signature is invalid', async () => {
    const { app } = buildTestSessionApp();

    const response = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { cookie: `${SESSION_COOKIE_NAME}=not-a-validly-signed-value` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { sessionId: string };
    expect(body.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)).toBeDefined();
  });

  it('rejects a session id signed with a different secret and issues a fresh one', async () => {
    const { app } = buildTestSessionApp();
    const otherApp = Fastify();
    const otherConfig = createTestConfig();
    otherConfig.sessionCookieSecret = 'a-completely-different-secret-of-32chars';
    otherApp.register(sessionPlugin, { config: otherConfig });
    otherApp.get('/whoami', async (request) => ({ sessionId: request.sessionId }));

    const foreign = await otherApp.inject({ method: 'GET', url: '/whoami' });
    const foreignCookie = foreign.cookies.find((c) => c.name === SESSION_COOKIE_NAME)!;

    const response = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { cookie: `${foreignCookie.name}=${foreignCookie.value}` },
    });

    const foreignBody = foreign.json() as { sessionId: string };
    const body = response.json() as { sessionId: string };
    expect(body.sessionId).not.toBe(foreignBody.sessionId);
    expect(response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)).toBeDefined();
  });
});
