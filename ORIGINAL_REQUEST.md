# Original User Request

## Initial Request — 2026-06-28T22:21:15+05:30

# DevBoard — Local-First Collaborative Whiteboard for Developers

Build a production-quality, local-first collaborative whiteboard application for developers. Think Excalidraw, but purpose-built for programmers: executable code snippets with syntax highlighting, developer-oriented diagram templates (databases, networking, architecture), and a custom-built lightweight synchronization protocol. The app is built with Tauri (Rust backend) + Vite + TypeScript (frontend), delivering a native desktop experience with real-time collaboration.

Working directory: /Users/abhinav/Projects/Board
Integrity mode: development

## Requirements

### R1. Canvas & Drawing Engine

An infinite canvas with Excalidraw-style drawing capabilities: freehand drawing, shapes (rectangles, circles, arrows, lines, diamonds, ellipses), text labels, sticky notes, connectors with auto-routing between shapes, grouping/ungrouping, layers, zoom/pan, minimap, selection/multi-selection, drag-to-resize, snap-to-grid, and alignment guides. Support for dark mode and light mode themes.

### R2. Code Snippet Blocks

Draggable code snippet blocks that can be placed on the canvas. Each block supports:
- Syntax highlighting for common languages (JavaScript, TypeScript, Python, Rust, Go, shell/bash, SQL, JSON, YAML, HTML/CSS, C/C++)
- An integrated "Run" button that executes the snippet and displays stdout/stderr output inline below the block
- Language auto-detection and manual language selector
- Code execution should be sandboxed appropriately — use child processes with timeouts and resource limits
- Support for as many languages as feasible (at minimum JS/TS via Node, Python, shell); others can be best-effort based on what's installed on the user's system

### R3. Custom Synchronization Protocol

A custom-built lightweight synchronization protocol — do NOT use off-the-shelf CRDTs like Yjs or Automerge for the sync layer itself (you may use them as reference/inspiration). Implement:
- WebSocket-based relay server (can be embedded in Tauri or standalone)
- A custom message protocol with the following message shape as a baseline:
```json
{
  "type": "draw",
  "clientId": "abc123",
  "objectId": "line-981",
  "timestamp": 1720000000,
  "payload": { ... }
}
```
- Vector clocks or Lamport timestamps for causal ordering
- Conflict resolution strategy (last-writer-wins with vector clocks, or operational-transform-style merging)
- TCP connection management with automatic reconnection and exponential backoff
- Latency compensation (optimistic local apply, reconcile on server ack)
- Broadcast/multicast-style update fan-out to all connected peers
- Message ordering guarantees (causal ordering at minimum)
- Optional: WebRTC data channel for direct peer-to-peer sync when peers are on the same network, falling back to WebSocket relay

### R4. Developer Diagram Templates & Smart Blocks

Pre-built, drag-and-drop template blocks for common developer artifacts:
- **Database diagrams**: Tables with columns, types, primary/foreign key indicators, and relationship lines (1:1, 1:N, N:M)
- **Network/architecture diagrams**: Server, client, database, load balancer, queue, cache icons with labeled connections
- **Sequence diagrams**: Actors, lifelines, messages, self-calls, alt/loop/opt frames
- **Flowcharts**: Decision diamonds, process blocks, start/end terminals, labeled arrows
- **API endpoint cards**: Method badge (GET/POST/PUT/DELETE), path, request/response schema preview
- **State machines**: States, transitions, guards, actions
- **Git branch diagrams**: Commit nodes, branch lines, merge points
- **Kanban/task boards**: Columns with draggable cards
- Templates should be extensible — users can save custom shapes/groups as reusable templates

### R5. Collaboration Features

- Real-time cursor presence (show other users' cursors with name labels and distinct colors)
- User avatars/names in a presence bar
- Selection awareness (highlight objects being edited by others)
- Follow mode (follow another user's viewport)
- Comments/annotations: click anywhere to leave a threaded comment
- Version history with visual diffing (show what changed between snapshots)
- Room/session management: create, join, leave rooms with shareable room codes

### R6. UI/UX Polish

- Professional, modern UI that feels native on macOS (primary target)
- Keyboard shortcuts for all major actions (draw, select, pan, zoom, undo/redo, delete, duplicate, copy/paste)
- Command palette (Cmd+K) for quick actions and search
- Undo/redo with full history stack
- Export to PNG, SVG, and JSON
- Import from JSON (and ideally from Excalidraw .excalidraw files)
- Smooth 60fps interactions — canvas operations should not stutter
- Responsive toolbar and panels (collapsible sidebars, floating tool palette)

### R7. Persistence & Local-First Architecture

- All data persisted locally first (SQLite via Tauri, or filesystem JSON)
- Boards auto-save continuously
- Offline-capable: full functionality without network; sync queues changes and reconciles when reconnected
- Board list/gallery on startup showing recent boards with thumbnails

## Acceptance Criteria

### Canvas & Drawing
- [ ] Application launches via `cargo tauri dev` (or equivalent) and renders an interactive infinite canvas
- [ ] At least 6 distinct shape tools work correctly (rectangle, circle, line, arrow, text, freehand)
- [ ] Objects can be selected, moved, resized, deleted, grouped, and ungrouped
- [ ] Zoom (scroll + pinch) and pan (space+drag or middle-click) work smoothly
- [ ] Undo/redo correctly reverses and replays at least 20 sequential operations
- [ ] Dark mode and light mode both render correctly

### Code Execution
- [ ] A code snippet block can be placed on the canvas with visible syntax highlighting
- [ ] Clicking "Run" on a JavaScript snippet produces correct stdout output displayed inline
- [ ] Clicking "Run" on a Python snippet produces correct stdout output displayed inline
- [ ] Code execution has a visible timeout (≤30s) and does not crash the app on infinite loops
- [ ] At least 4 languages show correct syntax highlighting

### Sync Protocol
- [ ] Two instances of the app connected to the same room see each other's drawing operations in real-time (< 500ms latency on localhost)
- [ ] The custom message protocol uses timestamped, client-identified messages matching the specified JSON shape
- [ ] Disconnecting and reconnecting a client correctly syncs missed operations
- [ ] Concurrent edits to the same object by two clients resolve without data loss or corruption
- [ ] The sync server can be started and accepts WebSocket connections

### Developer Templates
- [ ] At least 4 distinct developer template categories are available in a template panel/menu
- [ ] Dragging a database table template onto the canvas produces a functional, editable table block with columns and types
- [ ] Template blocks are visually distinct, professionally designed, and integrate naturally with the canvas

### Collaboration
- [ ] Two connected clients see each other's cursor positions in real-time
- [ ] A presence indicator shows connected users with names/colors
- [ ] Room creation and joining via room code works correctly

### UI/UX
- [ ] Cmd+K opens a command palette with searchable actions
- [ ] At least 10 keyboard shortcuts are functional
- [ ] Export to PNG produces a valid image file containing the canvas content
- [ ] The UI uses professional typography, consistent spacing, and polished visual design

### Persistence
- [ ] Closing and reopening the app restores the last board state
- [ ] Board data is stored locally (verifiable by checking local filesystem/database)
- [ ] Creating a new board and switching between boards works correctly

## Verification Plan

### Automated
- Run `cargo tauri dev` and verify the app window opens without errors
- Run the sync server and connect two app instances to verify real-time sync
- Execute code snippets in at least 2 languages and verify output correctness
- Verify persistence by creating objects, quitting, and relaunching

### Manual (by user)
- Visual inspection of UI polish, template quality, and overall interaction feel
- Stress-test canvas with 100+ objects to verify performance
- Test offline → reconnect sync flow
