import { useCallback, useEffect, useState } from 'react';
import {
  apiClient,
  type CharacterDto,
  type ConnectionStatus as ConnectionStatusDto,
} from '../api/client.js';
import { ConnectionStatus } from '../components/ConnectionStatus.js';
import { RosterTable } from '../components/RosterTable.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { RosterLogo } from '../components/RosterLogo.js';
import { CharacterDetailPanel } from '../components/CharacterDetailPanel.js';

export function RosterPage() {
  const [status, setStatus] = useState<ConnectionStatusDto | null>(null);
  const [characters, setCharacters] = useState<CharacterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [connectionStatus, roster] = await Promise.all([
        apiClient.getConnection(),
        apiClient.getCharacters(),
      ]);
      setStatus(connectionStatus);
      setCharacters(roster.characters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roster.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // One-time async fetch on mount; setState happens after the awaited
    // response, not synchronously in the effect body, so this doesn't cause
    // cascading renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiClient.disconnect();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await apiClient.refreshCharacters();
      // Reload connection + roster: a Blizzard-side failure is reflected in
      // the connection's lastSyncStatus/lastSyncError (surfaced below)
      // without ever clearing the roster below.
      await load();
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Failed to refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectCharacter = (selected: CharacterDto) => {
    setSelectedCharacterId((current) => (current === selected.id ? null : selected.id));
  };

  const header = (
    <header className="site-header">
      <h1 className="site-title">
        <RosterLogo />
      </h1>
      {status ? (
        <ConnectionStatus
          status={status}
          onDisconnect={handleDisconnect}
          disconnecting={disconnecting}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      ) : null}
    </header>
  );

  if (loading) {
    return (
      <section>
        {header}
        <p>Loading…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        {header}
        <ErrorBanner message={error} />
      </section>
    );
  }

  // Characters with no item level have no usable profile data yet from
  // Blizzard (see the fallback in the backend's battlenet client) — hide
  // them rather than showing empty rows.
  const visibleCharacters = characters.filter((c) => c.itemLevel > 0);
  const selectedCharacter = visibleCharacters.find((c) => c.id === selectedCharacterId) ?? null;

  return (
    <section>
      {header}
      {status?.connected ? (
        <>
          {status.lastSyncStatus === 'failure' && status.lastSyncError ? (
            <ErrorBanner message={`Last refresh failed: ${status.lastSyncError}`} />
          ) : null}
          {refreshError ? <ErrorBanner message={refreshError} /> : null}
          {visibleCharacters.length > 0 ? (
            <RosterTable characters={visibleCharacters} onSelectCharacter={handleSelectCharacter} />
          ) : (
            <p>No characters found on this account.</p>
          )}
        </>
      ) : (
        <p>No Battle.net account connected.</p>
      )}
      {selectedCharacter ? (
        <CharacterDetailPanel
          character={selectedCharacter}
          onClose={() => setSelectedCharacterId(null)}
        />
      ) : null}
    </section>
  );
}
