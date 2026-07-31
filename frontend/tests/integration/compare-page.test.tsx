import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

import { apiClient, type CharacterDto } from '../../src/api/client.js';
import { ComparePage } from '../../src/pages/ComparePage.js';

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
    isRemoved: false,
    updatedAt: '2026-07-30T12:00:00Z',
    ...overrides,
  };
}

describe('ComparePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a "need at least two" message when the roster has only one character', async () => {
    vi.mocked(apiClient.getCharacters).mockResolvedValue({
      characters: [makeCharacter({ id: 1 })],
    });

    renderWithRouter(<ComparePage />);

    expect(await screen.findByText(/need at least two characters/i)).toBeInTheDocument();
  });

  it('highlights differing attributes once two characters are selected', async () => {
    vi.mocked(apiClient.getCharacters).mockResolvedValue({
      characters: [
        makeCharacter({ id: 1, name: 'Thrallmar', level: 80 }),
        makeCharacter({ id: 2, name: 'Secondtoon', level: 75 }),
      ],
    });

    renderWithRouter(<ComparePage />);

    await userEvent.click(await screen.findByLabelText('Thrallmar'));
    await userEvent.click(await screen.findByLabelText('Secondtoon'));

    const levelRow = (await screen.findByText('Level')).closest('tr');
    expect(levelRow).not.toBeNull();
    expect(levelRow).toHaveAttribute('data-differs', 'true');
  });

  it('shows a "no differences" message when selected characters are identical', async () => {
    vi.mocked(apiClient.getCharacters).mockResolvedValue({
      characters: [
        makeCharacter({ id: 1, name: 'Thrallmar' }),
        makeCharacter({ id: 2, name: 'Clone' }),
      ],
    });

    renderWithRouter(<ComparePage />);

    await userEvent.click(await screen.findByLabelText('Thrallmar'));
    await userEvent.click(await screen.findByLabelText('Clone'));

    expect(
      await screen.findByText(/no differences between the selected characters/i),
    ).toBeInTheDocument();
  });
});
