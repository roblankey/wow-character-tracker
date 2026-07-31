import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/api/client.js', () => ({
  apiClient: {
    getConnection: vi.fn(),
    authorizeUrl: '/api/connection/authorize',
    disconnect: vi.fn(),
    getCharacters: vi.fn(),
    refreshCharacters: vi.fn(),
  },
}));

import { apiClient, type CharacterDto } from '../../src/api/client.js';
import { RosterPage } from '../../src/pages/RosterPage.js';

function makeCharacter(overrides: Partial<CharacterDto> = {}): CharacterDto {
  return {
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
    imageUrl: 'https://render.example.com/thrallmar.jpg',
    isRemoved: false,
    updatedAt: '2026-07-30T12:00:00Z',
    ...overrides,
  };
}

describe('RosterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a connect action when no account is connected', async () => {
    vi.mocked(apiClient.getConnection).mockResolvedValue({ connected: false });
    vi.mocked(apiClient.getCharacters).mockResolvedValue({ characters: [] });

    render(<RosterPage />);

    expect(await screen.findByRole('link', { name: /log in/i })).toHaveAttribute(
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
      characters: [makeCharacter()],
    });

    render(<RosterPage />);

    expect(await screen.findByText('Thrallmar')).toBeInTheDocument();
    expect(screen.getByText('Warrior')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  it('shows an explicit empty state when connected but no characters exist', async () => {
    vi.mocked(apiClient.getConnection).mockResolvedValue({ connected: true, region: 'us' });
    vi.mocked(apiClient.getCharacters).mockResolvedValue({ characters: [] });

    render(<RosterPage />);

    expect(await screen.findByText(/no characters/i)).toBeInTheDocument();
  });

  it('disconnects and returns to the not-connected state when disconnect is clicked', async () => {
    vi.mocked(apiClient.getConnection)
      .mockResolvedValueOnce({ connected: true, region: 'us' })
      .mockResolvedValue({ connected: false });
    vi.mocked(apiClient.getCharacters).mockResolvedValue({ characters: [] });
    vi.mocked(apiClient.disconnect).mockResolvedValue(undefined);

    render(<RosterPage />);

    const disconnectButton = await screen.findByRole('button', { name: /disconnect/i });
    await userEvent.click(disconnectButton);

    await waitFor(() => expect(apiClient.disconnect).toHaveBeenCalled());
    expect(await screen.findByRole('link', { name: /log in/i })).toBeInTheDocument();
  });

  describe('character detail panel', () => {
    const charA = makeCharacter({ id: 1, name: 'Thrallmar' });
    const charB = makeCharacter({ id: 2, name: 'Jaina', class: 'Mage', race: 'Human' });

    beforeEach(() => {
      vi.mocked(apiClient.getConnection).mockResolvedValue({ connected: true, region: 'us' });
      vi.mocked(apiClient.getCharacters).mockResolvedValue({ characters: [charA, charB] });
    });

    it('opens the detail panel for the clicked character', async () => {
      render(<RosterPage />);

      await userEvent.click(await screen.findByRole('row', { name: 'Thrallmar' }));

      expect(await screen.findByRole('complementary', { name: /thrallmar/i })).toBeInTheDocument();
    });

    it('switches the detail panel to a different character when another row is clicked', async () => {
      render(<RosterPage />);

      await userEvent.click(await screen.findByRole('row', { name: 'Thrallmar' }));
      await screen.findByRole('complementary', { name: /thrallmar/i });

      await userEvent.click(screen.getByRole('row', { name: 'Jaina' }));

      expect(await screen.findByRole('complementary', { name: /jaina/i })).toBeInTheDocument();
      expect(screen.queryByRole('complementary', { name: /thrallmar/i })).not.toBeInTheDocument();
    });

    it('closes the detail panel when the same row is clicked again', async () => {
      render(<RosterPage />);

      const row = await screen.findByRole('row', { name: 'Thrallmar' });
      await userEvent.click(row);
      await screen.findByRole('complementary', { name: /thrallmar/i });

      await userEvent.click(row);

      expect(screen.queryByRole('complementary', { name: /thrallmar/i })).not.toBeInTheDocument();
    });

    it('closes the detail panel when the close control inside it is clicked', async () => {
      render(<RosterPage />);

      await userEvent.click(await screen.findByRole('row', { name: 'Thrallmar' }));
      const panel = await screen.findByRole('complementary', { name: /thrallmar/i });

      await userEvent.click(within(panel).getByRole('button', { name: /close/i }));

      expect(screen.queryByRole('complementary', { name: /thrallmar/i })).not.toBeInTheDocument();
    });
  });
});
