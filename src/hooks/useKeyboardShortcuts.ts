import { useEffect, useCallback } from 'react';
import { useCanvas } from './useCanvasState';
import { ShapeType } from '../types/canvas';

interface ShortcutHandlers {
  openCommandPalette: () => void;
  onAddCodeBlock: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const ctx = useCanvas();

  const isInputFocused = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' ||
           (el as HTMLElement).isContentEditable;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      const isMeta = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      if (isMeta) {
        switch (e.key.toLowerCase()) {
          case 'k':
            e.preventDefault();
            handlers.openCommandPalette();
            return;
          case 'z':
            e.preventDefault();
            if (isShift) { ctx.redo(); } else { ctx.undo(); }
            return;
          case 'g':
            e.preventDefault();
            if (isShift) { ctx.ungroupSelected(); } else { ctx.groupSelected(); }
            return;
          case ']':
            e.preventDefault();
            ctx.bringToFront();
            return;
          case '[':
            e.preventDefault();
            ctx.sendToBack();
            return;
          case 'd':
            e.preventDefault();
            const selected = ctx.shapes.filter(s => ctx.selectedIds.includes(s.id));
            const newIds: string[] = [];
            selected.forEach(s => {
              const id = ctx.addShape({ ...s, x: s.x + 20, y: s.y + 20 });
              newIds.push(id);
            });
            if (newIds.length > 0) ctx.setSelectedIds(newIds);
            return;
          case 'a':
            e.preventDefault();
            ctx.setSelectedIds(ctx.shapes.map(s => s.id));
            return;
          case '=':
          case '+':
            e.preventDefault();
            ctx.setViewport(v => ({ ...v, zoom: Math.min(v.zoom * 1.25, 20) }));
            return;
          case '-':
            e.preventDefault();
            ctx.setViewport(v => ({ ...v, zoom: Math.max(v.zoom / 1.25, 0.1) }));
            return;
          case '0':
            e.preventDefault();
            ctx.setViewport({ x: 0, y: 0, zoom: 1 });
            return;
        }
        return;
      }

      const toolMap: Record<string, ShapeType | 'select'> = {
        v: 'select', r: 'rectangle', o: 'circle', l: 'line',
        a: 'arrow', t: 'text', s: 'sticky', d: 'freehand', c: 'connector',
      };

      const key = e.key.toLowerCase();

      if (key in toolMap) {
        e.preventDefault();
        ctx.setActiveTool(toolMap[key]);
        return;
      }

      if (key === 'k') {
        e.preventDefault();
        handlers.onAddCodeBlock();
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        ctx.deleteSelected();
        return;
      }

      if (key === 'escape') {
        ctx.setSelectedIds([]);
        ctx.setActiveTool('select');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ctx, handlers, isInputFocused]);
}
