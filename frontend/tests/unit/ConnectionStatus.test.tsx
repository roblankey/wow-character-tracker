import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../../src/components/ConnectionStatus.js';
import type { ConnectionStatus as ConnectionStatusDto } from '../../src/api/client.js';

function makeConnectedStatus(overrides: Partial<ConnectionStatusDto> = {}): ConnectionStatusDto {
  return {
    connected: true,
    battletag: 'Playername#1234',
    region: 'us',
    connectedAt: '2026-07-30T12:00:00Z',
    lastSyncedAt: '2026-07-30T12:05:00Z',
    lastSyncStatus: 'success',
    lastSyncError: null,
    ...overrides,
  };
}

describe('ConnectionStatus', () => {
  it('renders "Connected as {battletag}" when connected', () => {
    render(
      <ConnectionStatus
        status={makeConnectedStatus()}
        onDisconnect={vi.fn()}
        disconnecting={false}
        onRefresh={vi.fn()}
        refreshing={false}
      />,
    );

    expect(screen.getByText(/Connected as Playername#1234/)).toBeInTheDocument();
  });

  it('does not render a battletag when disconnected', () => {
    render(
      <ConnectionStatus
        status={{ connected: false }}
        onDisconnect={vi.fn()}
        disconnecting={false}
        onRefresh={vi.fn()}
        refreshing={false}
      />,
    );

    expect(screen.queryByText(/Connected as/)).not.toBeInTheDocument();
  });
});
