export interface RefreshButtonProps {
  onRefresh: () => void;
  refreshing: boolean;
}

export function RefreshButton({ onRefresh, refreshing }: RefreshButtonProps) {
  return (
    <button type="button" onClick={onRefresh} disabled={refreshing}>
      {refreshing ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}
