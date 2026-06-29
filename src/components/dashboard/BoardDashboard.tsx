import React, { useEffect, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvasState';
import { X, Search, FileCode, Plus, Trash2, Copy, Calendar, Clock, HardDrive, RefreshCw } from 'lucide-react';

interface BoardSummary {
  id: string;
  name: string;
  updated_at: number;
  created_at: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BoardDashboard: React.FC<Props> = ({ isOpen, onClose }) => {
  const ctx = useCanvas();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = async () => {
    setLoading(true);
    setError(null);
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri?.invoke) {
        const list = await tauri.invoke('list_boards');
        setBoards(list);
      } else {
        // Fallback for browser mode: mock list using localStorage
        const localBoards: BoardSummary[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('devboard_meta_')) {
            try {
              const meta = JSON.parse(localStorage.getItem(key) || '');
              localBoards.push(meta);
            } catch (_) {}
          }
        }
        setBoards(localBoards.sort((a, b) => b.updated_at - a.updated_at));
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch boards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBoards();
    }
  }, [isOpen]);

  // Graceful Escape key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectBoard = async (board: BoardSummary) => {
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri?.invoke) {
        const data = await tauri.invoke('load_board', { id: board.id });
        if (data) {
          const [_name, dataJson] = data;
          const parsed = JSON.parse(dataJson);
          ctx.setShapes(parsed.shapes || []);
          ctx.setViewport(parsed.viewport || { x: 0, y: 0, zoom: 1.0 });
          if (parsed.bgType) ctx.setBgType(parsed.bgType);
          if (parsed.bgTheme) ctx.setBgTheme(parsed.bgTheme);
          if (parsed.slides) ctx.setSlides(parsed.slides);
          ctx.setBoardId(board.id);
          ctx.setBoardName(board.name);
        }
      } else {
        // Browser mode
        const dataJson = localStorage.getItem(`devboard_data_${board.id}`);
        if (dataJson) {
          const parsed = JSON.parse(dataJson);
          ctx.setShapes(parsed.shapes || []);
          ctx.setViewport(parsed.viewport || { x: 0, y: 0, zoom: 1.0 });
          if (parsed.bgType) ctx.setBgType(parsed.bgType);
          if (parsed.bgTheme) ctx.setBgTheme(parsed.bgTheme);
          if (parsed.slides) ctx.setSlides(parsed.slides);
          ctx.setBoardId(board.id);
          ctx.setBoardName(board.name);
        }
      }
      onClose();
    } catch (e: any) {
      setError(`Failed to load board: ${e.message || e}`);
    }
  };

  const handleCreateNewBoard = () => {
    ctx.setShapes([]);
    ctx.setViewport({ x: 0, y: 0, zoom: 1.0 });
    ctx.setBoardId(null);
    ctx.setBoardName('Untitled Board');
    onClose();
  };

  const handleDeleteBoard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this board?')) return;
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri?.invoke) {
        await tauri.invoke('delete_board', { id });
      } else {
        localStorage.removeItem(`devboard_meta_${id}`);
        localStorage.removeItem(`devboard_data_${id}`);
      }
      if (ctx.boardId === id) {
        ctx.setBoardId(null);
        ctx.setBoardName('Untitled Board');
        ctx.setShapes([]);
      }
      fetchBoards();
    } catch (err: any) {
      setError(`Failed to delete board: ${err.message || err}`);
    }
  };

  const handleCloneBoard = async (board: BoardSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newId = `board_${Math.random().toString(36).substring(2, 10)}`;
      const newName = `${board.name} (Copy)`;
      const tauri = (window as any).__TAURI__;

      let sourceDataJson = '';
      if (tauri?.invoke) {
        const res = await tauri.invoke('load_board', { id: board.id });
        if (res) sourceDataJson = res[1];
      } else {
        sourceDataJson = localStorage.getItem(`devboard_data_${board.id}`) || '{}';
      }

      if (tauri?.invoke) {
        await tauri.invoke('save_board', { id: newId, name: newName, data: sourceDataJson });
      } else {
        const now = Date.now();
        localStorage.setItem(`devboard_meta_${newId}`, JSON.stringify({ id: newId, name: newName, updated_at: now, created_at: now }));
        localStorage.setItem(`devboard_data_${newId}`, sourceDataJson);
      }
      fetchBoards();
    } catch (err: any) {
      setError(`Failed to duplicate board: ${err.message || err}`);
    }
  };

  const filteredBoards = boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border overflow-hidden flex flex-col h-[70vh]"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.98)',
          borderColor: 'rgba(71, 85, 105, 0.5)',
          animation: 'modalIn 150ms ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">Local Board Manager</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBoards}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="px-6 py-4 border-b border-slate-700/50 flex gap-4 items-center shrink-0">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/50">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search local boards..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-slate-200 outline-none w-full placeholder-slate-600"
            />
          </div>
          <button
            onClick={handleCreateNewBoard}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Board
          </button>
        </div>

        {/* Boards List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {filteredBoards.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
              <FileCode className="w-12 h-12 text-slate-600 mb-2" />
              <p className="text-sm">No boards found</p>
              <p className="text-xs text-slate-600 mt-1">Create a new board to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredBoards.map(board => (
                <div
                  key={board.id}
                  onClick={() => handleSelectBoard(board)}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/90 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between h-32 relative"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                      {board.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>Saved {new Date(board.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>Created {new Date(board.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleCloneBoard(board, e)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Duplicate Board"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteBoard(board.id, e)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Delete Board"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
