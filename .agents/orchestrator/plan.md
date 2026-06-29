# DevBoard Development Plan

This document outlines the orchestration plan for building DevBoard, a local-first collaborative developer whiteboard app using Tauri + Vite + TS.

## Orchestration Strategy
We are using the **Project Pattern**, consisting of:
1. **Implementation Track**: Executes sequential milestones for feature development (Canvas, Sync, Code Blocks, Templates, Collaboration, Persistence, Final Integration).
2. **E2E Testing Track**: Build and run an independent, opaque-box E2E test suite (Tiers 1-4) to verify DevBoard against requirements.

## Logical Milestones

### Milestone 1: Canvas & Drawing Engine (R1)
- **Objective**: Build an infinite canvas with basic shapes, pan/zoom, undo/redo (>=20 operations), select/move/resize, and dark/light modes.
- **Verification**: UI loads, shapes render, actions execute.

### Milestone 2: Custom Sync Protocol & Server (R3)
- **Objective**: Implement a WebSocket-based sync server (embedded in Tauri or standalone) with vector clocks, causality ordering, and conflict resolution (LWW).
- **Verification**: Multiple clients can join a room and sync drawing operations.

### Milestone 3: Code Snippet Blocks (R2)
- **Objective**: Create code blocks on the canvas supporting syntax highlighting for >=4 languages, and sandboxed run execution (JS/TS, Python, Shell) with resource limits & timeouts.
- **Verification**: Running valid code displays stdout, infinite loops timeout without crashing.

### Milestone 4: Developer Templates & Smart Blocks (R4)
- **Objective**: Drag-and-drop templates for database diagrams, networking/architecture, sequence diagrams, flowcharts, API endpoints, git branch, state machines, and kanban board.
- **Verification**: Table shapes are editable and functional; other templates render properly.

### Milestone 5: Collaboration Features (R5)
- **Objective**: Real-time cursor presence, selection awareness, follow viewport, rooms, and threaded comments.
- **Verification**: Multi-user cursor tracking and comments persist.

### Milestone 6: Persistence & Local-First (R7)
- **Objective**: SQLite/filesystem auto-save, offline-first queuing, room list gallery on startup.
- **Verification**: Reloading the app restores last state; modifications occur locally.

### Milestone 7: UI/UX Polish & E2E Validation (R6, Acceptance)
- **Objective**: modern macOS-like feel, command palette (Cmd+K), keyboard shortcuts (>=10), import/export SVG/PNG/JSON, 60fps interaction.
- **Verification**: 100% E2E test pass (Tiers 1-4) and adversarial testing (Tier 5).

## Task Board & Current Phase
- **Phase 1: Project Setup & Testing Foundation** (Active)
- **Phase 2: Core Feature Implementation**
- **Phase 3: E2E Integration and Adversarial Hardening**
