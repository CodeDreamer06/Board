## 2026-06-28T16:56:23Z

You are teamwork_preview_worker.
Identity: worker_canvas
Working directory: /Users/abhinav/Projects/Board/.agents/worker_m2_canvas

Your task:
Implement the complete R1 Canvas & Drawing Engine in /Users/abhinav/Projects/Board:
1. Canvas state management (e.g. in `src/hooks/useCanvasState.ts` or custom react hooks/context):
   - Manage shapes array (freehand, rectangle, circle, line, arrow, text, sticky notes, connectors).
   - Handle selection (single or multi-selection box, shift-click).
   - Drag/move shapes and resize shapes (with handles).
   - Support grouping and ungrouping of selected shapes.
   - Support layering (bringing to front, sending to back).
   - Snap-to-grid (toggleable) and alignment guides (visual guidelines when shapes align on center/edges).
   - Undo/Redo stack supporting at least 20 operations.
2. Render Canvas Component (`src/components/canvas/Canvas.tsx`):
   - Build a custom HTML5 Canvas or SVG renderer. Render all drawing shapes correctly.
   - Support zoom (scroll / pinch) and pan (space bar + mouse drag, or middle mouse drag).
   - Show selection indicators, drag handles, grid, and alignment guides.
   - Include a floating minimap displaying a scaled-down view of all shapes and the current viewport boundary.
3. UI Toolbar & Floating Panels (`src/components/toolbar/Toolbar.tsx` or similar):
   - Toolbar to choose tool: Select, Freehand, Rectangle, Circle, Line, Arrow, Text, Sticky note, Connector.
   - Styling options (color, fill, stroke width).
   - Group/ungroup buttons, layer ordering buttons.
   - Undo/redo buttons.
   - Theme toggle (light/dark mode) switching styles and canvas colors. Use Tailwind CSS classes.
4. Integrate with `src/App.tsx` to provide a complete, functional editor.
5. Verify that the application compiles cleanly by running the build command (e.g. `npm run build`).
6. Write a handoff report at handoff.md in your working directory and message the parent with the results.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
