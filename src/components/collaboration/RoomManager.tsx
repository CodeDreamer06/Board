import React, { useState } from 'react';
import { X, Copy, LogIn, Plus, Users, Check } from 'lucide-react';
import { ConnectionStatus } from '../../utils/syncClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  currentRoomCode: string;
  connectionStatus: ConnectionStatus;
  userCount: number;
}

export const RoomManager: React.FC<Props> = ({
  isOpen, onClose, onCreateRoom, onJoinRoom, onLeaveRoom,
  currentRoomCode, connectionStatus, userCount,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Graceful Escape key close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(currentRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConnected = connectionStatus === 'connected' && currentRoomCode;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.97)',
          borderColor: 'rgba(71, 85, 105, 0.5)',
          animation: 'modalIn 150ms ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">Collaboration</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isConnected ? (
            /* Connected State */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Room Code</div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-bold tracking-[0.2em] bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    {currentRoomCode}
                  </span>
                  <button
                    onClick={copyCode}
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {userCount} user{userCount !== 1 ? 's' : ''} connected
                </div>
              </div>

              <button
                onClick={() => { onLeaveRoom(); }}
                className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                Leave Room
              </button>
            </div>
          ) : (
            /* Disconnected State */
            <div className="space-y-4">
              {/* Create Room */}
              <button
                onClick={onCreateRoom}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                Create New Room
              </button>

              <div className="flex items-center gap-3 text-slate-500 text-xs">
                <div className="flex-1 h-px bg-slate-700/50" />
                <span>or join existing</span>
                <div className="flex-1 h-px bg-slate-700/50" />
              </div>

              {/* Join Room */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200 text-sm font-mono tracking-widest text-center placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  onClick={() => { if (joinCode.length === 6) onJoinRoom(joinCode); }}
                  disabled={joinCode.length !== 6}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700/50 text-slate-300 text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  Join
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
