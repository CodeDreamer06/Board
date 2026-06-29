import { useState, useCallback, useMemo, useEffect } from 'react';
import { CanvasProvider, useCanvas } from './hooks/useCanvasState';
import { Canvas } from './components/canvas/Canvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { CommandPalette } from './components/palette/CommandPalette';
import { TemplatePanel } from './components/templates/TemplatePanel';
import { PresenceBar } from './components/collaboration/PresenceBar';
import { RemoteCursors } from './components/collaboration/RemoteCursors';
import { RoomManager } from './components/collaboration/RoomManager';
import { CodeBlock } from './components/codeblock/CodeBlock';
import { ApiTester } from './components/apicard/ApiTester';
import { BoardDashboard } from './components/dashboard/BoardDashboard';
import { DiagramGenerator } from './components/diagrammer/DiagramGenerator';
import { StyleSettings } from './components/style/StyleSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCollaboration } from './hooks/useCollaboration';
import { Boxes, Users, HardDrive, Sparkles } from 'lucide-react';

function MainEditor() {
  const ctx = useCanvas();
  const { theme, viewport, addShape } = ctx;

  // Track which code block is actively being edited
  const [editingCodeBlockId, setEditingCodeBlockId] = useState<string | null>(null);

  // Find code shapes that are selected
  const codeShapes = ctx.shapes.filter(s => s.type === 'code');
  const selectedCodeShape = codeShapes.find(s => ctx.selectedIds.includes(s.id));

  // Auto-open code editor when a code block is selected
  const activeCodeShape = editingCodeBlockId
    ? ctx.shapes.find(s => s.id === editingCodeBlockId)
    : selectedCodeShape;

  // Track API tester overlay
  const [editingApiCardId, setEditingApiCardId] = useState<string | null>(null);

  // Find API shapes that are selected
  const apiShapes = ctx.shapes.filter(s => s.type === 'apiCard');
  const selectedApiShape = apiShapes.find(s => ctx.selectedIds.includes(s.id));

  const activeApiShape = editingApiCardId
    ? ctx.shapes.find(s => s.id === editingApiCardId)
    : selectedApiShape;

  // UI modal states
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(false);
  const [isRoomManagerOpen, setIsRoomManagerOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isDiagramGeneratorOpen, setIsDiagramGeneratorOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Collaboration
  const collab = useCollaboration();

  // Code block helper
  const addCodeBlock = useCallback(() => {
    const canvas = document.querySelector('canvas');
    const cw = canvas?.width || 800;
    const ch = canvas?.height || 600;
    const centerX = (-viewport.x + cw / 2) / viewport.zoom - 200;
    const centerY = (-viewport.y + ch / 2) / viewport.zoom - 125;

    addShape({
      type: 'code',
      x: centerX,
      y: centerY,
      width: 400,
      height: 250,
      color: '#6366f1',
      fillColor: '#1e1e2e',
      strokeWidth: 1,
      language: 'javascript',
      code: '// Write your code here\nconsole.log("Hello, DevBoard!");\n',
    });
  }, [viewport, addShape]);

  // Keyboard shortcuts
  const shortcutHandlers = useMemo(() => ({
    openCommandPalette: () => setIsCommandPaletteOpen(true),
    onAddCodeBlock: addCodeBlock,
    openDashboard: () => setIsDashboardOpen(true),
    openDiagramGenerator: () => setIsDiagramGeneratorOpen(true),
  }), [addCodeBlock]);

  useKeyboardShortcuts(shortcutHandlers);

  // Save board function
  const saveBoard = useCallback(async () => {
    if (ctx.shapes.length === 0 && ctx.boardName === 'Untitled Board') return;

    setSaveStatus('saving');
    let targetId = ctx.boardId;
    if (!targetId) {
      targetId = `board_${Math.random().toString(36).substring(2, 10)}`;
      ctx.setBoardId(targetId);
    }

    const payload = JSON.stringify({
      shapes: ctx.shapes,
      viewport: ctx.viewport,
      bgType: ctx.bgType,
      bgTheme: ctx.bgTheme,
      slides: ctx.slides,
    });

    try {
      const tauri = (window as any).__TAURI__;
      if (tauri?.invoke) {
        await tauri.invoke('save_board', {
          id: targetId,
          name: ctx.boardName,
          data: payload,
        });
      } else {
        const now = Date.now();
        const meta = {
          id: targetId,
          name: ctx.boardName,
          updated_at: now,
          created_at: now,
        };
        localStorage.setItem(`devboard_meta_${targetId}`, JSON.stringify(meta));
        localStorage.setItem(`devboard_data_${targetId}`, payload);
      }
      setSaveStatus('saved');
    } catch (e) {
      console.error('[DevBoard] Auto-save error', e);
      setSaveStatus('error');
    }
  }, [ctx.boardId, ctx.boardName, ctx.shapes, ctx.viewport, ctx.bgType, ctx.bgTheme, ctx.slides]);

  // Periodic Auto-save hook (every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      saveBoard();
    }, 5000);
    return () => clearInterval(timer);
  }, [saveBoard]);

  return (
    <div
      className={`relative w-screen h-screen flex flex-col overflow-hidden transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Header / Top Title Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/80 dark:bg-slate-900/80 border border-slate-700/50 dark:border-slate-800/50 backdrop-blur px-4 py-2 rounded-xl shadow-lg z-10 select-none flex items-center gap-3">
        <input
          type="text"
          value={ctx.boardName}
          onChange={e => ctx.setBoardName(e.target.value)}
          onBlur={saveBoard}
          className="text-xs font-bold bg-transparent text-slate-100 outline-none text-center pointer-events-auto w-32 border-b border-transparent focus:border-slate-600 transition-all font-sans"
          placeholder="Rename board..."
          title="Click to rename board"
        />
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            saveStatus === 'saved' ? 'bg-emerald-400' : saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
          }`}
          title={saveStatus === 'saved' ? 'Saved (Local-first active)' : saveStatus === 'saving' ? 'Saving...' : 'Save Error'}
        />
      </div>

      {/* Top-Right Unified Controls Panel */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3 pointer-events-auto">
        {/* Right-side Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDashboardOpen(true)}
            className="p-2 rounded-lg border bg-slate-800/80 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
            title="Board Manager"
          >
            <HardDrive className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsDiagramGeneratorOpen(true)}
            className="p-2 rounded-lg border bg-slate-800/80 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
            title="Live Code-to-Diagram"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsTemplatePanelOpen(!isTemplatePanelOpen)}
            className={`p-2 rounded-lg border transition-all ${
              isTemplatePanelOpen
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
            title="Templates"
          >
            <Boxes className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsRoomManagerOpen(true)}
            className={`p-2 rounded-lg border transition-all ${
              collab.connectionStatus === 'connected'
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
            title="Collaboration"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>

        {/* Presence Bar */}
        <PresenceBar
          users={collab.remoteUsers}
          connectionStatus={collab.connectionStatus}
          currentClientId={collab.clientId}
          roomCode={collab.roomCode}
        />
      </div>

      {/* Remote Cursors */}
      <RemoteCursors
        cursors={collab.remoteCursors}
        viewport={viewport}
      />

      {/* Style & Background settings */}
      <StyleSettings />

      {/* Floating Toolbar and Styling Panel */}
      <Toolbar />

      {/* Custom HTML5 Canvas Renderer */}
      <Canvas />

      {/* Code Block Overlays */}
      {activeCodeShape && (
        <CodeBlock
          key={activeCodeShape.id}
          shape={activeCodeShape}
          viewport={viewport}
          onUpdate={(updates) => ctx.updateShape(activeCodeShape.id, updates)}
          onClose={() => setEditingCodeBlockId(null)}
        />
      )}

      {/* API Card Tester Overlays */}
      {activeApiShape && (
        <ApiTester
          key={activeApiShape.id}
          shape={activeApiShape}
          viewport={viewport}
          onUpdate={(updates) => ctx.updateShape(activeApiShape.id, updates)}
          onClose={() => setEditingApiCardId(null)}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onAddCodeBlock={addCodeBlock}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onOpenDiagramGenerator={() => setIsDiagramGeneratorOpen(true)}
      />

      {/* Template Panel */}
      <TemplatePanel
        isOpen={isTemplatePanelOpen}
        onClose={() => setIsTemplatePanelOpen(false)}
      />

      {/* Room Manager */}
      <RoomManager
        isOpen={isRoomManagerOpen}
        onClose={() => setIsRoomManagerOpen(false)}
        onCreateRoom={collab.createRoom}
        onJoinRoom={collab.joinRoom}
        onLeaveRoom={collab.leaveRoom}
        currentRoomCode={collab.roomCode}
        connectionStatus={collab.connectionStatus}
        userCount={collab.remoteUsers.length}
      />

      {/* Board List Dashboard */}
      <BoardDashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
      />

      {/* Live Diagram Generator */}
      <DiagramGenerator
        isOpen={isDiagramGeneratorOpen}
        onClose={() => setIsDiagramGeneratorOpen(false)}
      />

      {/* Keyboard Shortcut Hint */}
      <div className="absolute bottom-4 right-[190px] z-10 text-[10px] text-slate-600 select-none pointer-events-none">
        ⌘K Command Palette · Press V for Select · R for Rectangle · D for Draw
      </div>
    </div>
  );
}

export default function App() {
  return (
    <CanvasProvider>
      <MainEditor />
    </CanvasProvider>
  );
}
