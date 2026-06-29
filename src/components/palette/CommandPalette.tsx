import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCanvas } from '../../hooks/useCanvasState';
import {
  Search, Square, Circle, Minus, ArrowRight, Type, StickyNote,
  Link2, Pencil, Undo2, Redo2, Trash2, Group, Ungroup, Sun, Moon,
  Grid3X3, ZoomIn, ZoomOut, Download, FileJson, Image as ImageIcon,
  Code2, Copy, Layers, ChevronRight, MousePointer2, HardDrive, Sparkles
} from 'lucide-react';

interface Command {
  id: string;
  name: string;
  shortcut?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddCodeBlock?: () => void;
  onOpenDashboard?: () => void;
  onOpenDiagramGenerator?: () => void;
}

export const CommandPalette: React.FC<Props> = ({
  isOpen,
  onClose,
  onAddCodeBlock,
  onOpenDashboard,
  onOpenDiagramGenerator
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const ctx = useCanvas();

  const iconClass = "w-4 h-4 opacity-70";

  const commands: Command[] = useMemo(() => [
    // Tools
    { id: 'select', name: 'Select Tool', shortcut: 'V', icon: <MousePointer2 className={iconClass}/>, category: 'Tools',
      action: () => ctx.setActiveTool('select') },
    { id: 'rectangle', name: 'Rectangle Tool', shortcut: 'R', icon: <Square className={iconClass}/>, category: 'Tools',
      action: () => ctx.setActiveTool('rectangle') },
    { id: 'circle', name: 'Circle Tool', shortcut: 'O', icon: <Circle className={iconClass}/>, category: 'Tools',
      action: () => ctx.setActiveTool('circle') },
    { id: 'line', name: 'Line Tool', shortcut: 'L', icon: <Minus className={iconClass}/>, category: 'Tools',
      action: () => ctx.setActiveTool('line') },
    { id: 'arrow', name: 'Arrow Tool', shortcut: 'A', icon: <ArrowRight className={iconClass}/>, category: 'Tools',
      action: () => ctx.setActiveTool('arrow') },
    { id: 'text', name: 'Text Tool', shortcut: 'T', icon: <Type className={iconClass}/>, category: 'Tools',
      action: () => ctx.setActiveTool('text') },
    { id: 'sticky', name: 'Sticky Note', shortcut: 'S', icon: <StickyNote className={iconClass}/>, category: 'Tools',
      action: () => ctx.setActiveTool('sticky') },
    { id: 'connector', name: 'Connector Tool', shortcut: 'C', icon: <Link2 className={iconClass}/>, category: 'Tools',
      action: () => ctx.setActiveTool('connector') },
    { id: 'freehand', name: 'Freehand Draw', shortcut: 'D', icon: <Pencil className={iconClass}/>, category: 'Tools',
      action: () => ctx.setActiveTool('freehand') },
    { id: 'code', name: 'Add Code Block', shortcut: 'K', icon: <Code2 className={iconClass}/>, category: 'Tools',
      action: () => onAddCodeBlock?.() },

    // Core Modals
    { id: 'dashboard', name: 'Open Board Manager', shortcut: '⌘H', icon: <HardDrive className={iconClass}/>, category: 'Tools',
      action: () => onOpenDashboard?.() },
    { id: 'diagram-gen', name: 'Open Diagram Generator', shortcut: '⌘I', icon: <Sparkles className={iconClass}/>, category: 'Tools',
      action: () => onOpenDiagramGenerator?.() },

    // Dev Pipeline Chaining/Executing
    { id: 'run-code', name: 'Run Selected Code Block', icon: <Code2 className={iconClass}/>, category: 'Dev Pipeline',
      action: () => {
        const active = ctx.shapes.find(s => s.type === 'code' && ctx.selectedIds.includes(s.id));
        if (active) {
          window.dispatchEvent(new CustomEvent('devboard-execute-code', { detail: { shapeId: active.id } }));
        } else {
          alert('Please select a Code Block shape first.');
        }
      }},

    // Edit
    { id: 'undo', name: 'Undo', shortcut: '⌘Z', icon: <Undo2 className={iconClass}/>, category: 'Edit',
      action: () => ctx.undo() },
    { id: 'redo', name: 'Redo', shortcut: '⌘⇧Z', icon: <Redo2 className={iconClass}/>, category: 'Edit',
      action: () => ctx.redo() },
    { id: 'delete', name: 'Delete Selected', shortcut: '⌫', icon: <Trash2 className={iconClass}/>, category: 'Edit',
      action: () => ctx.deleteSelected() },
    { id: 'duplicate', name: 'Duplicate Selected', shortcut: '⌘D', icon: <Copy className={iconClass}/>, category: 'Edit',
      action: () => {
        const selected = ctx.shapes.filter(s => ctx.selectedIds.includes(s.id));
        selected.forEach(s => {
          ctx.addShape({ ...s, x: s.x + 20, y: s.y + 20 });
        });
      }},
    { id: 'group', name: 'Group Selected', shortcut: '⌘G', icon: <Group className={iconClass}/>, category: 'Edit',
      action: () => ctx.groupSelected() },
    { id: 'ungroup', name: 'Ungroup Selected', shortcut: '⌘⇧G', icon: <Ungroup className={iconClass}/>, category: 'Edit',
      action: () => ctx.ungroupSelected() },

    // Layer
    { id: 'front', name: 'Bring to Front', shortcut: '⌘]', icon: <Layers className={iconClass}/>, category: 'Layer',
      action: () => ctx.bringToFront() },
    { id: 'back', name: 'Send to Back', shortcut: '⌘[', icon: <Layers className={iconClass}/>, category: 'Layer',
      action: () => ctx.sendToBack() },

    // View
    { id: 'darkmode', name: 'Toggle Dark Mode', icon: ctx.theme === 'dark' ? <Sun className={iconClass}/> : <Moon className={iconClass}/>, category: 'View',
      action: () => ctx.setTheme(ctx.theme === 'dark' ? 'light' : 'dark') },
    { id: 'snap-grid', name: 'Toggle Snap to Grid', icon: <Grid3X3 className={iconClass}/>, category: 'View',
      action: () => ctx.setSnapToGrid(!ctx.snapToGrid) },
    { id: 'bg-pattern', name: 'Cycle Grid Background Pattern', icon: <Grid3X3 className={iconClass}/>, category: 'View',
      action: () => {
        const types: Array<'dots' | 'grid' | 'isometric' | 'gradient' | 'none'> = ['dots', 'grid', 'isometric', 'gradient', 'none'];
        const nextIdx = (types.indexOf(ctx.bgType) + 1) % types.length;
        ctx.setBgType(types[nextIdx]);
      }},
    { id: 'bg-theme', name: 'Cycle Board Theme Aesthetic', icon: <Layers className={iconClass}/>, category: 'View',
      action: () => {
        const themes: Array<'corporate' | 'blueprint' | 'neon' | 'sketch' | 'minimal'> = ['corporate', 'blueprint', 'neon', 'sketch', 'minimal'];
        const nextIdx = (themes.indexOf(ctx.bgTheme) + 1) % themes.length;
        ctx.setBgTheme(themes[nextIdx]);
      }},
    { id: 'zoomin', name: 'Zoom In', shortcut: '⌘=', icon: <ZoomIn className={iconClass}/>, category: 'View',
      action: () => ctx.setViewport(v => ({ ...v, zoom: Math.min(v.zoom * 1.25, 20) })) },
    { id: 'zoomout', name: 'Zoom Out', shortcut: '⌘-', icon: <ZoomOut className={iconClass}/>, category: 'View',
      action: () => ctx.setViewport(v => ({ ...v, zoom: Math.max(v.zoom / 1.25, 0.1) })) },
    { id: 'zoomfit', name: 'Zoom to Fit', shortcut: '⌘0', icon: <ZoomOut className={iconClass}/>, category: 'View',
      action: () => ctx.setViewport({ x: 0, y: 0, zoom: 1 }) },

    // Export
    { id: 'exportpng', name: 'Export as PNG', icon: <ImageIcon className={iconClass}/>, category: 'Export',
      action: () => exportCanvas('png') },
    { id: 'exportsvg', name: 'Export as SVG', icon: <Download className={iconClass}/>, category: 'Export',
      action: () => exportCanvas('svg') },
    { id: 'exportjson', name: 'Export as JSON', icon: <FileJson className={iconClass}/>, category: 'Export',
      action: () => {
        const data = JSON.stringify({ shapes: ctx.shapes, version: '1.0' }, null, 2);
        downloadFile(data, 'devboard-export.json', 'application/json');
      }},
  ], [ctx, onAddCodeBlock, onOpenDashboard, onOpenDiagramGenerator]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = list.querySelectorAll('[data-command-item]');
    const selected = items[selectedIndex];
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filteredCommands[selectedIndex];
      if (cmd) {
        cmd.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  const grouped = new Map<string, Command[]>();
  filteredCommands.forEach(cmd => {
    if (!grouped.has(cmd.category)) grouped.set(cmd.category, []);
    grouped.get(cmd.category)!.push(cmd);
  });

  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.97)',
          borderColor: 'rgba(71, 85, 105, 0.5)',
          animation: 'cmdPaletteIn 150ms ease-out',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-slate-100 text-sm outline-none placeholder-slate-500"
            autoComplete="off"
          />
          <kbd className="text-[10px] text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">
              No commands found
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {category}
                </div>
                {cmds.map(cmd => {
                  const idx = globalIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      data-command-item
                      onClick={() => { cmd.action(); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`mx-2 px-3 py-2 rounded-lg flex items-center gap-3 cursor-pointer transition-all duration-100 ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {cmd.icon}
                      <span className="flex-1 text-sm">{cmd.name}</span>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] text-slate-500 bg-slate-800/80 border border-slate-700/50 px-1.5 py-0.5 rounded font-mono">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      {isSelected && <ChevronRight className="w-3 h-3 text-blue-400" />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700/50 flex items-center gap-4 text-[10px] text-slate-500">
          <span>↑↓ Navigate</span>
          <span>↵ Execute</span>
          <span>ESC Close</span>
          <span className="ml-auto">{filteredCommands.length} commands</span>
        </div>
      </div>

      <style>{`
        @keyframes cmdPaletteIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCanvas(format: 'png' | 'svg') {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  if (format === 'png') {
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'devboard-export.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  } else if (format === 'svg') {
    const dataUrl = canvas.toDataURL('image/png');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/>
    </svg>`;
    downloadFile(svg, 'devboard-export.svg', 'image/svg+xml');
  }
}

export default CommandPalette;
