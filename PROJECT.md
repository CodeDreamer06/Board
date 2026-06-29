# Project: DevBoard

DevBoard is a local-first collaborative developer whiteboard application built with Tauri (Rust backend), Vite, and TypeScript/React (frontend). It enables programmers to draw diagrams, run code snippets in a sandbox, collaborate in real-time, and save their work locally first.

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                      Tauri App                         │
│                                                        │
│  ┌───────────────────────┐     ┌────────────────────┐  │
│  │   Vite + TS + React   │     │    Tauri Rust      │  │
│  │       Frontend        │◄───►│      Backend       │  │
│  │                       │     │                    │  │
│  │   ┌───────────────┐   │     │  ┌──────────────┐  │  │
│  │   │  Canvas/UI    │   │     │  │ SQLite DB /  │  │  │
│  │   └───────────────┘   │     │  │ File Storage │  │  │
│  │   ┌───────────────┐   │     │  └──────────────┘  │  │
│  │   │ Sync Client   │   │     │  ┌──────────────┐  │  │
│  │   └───────────────┘   │     │  │ Sandboxed    │  │  │
│  │                       │     │  │ Execution    │  │  │
│  └───────────────────────┘     │  └──────────────┘  │  │
└────────────────────────────────┼───────────────────────┘
                                 │ WebSocket
                                 ▼
                     ┌───────────────────────┐
                     │ Custom Sync Server    │
                     │ (WebSocket Relay)     │
                     └───────────────────────┘
```

### Components:
1. **Frontend Canvas & Drawing Engine**: A React-based canvas using HTML5 Canvas or SVG for smooth 60fps rendering, supporting freehand, shapes, and complex selections.
2. **Tauri Backend**: Orchestrates code snippet sandboxing, local SQLite database storage, and file imports/exports.
3. **Collaboration Sync Server**: A lightweight, standalone WebSocket server (in Rust or Node.js) that relays synchronization messages, causal clocks, and room presence.
4. **Sandboxed Runner**: Rust backend executes code snippets inside temporary scripts with strict OS resource limitations, stdout/stderr capture, and timeouts.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Setup & E2E Test Infra | Initialize Tauri project, create E2E test runner, define test categories | None | DONE |
| 2 | Canvas & Drawing Engine | Infinite canvas, 6 shape tools, select/move/resize, pan/zoom, undo/redo (>=20), themes | M1 | PLANNED |
| 3 | Custom Sync Protocol | WebSocket client/server, causality (vector clocks), conflict resolution (LWW), reconn | M1 | PLANNED |
| 4 | Sandboxed Code Blocks | Canvas code blocks, syntax highlighting (4+ lang), sandboxed run with <=30s timeouts | M2 | PLANNED |
| 5 | Developer Templates | Tables/DB, Networking, Sequence, Flowcharts, APIs, State machines, Git, Kanban | M2 | PLANNED |
| 6 | Collaboration Features | Cursor presence, selection highlights, presence bar, viewport follow, comments | M3, M5 | PLANNED |
| 7 | Persistence & Local-First | Auto-save, SQLite/filesystem store, offline queues, board gallery | M2 | PLANNED |
| 8 | E2E Integration & Polish | Cmd+K palette, keyboard shortcuts, import/export SVG/PNG/JSON, final E2E test verification | M2, M3, M4, M5, M6, M7 | PLANNED |

## Interface Contracts

### 1. Drawing Sync Message Structure
Clients and the Sync Server communicate via WebSocket with JSON payloads:
```typescript
interface SyncMessage {
  type: 'draw' | 'cursor' | 'presence' | 'comment';
  clientId: string;
  roomId: string;
  objectId?: string;
  timestamp: number;
  vectorClock: Record<string, number>;
  payload: any;
}
```

### 2. Code Execution Command (Tauri IPC)
```rust
#[tauri::command]
async fn execute_code(language: String, code: String) -> Result<ExecutionResult, String>;

struct ExecutionResult {
  stdout: String,
  stderr: String,
  exit_code: i32,
  elapsed_ms: u64,
}
```

## Code Layout

```
.
├── Cargo.toml                  # Cargo workspace configuration (optional)
├── package.json                # Frontend package dependencies
├── vite.config.ts              # Vite configuration
├── src/                        # Frontend source code
│   ├── main.tsx                # Frontend entrypoint
│   ├── index.css               # Global styles (Tailwind CSS)
│   ├── components/             # React UI components
│   │   ├── canvas/             # Canvas rendering logic
│   │   ├── toolbar/            # Floating tool palettes
│   │   ├── palette/            # Command palette and search
│   │   └── templates/          # Developer smart templates
│   ├── hooks/                  # React custom hooks (e.g. useCanvasState)
│   ├── types/                  # Shared TS typings
│   └── utils/                  # Sync clients, math helpers
├── src-tauri/                  # Tauri backend source code
│   ├── Cargo.toml              # Rust backend dependencies
│   ├── tauri.conf.json         # Tauri settings
│   └── src/
│       ├── main.rs             # Tauri entrypoint
│       ├── db.rs               # Local SQLite database logic
│       └── sandbox.rs          # Sandboxed child process execution
├── sync-server/                # Standalone WebSocket server
│   ├── src/                    # Sync server source (Rust or Node.js)
│   └── package.json / Cargo.toml
└── tests/                      # E2E and integration tests
    ├── e2e/                    # Opaque-box test suites (Tiers 1-4)
    └── run_tests.sh            # E2E test runner
```
