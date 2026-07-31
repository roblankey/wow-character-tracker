import type { ConnectionStatus as ConnectionStatusDto } from '../api/client.js';
import { apiClient } from '../api/client.js';
import { BattleNetIcon } from './BattleNetIcon.js';
import { RefreshButton } from './RefreshButton.js';

export interface ConnectionStatusProps {
  status: ConnectionStatusDto;
  onDisconnect: () => void;
  disconnecting: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

export function ConnectionStatus({
  status,
  onDisconnect,
  disconnecting,
  onRefresh,
  refreshing,
}: ConnectionStatusProps) {
  if (!status.connected) {
    return (
      <a
        href={apiClient.authorizeUrl}
        className="battlenet-login-button"
        aria-label="Log in with Battle.net"
      >
        <BattleNetIcon />
        Log In
      </a>
    );
  }

  return (
    <div className="account-area">
      <span className="account-info">
        Connected as {status.battletag} ({status.region}
        {status.lastSyncedAt
          ? ` · last synced ${new Date(status.lastSyncedAt).toLocaleString()}`
          : ''}
        )
      </span>
      <RefreshButton onRefresh={onRefresh} refreshing={refreshing} />
      <button
        type="button"
        className="disconnect-link"
        onClick={onDisconnect}
        disabled={disconnecting}
      >
        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
      </button>
    </div>
  );
}
