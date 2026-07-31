import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../src/battlenet/oauth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/battlenet/oauth.js')>();
  return {
    ...actual,
    exchangeCodeForTokens: vi.fn(),
    fetchUserInfo: vi.fn(),
  };
});

vi.mock('../../src/battlenet/client.js', () => ({
  fetchFullCharacterRoster: vi.fn(),
}));

import { fetchFullCharacterRoster } from '../../src/battlenet/client.js';
import { battleNetConnection } from '../../src/db/schema.js';
import { encryptSecret } from '../../src/db/crypto.js';
import { buildTestApp, createTestConfig } from '../helpers/testApp.js';

const testConfig = createTestConfig();
const encryptedAccess = encryptSecret('access-token', testConfig.tokenEncryptionKey);

describe('POST /api/characters/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 409 when no account is connected', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({ method: 'POST', url: '/api/characters/refresh' });

    expect(response.statusCode).toBe(409);
  });

  it('returns success status and updates lastSyncedAt on success', async () => {
    const { app, db } = buildTestApp();
    await db.insert(battleNetConnection).values({
      battlenetAccountId: 'acct-1',
      region: 'us',
      accessToken: encryptedAccess,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      connectedAt: new Date(),
      lastSyncStatus: 'never_run',
    });
    vi.mocked(fetchFullCharacterRoster).mockResolvedValue([]);

    const response = await app.inject({ method: 'POST', url: '/api/characters/refresh' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { lastSyncStatus: string; lastSyncedAt: string | null };
    expect(body.lastSyncStatus).toBe('success');
    expect(body.lastSyncedAt).not.toBeNull();
  });

  it('returns a failure status with the error and keeps prior data on Blizzard API failure', async () => {
    const { app, db } = buildTestApp();
    await db.insert(battleNetConnection).values({
      battlenetAccountId: 'acct-1',
      region: 'us',
      accessToken: encryptedAccess,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      connectedAt: new Date(),
      lastSyncStatus: 'success',
      lastSyncedAt: new Date('2026-01-01T00:00:00Z'),
    });
    vi.mocked(fetchFullCharacterRoster).mockRejectedValue(new Error('Blizzard API unavailable'));

    const response = await app.inject({ method: 'POST', url: '/api/characters/refresh' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      lastSyncStatus: string;
      lastSyncError: string | null;
      lastSyncedAt: string | null;
    };
    expect(body.lastSyncStatus).toBe('failure');
    expect(body.lastSyncError).toContain('Blizzard API unavailable');
    // the previous successful sync timestamp must be preserved, not cleared
    expect(body.lastSyncedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
