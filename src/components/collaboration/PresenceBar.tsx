import React from 'react';
import { Wifi, WifiOff, Users } from 'lucide-react';
import { ConnectionStatus, RemoteUser } from '../../utils/syncClient';

interface Props {
  users: RemoteUser[];
  connectionStatus: ConnectionStatus;
  currentClientId: string;
  roomCode: string;
}

export const PresenceBar: React.FC<Props> = ({ users, connectionStatus, currentClientId, roomCode }) => {
  const statusColors: Record<ConnectionStatus, string> = {
    connected: '#22c55e',
    connecting: '#f59e0b',
    reconnecting: '#f59e0b',
    disconnected: '#ef4444',
  };

  const statusLabels: Record<ConnectionStatus, string> = {
    connected: 'Connected',
    connecting: 'Connecting...',
    reconnecting: 'Reconnecting...',
    disconnected: 'Offline',
  };

  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
      {/* Room Code Badge */}
      {roomCode && connectionStatus === 'connected' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 backdrop-blur">
          <Users className="w-3 h-3 text-slate-400" />
          <span className="text-[11px] font-mono text-slate-300">{roomCode}</span>
        </div>
      )}

      {/* User Avatars */}
      <div className="flex -space-x-2">
        {users.map(user => {
          const isYou = user.clientId === currentClientId;
          return (
            <div
              key={user.clientId}
              className="relative group"
              title={isYou ? 'You' : user.name}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900 transition-transform hover:scale-110 hover:z-10"
                style={{ backgroundColor: user.color }}
              >
                {user.name[0]?.toUpperCase() || '?'}
              </div>
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {isYou ? 'You' : user.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connection Status */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 backdrop-blur cursor-default"
        title={statusLabels[connectionStatus]}
      >
        {connectionStatus === 'connected' ? (
          <Wifi className="w-3.5 h-3.5 text-green-400" />
        ) : connectionStatus === 'disconnected' ? (
          <WifiOff className="w-3.5 h-3.5 text-red-400" />
        ) : (
          <Wifi className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
        )}
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColors[connectionStatus] }}
        />
      </div>
    </div>
  );
};
