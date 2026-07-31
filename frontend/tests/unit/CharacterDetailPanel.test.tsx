import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterDetailPanel } from '../../src/components/CharacterDetailPanel.js';
import type { CharacterDto } from '../../src/api/client.js';

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

describe('CharacterDetailPanel', () => {
  it('renders all tracked fields, including professions', () => {
    render(<CharacterDetailPanel character={makeCharacter()} onClose={vi.fn()} />);

    expect(screen.getByText('Thrallmar')).toBeInTheDocument();
    expect(screen.getByText('Warrior')).toBeInTheDocument();
    expect(screen.getByText('Orc')).toBeInTheDocument();
    expect(screen.getByText('Horde')).toBeInTheDocument();
    expect(screen.getByText('Area 52')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('489')).toBeInTheDocument();
    expect(screen.getByText('Protection')).toBeInTheDocument();
    expect(screen.getByText(/Blacksmithing/)).toBeInTheDocument();
  });

  it('shows the character image when imageUrl is present', () => {
    render(<CharacterDetailPanel character={makeCharacter()} onClose={vi.fn()} />);

    const img = screen.getByRole('img', { name: /thrallmar/i });
    expect(img).toHaveAttribute('src', 'https://render.example.com/thrallmar.jpg');
  });

  it('shows a placeholder immediately when imageUrl is null', () => {
    render(<CharacterDetailPanel character={makeCharacter({ imageUrl: null })} onClose={vi.fn()} />);

    expect(screen.queryByRole('img', { name: /thrallmar/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no image available/i)).toBeInTheDocument();
  });

  it('shows a placeholder when the image fails to load', () => {
    render(<CharacterDetailPanel character={makeCharacter()} onClose={vi.fn()} />);

    const img = screen.getByRole('img', { name: /thrallmar/i });
    fireEvent.error(img);

    expect(screen.queryByRole('img', { name: /thrallmar/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no image available/i)).toBeInTheDocument();
  });

  it('shows removed status for a character flagged as removed', () => {
    render(<CharacterDetailPanel character={makeCharacter({ isRemoved: true })} onClose={vi.fn()} />);

    expect(screen.getByText(/removed/i)).toBeInTheDocument();
  });

  it('calls onClose when the close control is clicked', async () => {
    const onClose = vi.fn();
    render(<CharacterDetailPanel character={makeCharacter()} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
