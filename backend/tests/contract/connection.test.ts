import { describe, expect, it } from 'vitest';
import { battleNetConnection } from '../../src/db/schema.js';
import { buildTestApp } from '../helpers/testApp.js';

describe('GET /api/connection', () => {
  it('returns connected: false when no connection exists', async () => {
    const { app } = buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/connection' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ connected: false });
  });

  it('returns connection details when a connection exists', async () => {
    const { app, db } = buildTestApp();
    const connectedAt = new Date('2026-01-01T00:00:00Z');
    await db.insert(battleNetConnection).values({
      battlenetAccountId: 'acct-1',
      region: 'us',
      accessToken: 'enc-access',
      tokenExpiresAt: new Date(),
      connectedAt,
      lastSyncStatus: 'success',
      lastSyncedAt: connectedAt,
    });

    const response = await app.inject({ method: 'GET', url: '/api/connection' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      connected: true,
      region: 'us',
      lastSyncStatus: 'success',
    });
  });
});
