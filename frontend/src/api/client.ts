export interface ConnectionStatus {
  connected: boolean;
  region?: string;
  connectedAt?: string;
  lastSyncedAt?: string | null;
  lastSyncStatus?: 'success' | 'failure' | 'never_run';
  lastSyncError?: string | null;
}

export interface Profession {
  name: string;
  skillLevel: number;
}

export interface CharacterDto {
  id: number;
  name: string;
  realmName: string;
  faction: 'Alliance' | 'Horde';
  class: string;
  race: string;
  level: number;
  itemLevel: number;
  activeSpec: string;
  professions: Profession[];
  imageUrl: string | null;
  isRemoved: boolean;
  updatedAt: string;
}

export interface RefreshResult {
  lastSyncedAt: string | null;
  lastSyncStatus: 'success' | 'failure' | 'never_run';
  lastSyncError?: string | null;
}

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    // Only set Content-Type when there's an actual body — Fastify's JSON
    // body parser rejects a JSON content-type on an empty body, which
    // DELETE/refresh requests always have.
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(body.error ?? `Request to ${path} failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  getConnection: (): Promise<ConnectionStatus> => request('/connection'),
  authorizeUrl: '/api/connection/authorize',
  disconnect: (): Promise<void> => request('/connection', { method: 'DELETE' }),
  getCharacters: (): Promise<{ characters: CharacterDto[] }> => request('/characters'),
  refreshCharacters: (): Promise<RefreshResult> =>
    request('/characters/refresh', { method: 'POST' }),
};
