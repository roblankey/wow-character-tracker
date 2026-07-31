import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';

vi.mock('../../src/api/client.js', () => ({
  apiClient: {
    getConnection: vi.fn(),
    authorizeUrl: '/api/connection/authorize',
    disconnect: vi.fn(),
    getCharacters: vi.fn(),
    refreshCharacters: vi.fn(),
  },
}));

import { apiClient } from '../../src/api/client.js';
import { RosterPage } from '../../src/pages/RosterPage.js';

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const existingCharacter = {
  id: 1,
  name: 'Thrallmar',
  realmName: 'Area 52',
  faction: 'Horde' as const,
  class: 'Warrior',
  race: 'Orc',
  level: 80,
  itemLevel: 489,
  activeSpec: 'Protection',
  professions: [{ name: 'Blacksmithing', skillLevel: 100 }],
  isRemoved: false,
  updatedAt: '2026-07-30T12:00:00Z',
};

describe('RosterPage refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the roster after a successful refresh', async () => {
    vi.mocked(apiClient.getConnection).mockResolvedValue({ connected: true, region: 'us' });
    vi.mocked(apiClient.getCharacters)
      .mockResolvedValueOnce({ characters: [existingCharacter] })
      .mockResolvedValue({
        characters: [{ ...existingCharacter, level: 81, itemLevel: 495 }],
      });
    vi.mocked(apiClient.refreshCharacters).mockResolvedValue({
      lastSyncedAt: '2026-07-30T13:00:00Z',
      lastSyncStatus: 'success',
    });

    renderWithRouter(<RosterPage />);

    const refreshButton = await screen.findByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    await waitFor(() => expect(apiClient.refreshCharacters).toHaveBeenCalled());
    expect(await screen.findByText('495')).toBeInTheDocument();
  });

  it('surfaces a failure banner without clearing the existing roster', async () => {
    vi.mocked(apiClient.getConnection)
      .mockResolvedValueOnce({ connected: true, region: 'us' })
      .mockResolvedValue({
        connected: true,
        region: 'us',
        lastSyncStatus: 'failure',
        lastSyncError: 'Blizzard API did not respond',
      });
    vi.mocked(apiClient.getCharacters).mockResolvedValue({ characters: [existingCharacter] });
    vi.mocked(apiClient.refreshCharacters).mockResolvedValue({
      lastSyncedAt: null,
      lastSyncStatus: 'failure',
      lastSyncError: 'Blizzard API did not respond',
    });

    renderWithRouter(<RosterPage />);

    const refreshButton = await screen.findByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    expect(await screen.findByText(/blizzard api did not respond/i)).toBeInTheDocument();
    // the previously loaded character must still be visible
    expect(screen.getByText('Thrallmar')).toBeInTheDocument();
  });
});
