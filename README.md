<div align="center">

# ⚡ DevBoard

**The collaborative whiteboard built for developers.**

Code snippets that run. Database diagrams that connect. Architecture that comes alive.

[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-Backend-000000?style=flat-square&logo=rust&logoColor=white)](https://rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

[Features](#-features) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [Shortcuts](#-keyboard-shortcuts) · [Contributing](#-contributing)

</div>

---

## Why DevBoard?

Every developer has drawn architecture diagrams on whiteboards. But whiteboards can't run code. And coding tools can't draw diagrams.

**DevBoard bridges that gap.** It's a local-first, real-time collaborative canvas where you can sketch system architecture, drop in runnable code blocks, map out database schemas, design API flows — and share it all with your team over a custom-built sync protocol.

Think **Excalidraw meets VS Code**, built with **Tauri + Rust** for native performance.

---

## ✨ Features

### 🖥️ Runnable Code Blocks
Drop code blocks directly onto the canvas. Write code, hit **Run**, and see output inline — powered by a Rust sandbox that executes in a child process with a 30-second timeout.

**Supported languages:** JavaScript · TypeScript · Python · Rust · Go · C · C++ · Shell

### 📐 Developer-First Templates
31 templates across 8 categories, purpose-built for software engineering:

| Category | Templates |
|----------|-----------|
| **Database** | Users, Products, Orders tables with PK/FK indicators |
| **Architecture** | Server, Database, Load Balancer, Queue, Cache, CDN, Firewall |
| **Flowchart** | Start, Process, Decision, End nodes |
| **API** | GET, POST, PUT, DELETE endpoint cards |
| **State Machine** | State nodes with entry/exit actions |
| **Git** | Commit nodes with hash, message, branch |
| **Code** | JavaScript, Python, Rust, SQL snippets |
| **Kanban** | Task cards with priority, assignee, status |

### 🔄 Custom Sync Protocol
Real-time collaboration built from scratch — no Firebase, no third-party dependencies:

- **WebSocket relay server** with room-based isolation
- **Vector clocks** for causal ordering
- **Last-Writer-Wins** conflict resolution with operation log
- **Exponential backoff reconnection** (1s → 30s, ±20% jitter)
- **Offline queue** — edits buffer locally and flush on reconnect
- **Presence tracking** with auto-assigned colors and heartbeat timeout
- **6-character room codes** for easy sharing

### ⌨️ Command Palette & Shortcuts
`⌘K` opens a VS Code-style command palette with **26 commands** and fuzzy search. Plus **20+ keyboard shortcuts** for zero-friction workflows.

### 🎨 Canvas Engine
Built on HTML5 Canvas with:
- Infinite pan & zoom with smooth scrolling
- Alignment guides and snap-to-grid
- Multi-select with drag-box selection
- Resize handles on all 8 points
- Minimap for orientation
- Shape grouping/ungrouping and layering
- Full undo/redo history

### 💾 Local-First Persistence
All data lives on your machine in SQLite (`~/.devboard/devboard.db`). No cloud accounts, no subscriptions, no data leaving your device.

### 🌙 Dark Mode
Dark mode by default. Because developers.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://rustup.rs/) (for the Tauri backend)
- A C compiler (Xcode CLI tools on macOS, build-essential on Linux)

### Run the Frontend (Browser Mode)

```bash
git clone https://github.com/CodeDreamer06/Board.git
cd Board
npm install
npm run dev
```

Open [http://localhost:1420](http://localhost:1420). You get the full canvas, templates, and collaboration — code execution requires the desktop app.

### Run the Sync Server (for collaboration)

```bash
cd sync-server
npm install
npm run dev
```

The sync server starts on `ws://localhost:8080`. Open multiple browser tabs and create/join rooms to collaborate.

### Run the Full Desktop App (with code execution)

```bash
# From the project root
cargo tauri dev
```

This starts both the Vite dev server and the Tauri Rust backend. Code blocks can now execute via sandboxed child processes.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   DevBoard App                   │
│                                                  │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │   Toolbar     │  │    HTML5 Canvas         │   │
│  │   Templates   │  │    (shapes, rendering,  │   │
│  │   Palette     │  │     interactions)       │   │
│  └──────────────┘  └────────────────────────┘   │
│          │                     │                  │
│  ┌───────┴─────────────────────┴──────────┐     │
│  │        React + TypeScript + Tailwind    │     │
│  │        useCanvasState (context)         │     │
│  │        useCollaboration (hook)          │     │
│  └─────────┬───────────────────┬──────────┘     │
│            │                   │                  │
│     ┌──────┴──────┐    ┌──────┴──────┐          │
│     │  Tauri IPC   │    │  WebSocket  │          │
│     │  (invoke)    │    │  Client     │          │
│     └──────┬──────┘    └──────┬──────┘          │
└────────────┼───────────────────┼─────────────────┘
             │                   │
    ┌────────┴────────┐  ┌──────┴──────────┐
    │  Rust Backend   │  │  Sync Server    │
    │                 │  │  (Node.js)      │
    │  • sandbox.rs   │  │                 │
    │    (code exec)  │  │  • Op log       │
    │  • db.rs        │  │  • Room mgmt   │
    │    (SQLite)     │  │  • Presence     │
    │  • main.rs      │  │  • Conflict     │
    │    (IPC cmds)   │  │    resolution   │
    └─────────────────┘  └─────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript 5, Tailwind CSS 3.4, Vite 5 |
| Canvas | HTML5 Canvas API (custom renderer, no library) |
| Desktop | Tauri 1.6 (Rust) |
| Persistence | SQLite via rusqlite |
| Code Execution | Rust child process sandbox with timeout |
| Sync Server | Node.js + `ws` WebSocket library |
| Sync Protocol | Custom — vector clocks, LWW, operation log |
| Icons | Lucide React |

---

## ⌨️ Keyboard Shortcuts

### Tools
| Key | Action |
|-----|--------|
| `V` | Select |
| `R` | Rectangle |
| `O` | Circle / Ellipse |
| `L` | Line |
| `A` | Arrow |
| `T` | Text |
| `S` | Sticky Note |
| `D` | Freehand Draw |
| `C` | Connector |
| `K` | Add Code Block |

### Actions
| Shortcut | Action |
|----------|--------|
| `⌘K` | Command Palette |
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |
| `⌘D` | Duplicate |
| `⌘A` | Select All |
| `⌘G` | Group |
| `⌘⇧G` | Ungroup |
| `⌘]` | Bring to Front |
| `⌘[` | Send to Back |
| `⌘=` | Zoom In |
| `⌘-` | Zoom Out |
| `⌘0` | Reset Zoom |
| `Delete` | Delete Selected |
| `Escape` | Deselect / Select Tool |

---

## 📡 Sync Protocol

DevBoard uses a custom synchronization protocol built on WebSockets with causal consistency:

```json
{
  "type": "draw",
  "clientId": "client_a1b2c3d4",
  "roomId": "XKCD42",
  "objectId": "shape-981",
  "timestamp": 1720000000,
  "vectorClock": { "client_a1b2c3d4": 5, "client_e5f6g7h8": 3 },
  "payload": {
    "action": "create",
    "shape": {
      "type": "rectangle",
      "x": 100, "y": 200,
      "width": 150, "height": 80,
      "color": "#3b82f6"
    }
  }
}
```

**Message types:** `draw` · `cursor` · `presence` · `comment` · `sync_request` · `sync_response` · `ack`

**Conflict resolution:** When concurrent edits target the same object (detected via vector clock comparison), the server applies Last-Writer-Wins using timestamp as the tiebreaker.

---

## 📁 Project Structure

```
Board/
├── src/                          # Frontend (React/TypeScript)
│   ├── App.tsx                   # Main app with all integrations
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── Canvas.tsx        # HTML5 Canvas renderer (1400+ lines)
│   │   │   └── ShapeRenderers.ts # Custom renderers for dev shapes
│   │   ├── codeblock/
│   │   │   └── CodeBlock.tsx     # Interactive code editor overlay
│   │   ├── collaboration/
│   │   │   ├── PresenceBar.tsx   # User avatars & connection status
│   │   │   ├── RemoteCursors.tsx # Other users' cursors
│   │   │   └── RoomManager.tsx   # Create/join room modal
│   │   ├── palette/
│   │   │   └── CommandPalette.tsx # ⌘K command palette
│   │   ├── templates/
│   │   │   └── TemplatePanel.tsx  # 31 developer templates
│   │   └── toolbar/
│   │       └── Toolbar.tsx        # Drawing tools & styling
│   ├── hooks/
│   │   ├── useCanvasState.tsx     # Central state management
│   │   ├── useCollaboration.ts    # Sync client React wrapper
│   │   └── useKeyboardShortcuts.ts
│   ├── types/
│   │   └── canvas.ts             # Shape types & interfaces
│   └── utils/
│       ├── syncClient.ts         # WebSocket client with reconnection
│       └── vectorClock.ts        # Causal ordering primitives
│
├── src-tauri/                    # Rust Backend (Tauri)
│   └── src/
│       ├── main.rs               # Tauri IPC command registration
│       ├── sandbox.rs            # Sandboxed code execution (8 langs)
│       └── db.rs                 # SQLite persistence
│
├── sync-server/                  # Collaboration Server (Node.js)
│   └── src/
│       └── index.ts              # WebSocket relay with rooms & presence
│
└── tests/                        # E2E test suite
    └── e2e/                      # 11 test files, 101 test cases
```

---

## 🤝 Contributing

Contributions are welcome! Here are some areas where help is needed:

- **New shape renderers** — AWS/GCP/Azure service icons, UML class diagrams
- **Language support** — add Ruby, Java, PHP to the code execution sandbox
- **Import/export** — Excalidraw JSON, Draw.io XML, Mermaid syntax
- **Accessibility** — keyboard-only canvas navigation, screen reader support
- **Performance** — WebGL renderer for large boards (1000+ shapes)

### Development Setup

```bash
# Install dependencies
npm install
cd sync-server && npm install && cd ..

# Run everything
npm run dev                    # Frontend (port 1420)
cd sync-server && npm run dev  # Sync server (port 8080)
cargo tauri dev                # Full desktop app
```

---

## 📄 License

MIT — use it, fork it, ship it.

---

<div align="center">

**Built with 🦀 Rust, ⚛️ React, and ☕ too much coffee.**

[Report Bug](https://github.com/CodeDreamer06/Board/issues) · [Request Feature](https://github.com/CodeDreamer06/Board/issues)

</div>
