import type { ConnectionStatus as ConnectionStatusDto } from '../api/client.js';
import { apiClient } from '../api/client.js';
import { ErrorBanner } from './ErrorBanner.js';

export interface ConnectionStatusProps {
  status: ConnectionStatusDto;
  onDisconnect: () => void;
  disconnecting: boolean;
}

export function ConnectionStatus({ status, onDisconnect, disconnecting }: ConnectionStatusProps) {
  if (!status.connected) {
    return (
      <div className="connection-status">
        <p>No Battle.net account connected.</p>
        <a href={apiClient.authorizeUrl}>Connect Battle.net account</a>
      </div>
    );
  }

  return (
    <div className="connection-status">
      <p>
        Connected ({status.region}
        {status.lastSyncedAt
          ? ` · last synced ${new Date(status.lastSyncedAt).toLocaleString()}`
          : ''}
        )
      </p>
      {status.lastSyncStatus === 'failure' && status.lastSyncError ? (
        <ErrorBanner message={`Last refresh failed: ${status.lastSyncError}`} />
      ) : null}
      <button type="button" onClick={onDisconnect} disabled={disconnecting}>
        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
      </button>
    </div>
  );
}
