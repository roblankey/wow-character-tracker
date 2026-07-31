import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient, type CharacterDto } from '../api/client.js';
import { ComparisonView } from '../components/ComparisonView.js';
import { ErrorBanner } from '../components/ErrorBanner.js';

function parseIdsParam(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => Number(part))
    .filter((id) => Number.isInteger(id));
}

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const [characters, setCharacters] = useState<CharacterDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    parseIdsParam(searchParams.get('ids')),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const roster = await apiClient.getCharacters();
      setCharacters(roster.characters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load characters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time async fetch on mount
    load();
  }, [load]);

  const toggleSelected = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    );
  };

  if (loading) {
    return (
      <section>
        <h1>Compare</h1>
        <p>Loading…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h1>Compare</h1>
        <ErrorBanner message={error} />
      </section>
    );
  }

  const selectedCharacters = characters.filter((c) => selectedIds.includes(c.id));

  return (
    <section>
      <h1>Compare</h1>
      {characters.length < 2 ? (
        <p>You need at least two characters in your roster to compare.</p>
      ) : (
        <>
          <fieldset>
            <legend>Select characters to compare</legend>
            {characters.map((c) => (
              <label key={c.id} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => toggleSelected(c.id)}
                />
                {c.name}
              </label>
            ))}
          </fieldset>
          {selectedCharacters.length < 2 ? (
            <p>Select at least two characters to see a comparison.</p>
          ) : (
            <ComparisonView characters={selectedCharacters} />
          )}
        </>
      )}
    </section>
  );
}
