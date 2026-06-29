import React from 'react';
import { useCanvas } from '../../hooks/useCanvasState';
import { ShapeType } from '../../types/canvas';
import {
  MousePointer,
  Pencil,
  Square,
  Circle as CircleIcon,
  Minus,
  ArrowUpRight,
  Type,
  StickyNote,
  Cable,
  Undo2,
  Redo2,
  Trash2,
  Sun,
  Moon,
  Group,
  Ungroup,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    selectedIds,
    snapToGrid,
    setSnapToGrid,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    theme,
    setTheme,
    deleteSelected,
    groupSelected,
    ungroupSelected,
    bringToFront,
    sendToBack,
    undo,
    redo,
    canUndo,
    canRedo,
    shapes,
    pushHistoryState
  } = useCanvas();

  // Color Palette Options
  const colors = [
    { name: 'Black/White', dark: '#f8fafc', light: '#0f172a' },
    { name: 'Red', val: '#ef4444' },
    { name: 'Orange', val: '#f97316' },
    { name: 'Yellow', val: '#eab308' },
    { name: 'Green', val: '#22c55e' },
    { name: 'Blue', val: '#3b82f6' },
    { name: 'Purple', val: '#a855f7' },
    { name: 'Pink', val: '#ec4899' }
  ];

  // Fill Options
  const fills = [
    { name: 'Transparent', val: 'transparent' },
    { name: 'Semi Red', val: 'rgba(239, 68, 68, 0.15)' },
    { name: 'Semi Yellow', val: 'rgba(234, 179, 8, 0.15)' },
    { name: 'Semi Green', val: 'rgba(34, 197, 94, 0.15)' },
    { name: 'Semi Blue', val: 'rgba(59, 130, 246, 0.15)' },
    { name: 'Semi Purple', val: 'rgba(168, 85, 247, 0.15)' },
    { name: 'Solid Slate', val: 'rgba(71, 85, 105, 0.3)' }
  ];

  const strokeWidths = [1, 2, 4, 6, 8];
  const fontSizes = [12, 14, 16, 20, 24, 32];

  const handleColorChange = (color: string) => {
    setStrokeColor(color);
    if (selectedIds.length > 0) {
      const updated = shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return { ...s, color };
        }
        return s;
      });
      pushHistoryState(updated);
    }
  };

  const handleFillChange = (fill: string) => {
    setFillColor(fill);
    if (selectedIds.length > 0) {
      const updated = shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return { ...s, fillColor: fill };
        }
        return s;
      });
      pushHistoryState(updated);
    }
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
    if (selectedIds.length > 0) {
      const updated = shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return { ...s, strokeWidth: width };
        }
        return s;
      });
      pushHistoryState(updated);
    }
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    if (selectedIds.length > 0) {
      const updated = shapes.map(s => {
        if (selectedIds.includes(s.id)) {
          return { ...s, fontSize: size };
        }
        return s;
      });
      pushHistoryState(updated);
    }
  };

  const hasGroupedSelection = () => {
    return shapes.some(s => selectedIds.includes(s.id) && s.groupId);
  };

  const getToolButtonClass = (tool: ShapeType | 'select') => {
    const isActive = activeTool === tool;
    return `p-2.5 rounded-lg transition-all duration-150 flex items-center justify-center ${
      isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 dark:hover:bg-slate-800/50'
    }`;
  };

  const getThemeColorValue = (c: { dark?: string; light?: string; val?: string }) => {
    if (c.val) return c.val;
    return theme === 'dark' ? (c.dark || '#ffffff') : (c.light || '#000000');
  };

  return (
    <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-4 items-center justify-start pointer-events-none z-10">
      
      {/* 1. Main Tools Panel */}
      <div className="bg-slate-800/90 dark:bg-slate-900/90 border border-slate-700/60 backdrop-blur rounded-xl p-1.5 shadow-xl flex items-center gap-1 pointer-events-auto">
        <button
          onClick={() => setActiveTool('select')}
          className={getToolButtonClass('select')}
          title="Select Tool (V)"
        >
          <MousePointer size={20} />
        </button>
        <div className="w-px h-6 bg-slate-700/60 mx-1" />
        <button
          onClick={() => setActiveTool('freehand')}
          className={getToolButtonClass('freehand')}
          title="Freehand Draw (D)"
        >
          <Pencil size={20} />
        </button>
        <button
          onClick={() => setActiveTool('rectangle')}
          className={getToolButtonClass('rectangle')}
          title="Rectangle (R)"
        >
          <Square size={20} />
        </button>
        <button
          onClick={() => setActiveTool('circle')}
          className={getToolButtonClass('circle')}
          title="Circle (O)"
        >
          <CircleIcon size={20} />
        </button>
        <button
          onClick={() => setActiveTool('line')}
          className={getToolButtonClass('line')}
          title="Line (L)"
        >
          <Minus size={20} className="rotate-45" />
        </button>
        <button
          onClick={() => setActiveTool('arrow')}
          className={getToolButtonClass('arrow')}
          title="Arrow (A)"
        >
          <ArrowUpRight size={20} />
        </button>
        <button
          onClick={() => setActiveTool('text')}
          className={getToolButtonClass('text')}
          title="Text (T)"
        >
          <Type size={20} />
        </button>
        <button
          onClick={() => setActiveTool('sticky')}
          className={getToolButtonClass('sticky')}
          title="Sticky Note (S)"
        >
          <StickyNote size={20} />
        </button>
        <button
          onClick={() => setActiveTool('connector')}
          className={getToolButtonClass('connector')}
          title="Connector (C)"
        >
          <Cable size={20} />
        </button>
      </div>

      {/* 2. Operations and Global Controls (Undo/Redo, Layer, Delete, Theme) */}
      <div className="bg-slate-800/90 dark:bg-slate-900/90 border border-slate-700/60 backdrop-blur rounded-xl p-1.5 shadow-xl flex items-center gap-1.5 pointer-events-auto">
        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
            canUndo ? 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Undo"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
            canRedo ? 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Redo"
        >
          <Redo2 size={18} />
        </button>
        
        <div className="w-px h-6 bg-slate-700/60 mx-0.5" />

        {/* Group / Ungroup (Only active when elements selected) */}
        <button
          onClick={groupSelected}
          disabled={selectedIds.length < 2}
          className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
            selectedIds.length >= 2 ? 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Group Shapes"
        >
          <Group size={18} />
        </button>
        <button
          onClick={ungroupSelected}
          disabled={!hasGroupedSelection()}
          className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
            hasGroupedSelection() ? 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Ungroup Shapes"
        >
          <Ungroup size={18} />
        </button>

        <div className="w-px h-6 bg-slate-700/60 mx-0.5" />

        {/* Bring to Front / Send to Back */}
        <button
          onClick={bringToFront}
          disabled={selectedIds.length === 0}
          className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
            selectedIds.length > 0 ? 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Bring to Front"
        >
          <ArrowUp size={18} />
        </button>
        <button
          onClick={sendToBack}
          disabled={selectedIds.length === 0}
          className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
            selectedIds.length > 0 ? 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Send to Back"
        >
          <ArrowDown size={18} />
        </button>

        <div className="w-px h-6 bg-slate-700/60 mx-0.5" />

        {/* Snap Grid Toggle */}
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-150 ${
            snapToGrid
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
              : 'text-slate-400 border-slate-700 hover:border-slate-600'
          }`}
          title="Snap to Grid"
        >
          Grid: {snapToGrid ? 'ON' : 'OFF'}
        </button>

        <div className="w-px h-6 bg-slate-700/60 mx-0.5" />

        {/* Delete */}
        <button
          onClick={deleteSelected}
          disabled={selectedIds.length === 0}
          className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
            selectedIds.length > 0
              ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Delete Selected"
        >
          <Trash2 size={18} />
        </button>

        <div className="w-px h-6 bg-slate-700/60 mx-0.5" />

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-all duration-150 flex items-center justify-center"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* 3. Styles Panel (Float Left / Sidebar layout) */}
      <div className="absolute top-20 left-0 bg-slate-800/90 dark:bg-slate-900/90 border border-slate-700/60 backdrop-blur rounded-xl p-3 shadow-xl flex flex-col gap-3.5 pointer-events-auto w-52">
        {/* Stroke Color Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Stroke Color</label>
          <div className="grid grid-cols-4 gap-1.5">
            {colors.map(c => {
              const activeVal = getThemeColorValue(c);
              const isSelected = strokeColor === activeVal;
              return (
                <button
                  key={c.name}
                  onClick={() => handleColorChange(activeVal)}
                  className={`w-7 h-7 rounded border transition-all ${
                    isSelected ? 'ring-2 ring-blue-500 scale-105 border-white' : 'border-slate-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: activeVal }}
                  title={c.name}
                />
              );
            })}
          </div>
        </div>

        {/* Fill Color Selection (only show when not drawing text/connector/freehand) */}
        {activeTool !== 'text' && activeTool !== 'connector' && activeTool !== 'freehand' && (
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Fill Color</label>
            <div className="grid grid-cols-4 gap-1.5">
              {fills.map(f => {
                const isSelected = fillColor === f.val;
                return (
                  <button
                    key={f.name}
                    onClick={() => handleFillChange(f.val)}
                    className={`w-7 h-7 rounded border transition-all relative overflow-hidden ${
                      isSelected ? 'ring-2 ring-blue-500 scale-105 border-white' : 'border-slate-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: f.val === 'transparent' ? 'transparent' : f.val }}
                    title={f.name}
                  >
                    {f.val === 'transparent' && (
                      <div className="w-10 h-0.5 bg-red-500 absolute rotate-45 top-3 -left-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stroke Width Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Stroke Width</label>
          <div className="flex gap-1.5">
            {strokeWidths.map(w => (
              <button
                key={w}
                onClick={() => handleStrokeWidthChange(w)}
                className={`flex-1 py-1 text-xs font-medium rounded border transition-all ${
                  strokeWidth === w
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'text-slate-400 border-slate-700 hover:bg-slate-700/50'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Selection (only show for text/sticky notes) */}
        {(activeTool === 'text' || activeTool === 'sticky' || selectedIds.some(id => {
          const s = shapes.find(sh => sh.id === id);
          return s && (s.type === 'text' || s.type === 'sticky');
        })) && (
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Font Size</label>
            <div className="grid grid-cols-3 gap-1">
              {fontSizes.map(sz => (
                <button
                  key={sz}
                  onClick={() => handleFontSizeChange(sz)}
                  className={`py-1 text-[11px] font-medium rounded border transition-all ${
                    fontSize === sz
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'text-slate-400 border-slate-700 hover:bg-slate-700/50'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
