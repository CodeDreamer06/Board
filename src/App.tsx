import { useState, useCallback, useMemo } from 'react';
import { CanvasProvider, useCanvas } from './hooks/useCanvasState';
import { Canvas } from './components/canvas/Canvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { CommandPalette } from './components/palette/CommandPalette';
import { TemplatePanel } from './components/templates/TemplatePanel';
import { PresenceBar } from './components/collaboration/PresenceBar';
import { RemoteCursors } from './components/collaboration/RemoteCursors';
import { RoomManager } from './components/collaboration/RoomManager';
import { CodeBlock } from './components/codeblock/CodeBlock';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCollaboration } from './hooks/useCollaboration';
import { Boxes, Users } from 'lucide-react';

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


  // UI state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(false);
  const [isRoomManagerOpen, setIsRoomManagerOpen] = useState(false);

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
  }), [addCodeBlock]);

  useKeyboardShortcuts(shortcutHandlers);

  return (
    <div
      className={`relative w-screen h-screen flex flex-col overflow-hidden transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Header / Top Title Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/80 dark:bg-slate-900/80 border border-slate-700/50 dark:border-slate-800/50 backdrop-blur px-4 py-2 rounded-xl shadow-lg z-10 select-none pointer-events-none flex items-center gap-3">
        <h1 className="text-sm font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent pointer-events-auto">
          DevBoard
        </h1>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse pointer-events-auto" title="Local-First Active" />
      </div>

      {/* Right-side Action Buttons */}
      <div className="absolute top-4 right-[280px] z-20 flex items-center gap-2 pointer-events-auto">
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

      {/* Remote Cursors */}
      <RemoteCursors
        cursors={collab.remoteCursors}
        viewport={viewport}
      />

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

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onAddCodeBlock={addCodeBlock}
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

      {/* Keyboard Shortcut Hint */}
      <div className="absolute bottom-4 left-4 z-10 text-[10px] text-slate-600 select-none pointer-events-none">
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
