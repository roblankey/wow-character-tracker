import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  apiClient,
  type CharacterDto,
  type ConnectionStatus as ConnectionStatusDto,
} from '../api/client.js';
import { ConnectionStatus } from '../components/ConnectionStatus.js';
import { RosterTable } from '../components/RosterTable.js';
import { RefreshButton } from '../components/RefreshButton.js';
import { ErrorBanner } from '../components/ErrorBanner.js';

export function RosterPage() {
  const [status, setStatus] = useState<ConnectionStatusDto | null>(null);
  const [characters, setCharacters] = useState<CharacterDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

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
      // the connection's lastSyncStatus/lastSyncError (surfaced by
      // ConnectionStatus) without ever clearing the roster below.
      await load();
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Failed to refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <section>
        <h1>Roster</h1>
        <p>Loading…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h1>Roster</h1>
        <ErrorBanner message={error} />
      </section>
    );
  }

  return (
    <section>
      <h1>Roster</h1>
      {status ? (
        <ConnectionStatus
          status={status}
          onDisconnect={handleDisconnect}
          disconnecting={disconnecting}
        />
      ) : null}
      {status?.connected ? (
        <>
          <RefreshButton onRefresh={handleRefresh} refreshing={refreshing} />
          {refreshError ? <ErrorBanner message={refreshError} /> : null}
          {characters.length > 0 ? (
            <>
              <RosterTable
                characters={characters}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
              {selectedIds.size >= 2 ? (
                <Link to={`/compare?ids=${[...selectedIds].join(',')}`}>
                  Compare selected ({selectedIds.size})
                </Link>
              ) : (
                <p>Select two or more characters to compare them.</p>
              )}
            </>
          ) : (
            <p>No characters found on this account.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
