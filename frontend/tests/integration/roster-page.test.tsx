import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

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

describe('RosterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a connect action when no account is connected', async () => {
    vi.mocked(apiClient.getConnection).mockResolvedValue({ connected: false });
    vi.mocked(apiClient.getCharacters).mockResolvedValue({ characters: [] });

    renderWithRouter(<RosterPage />);

    expect(await screen.findByRole('link', { name: /connect/i })).toHaveAttribute(
      'href',
      '/api/connection/authorize',
    );
  });

  it('renders the roster and a disconnect action when connected with characters', async () => {
    vi.mocked(apiClient.getConnection).mockResolvedValue({
      connected: true,
      region: 'us',
      lastSyncStatus: 'success',
      lastSyncedAt: '2026-07-30T12:00:00Z',
    });
    vi.mocked(apiClient.getCharacters).mockResolvedValue({
      characters: [
        {
          id: 1,
          name: 'Thrallmar',
          realmName: 'Area 52',
          faction: 'Horde',
          class: 'Warrior',
          race: 'Orc',
          level: 80,
          itemLevel: 489,
          activeSpec: 'Protection',
          professions: [{ name: 'Blacksmithing', skillLevel: 100 }],
          isRemoved: false,
          updatedAt: '2026-07-30T12:00:00Z',
        },
      ],
    });

    renderWithRouter(<RosterPage />);

    expect(await screen.findByText('Thrallmar')).toBeInTheDocument();
    expect(screen.getByText('Warrior')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  it('shows an explicit empty state when connected but no characters exist', async () => {
    vi.mocked(apiClient.getConnection).mockResolvedValue({ connected: true, region: 'us' });
    vi.mocked(apiClient.getCharacters).mockResolvedValue({ characters: [] });

    renderWithRouter(<RosterPage />);

    expect(await screen.findByText(/no characters/i)).toBeInTheDocument();
  });

  it('disconnects and returns to the not-connected state when disconnect is clicked', async () => {
    vi.mocked(apiClient.getConnection)
      .mockResolvedValueOnce({ connected: true, region: 'us' })
      .mockResolvedValue({ connected: false });
    vi.mocked(apiClient.getCharacters).mockResolvedValue({ characters: [] });
    vi.mocked(apiClient.disconnect).mockResolvedValue(undefined);

    renderWithRouter(<RosterPage />);

    const disconnectButton = await screen.findByRole('button', { name: /disconnect/i });
    await userEvent.click(disconnectButton);

    await waitFor(() => expect(apiClient.disconnect).toHaveBeenCalled());
    expect(await screen.findByRole('link', { name: /connect/i })).toBeInTheDocument();
  });
});
