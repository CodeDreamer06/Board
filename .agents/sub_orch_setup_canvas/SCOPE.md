# Scope: Setup & Canvas

## Architecture
- **Frontend**: Vite + React + TypeScript + Tailwind CSS.
- **Tauri Backend**: Rust-based backend framework configured for macOS desktop target.
- **Canvas Engine**: HTML5 `<canvas>` or interactive SVG based drawing interface.
- **State Management**: React state/context or a custom hook storing shapes, zoom, pan, selection, and undo/redo stacks.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | M1: Project Skeleton | Initialize Tauri, Vite, React, TS, Tailwind CSS; ensure compile/launch success | None | DONE |
| 2 | M2: Core Canvas & Draw | Infinite canvas, pan/zoom, drawing tools (freehand, rect, circle, line, arrow, text, sticky note, connectors) | M1 | BLOCKED: Integrity Audit Failure |
| 3 | M3: Canvas Interactions | Selection, multi-selection, resize, snap-to-grid, guides, grouping, layers, minimap, dark mode | M2 | PLANNED |
| 4 | M4: Tests & Verification | Unit tests for canvas state and components, E2E structure validation | M3 | PLANNED |

## Interface Contracts
### Shape Structure
```typescript
type ShapeType = 'freehand' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'sticky' | 'connector';

interface Point {
  x: number;
  y: number;
}

interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fillColor?: string;
  strokeWidth: number;
  isLocked?: boolean;
  groupId?: string;
  layer: number;
}

interface FreehandShape extends BaseShape {
  type: 'freehand';
  points: Point[];
}

interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
}

interface StickyShape extends BaseShape {
  type: 'sticky';
  text: string;
  color: string; // sticky note color (e.g. yellow, blue)
}

interface ConnectorShape extends BaseShape {
  type: 'connector';
  fromId: string; // ID of shape connecting from
  toId: string;   // ID of shape connecting to
  fromPoint?: Point;
  toPoint?: Point;
}

type Shape = BaseShape | FreehandShape | TextShape | StickyShape | ConnectorShape;
```
