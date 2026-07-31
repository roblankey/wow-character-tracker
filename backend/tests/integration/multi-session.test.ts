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
  fetchFullCharacterRoster: vi.fn(async () => []),
}));

import { exchangeCodeForTokens, fetchUserInfo } from '../../src/battlenet/oauth.js';
import { fetchFullCharacterRoster } from '../../src/battlenet/client.js';
import { buildTestApp } from '../helpers/testApp.js';
import { sessionCookieHeader } from '../helpers/session.js';

let tempDir: string;
let dbPath: string;
let currentDb: ReturnType<typeof buildTestApp>['db'] | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchFullCharacterRoster).mockResolvedValue([]);
  tempDir = mkdtempSync(join(tmpdir(), 'wow-tracker-test-'));
  dbPath = join(tempDir, 'test.sqlite');
});

afterEach(() => {
  currentDb?.$client.close();
  currentDb = undefined;
  rmSync(tempDir, { recursive: true, force: true });
});

type App = ReturnType<typeof buildTestApp>['app'];

async function connectAccount(
  app: App,
  cookie: string,
  account: { id: string; battletag: string; accessToken: string },
) {
  vi.mocked(exchangeCodeForTokens).mockResolvedValue({
    accessToken: account.accessToken,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  vi.mocked(fetchUserInfo).mockResolvedValue({ id: account.id, battletag: account.battletag });

  const authorizeResponse = await app.inject({
    method: 'GET',
    url: '/api/connection/authorize',
    headers: { cookie },
  });
  const state = new URL(
    authorizeResponse.headers.location as string,
    'http://localhost',
  ).searchParams.get('state');

  return app.inject({
    method: 'GET',
    url: `/api/connection/callback?code=code-${account.id}&state=${state}`,
    headers: { cookie },
  });
}

describe('multi-session isolation', () => {
  it('lets 3 sessions each connect a different account independently (SC-001, FR-001)', async () => {
    const { app, db, config } = buildTestApp(dbPath);
    currentDb = db;
    const cookieA = sessionCookieHeader('session-a', config);
    const cookieB = sessionCookieHeader('session-b', config);
    const cookieC = sessionCookieHeader('session-c', config);

    await connectAccount(app, cookieA, {
      id: 'acct-a',
      battletag: 'A#1111',
      accessToken: 'token-a',
    });
    await connectAccount(app, cookieB, {
      id: 'acct-b',
      battletag: 'B#2222',
      accessToken: 'token-b',
    });
    await connectAccount(app, cookieC, {
      id: 'acct-c',
      battletag: 'C#3333',
      accessToken: 'token-c',
    });

    const resA = await app.inject({
      method: 'GET',
      url: '/api/connection',
      headers: { cookie: cookieA },
    });
    const resB = await app.inject({
      method: 'GET',
      url: '/api/connection',
      headers: { cookie: cookieB },
    });
    const resC = await app.inject({
      method: 'GET',
      url: '/api/connection',
      headers: { cookie: cookieC },
    });

    expect(resA.json()).toMatchObject({ connected: true, battletag: 'A#1111' });
    expect(resB.json()).toMatchObject({ connected: true, battletag: 'B#2222' });
    expect(resC.json()).toMatchObject({ connected: true, battletag: 'C#3333' });
  });

  it('lets the same Battle.net account be connected in two different sessions without error (FR-006)', async () => {
    const { app, db, config } = buildTestApp(dbPath);
    currentDb = db;
    const cookieA = sessionCookieHeader('session-a', config);
    const cookieB = sessionCookieHeader('session-b', config);

    const resultA = await connectAccount(app, cookieA, {
      id: 'acct-shared',
      battletag: 'Shared#1111',
      accessToken: 'token-a',
    });
    const resultB = await connectAccount(app, cookieB, {
      id: 'acct-shared',
      battletag: 'Shared#1111',
      accessToken: 'token-b',
    });

    expect(resultA.statusCode).toBe(302);
    expect(resultA.headers.location).toBe('http://localhost:5173');
    expect(resultB.statusCode).toBe(302);
    expect(resultB.headers.location).toBe('http://localhost:5173');

    const resA = await app.inject({
      method: 'GET',
      url: '/api/connection',
      headers: { cookie: cookieA },
    });
    const resB = await app.inject({
      method: 'GET',
      url: '/api/connection',
      headers: { cookie: cookieB },
    });
    expect(resA.json()).toMatchObject({ connected: true, battletag: 'Shared#1111' });
    expect(resB.json()).toMatchObject({ connected: true, battletag: 'Shared#1111' });
  });

  it('attributes the OAuth callback to the session that initiated it, not whichever cookie the callback request carries (FR-004)', async () => {
    const { app, db, config } = buildTestApp(dbPath);
    currentDb = db;
    const cookieA = sessionCookieHeader('session-a', config);
    const cookieB = sessionCookieHeader('session-b', config);

    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      accessToken: 'token-a',
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(fetchUserInfo).mockResolvedValue({ id: 'acct-a', battletag: 'A#1111' });

    // Session A starts the authorize flow...
    const authorizeResponse = await app.inject({
      method: 'GET',
      url: '/api/connection/authorize',
      headers: { cookie: cookieA },
    });
    const state = new URL(
      authorizeResponse.headers.location as string,
      'http://localhost',
    ).searchParams.get('state');

    // ...but the callback request itself arrives carrying session B's
    // cookie (e.g. Blizzard's redirect lands on a different active browser
    // session than the one that clicked "Connect").
    await app.inject({
      method: 'GET',
      url: `/api/connection/callback?code=abc123&state=${state}`,
      headers: { cookie: cookieB },
    });

    const resA = await app.inject({
      method: 'GET',
      url: '/api/connection',
      headers: { cookie: cookieA },
    });
    const resB = await app.inject({
      method: 'GET',
      url: '/api/connection',
      headers: { cookie: cookieB },
    });

    expect(resA.json()).toMatchObject({ connected: true, battletag: 'A#1111' });
    expect(resB.json()).toEqual({ connected: false });
  });

  it('does not let refreshing or connecting one session affect another session (FR-002, FR-003, SC-002)', async () => {
    const { app, db, config } = buildTestApp(dbPath);
    currentDb = db;
    const cookieA = sessionCookieHeader('session-a', config);
    const cookieB = sessionCookieHeader('session-b', config);

    await connectAccount(app, cookieA, {
      id: 'acct-a',
      battletag: 'A#1111',
      accessToken: 'token-a',
    });

    const beforeB = await app.inject({
      method: 'GET',
      url: '/api/characters',
      headers: { cookie: cookieB },
    });
    expect(beforeB.json()).toEqual({ characters: [] });

    await connectAccount(app, cookieB, {
      id: 'acct-b',
      battletag: 'B#2222',
      accessToken: 'token-b',
    });

    const refreshA = await app.inject({
      method: 'POST',
      url: '/api/characters/refresh',
      headers: { cookie: cookieA },
    });
    expect(refreshA.statusCode).toBe(200);

    const afterB = await app.inject({
      method: 'GET',
      url: '/api/connection',
      headers: { cookie: cookieB },
    });
    expect(afterB.json()).toMatchObject({ connected: true, battletag: 'B#2222' });
  });

  it('disconnecting one session leaves another session untouched (FR-003)', async () => {
    const { app, db, config } = buildTestApp(dbPath);
    currentDb = db;
    const cookieA = sessionCookieHeader('session-a', config);
    const cookieB = sessionCookieHeader('session-b', config);

    await connectAccount(app, cookieA, {
      id: 'acct-a',
      battletag: 'A#1111',
      accessToken: 'token-a',
    });
    await connectAccount(app, cookieB, {
      id: 'acct-b',
      battletag: 'B#2222',
      accessToken: 'token-b',
    });

    const deleteA = await app.inject({
      method: 'DELETE',
      url: '/api/connection',
      headers: { cookie: cookieA },
    });
    expect(deleteA.statusCode).toBe(204);

    const resA = await app.inject({
      method: 'GET',
      url: '/api/connection',
      headers: { cookie: cookieA },
    });
    const resB = await app.inject({
      method: 'GET',
      url: '/api/connection',
      headers: { cookie: cookieB },
    });

    expect(resA.json()).toEqual({ connected: false });
    expect(resB.json()).toMatchObject({ connected: true, battletag: 'B#2222' });

    const charsB = await app.inject({
      method: 'GET',
      url: '/api/characters',
      headers: { cookie: cookieB },
    });
    expect(charsB.statusCode).toBe(200);
  });

  it('a brand-new session with no connection starts disconnected with an empty roster (SC-003)', async () => {
    const { app, db } = buildTestApp(dbPath);
    currentDb = db;

    const connectionResponse = await app.inject({ method: 'GET', url: '/api/connection' });
    const charactersResponse = await app.inject({ method: 'GET', url: '/api/characters' });
    const refreshResponse = await app.inject({ method: 'POST', url: '/api/characters/refresh' });

    expect(connectionResponse.json()).toEqual({ connected: false });
    expect(charactersResponse.json()).toEqual({ characters: [] });
    expect(refreshResponse.statusCode).toBe(409);
  });
});
