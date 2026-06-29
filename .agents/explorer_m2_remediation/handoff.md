# Forensic Audit & Code Review Remediation Plan

## 1. Observation

### Codebase Audits & Discovered Path Mapping
Through folder structure analysis, we observed that the core React canvas engine and customization hooks are situated at the following locations:
- Canvas React Component: `src/components/canvas/Canvas.tsx`
- Floating Toolbar Component: `src/components/toolbar/Toolbar.tsx`
- Core Custom State Hook: `src/hooks/useCanvasState.tsx`
- Shared Canvas Types: `src/types/canvas.ts`

### Missing Layout Files
We confirmed that the following directories and files required by `PROJECT.md` are missing:
- `src-tauri/src/db.rs`
- `src-tauri/src/sandbox.rs`
- `sync-server/`
- `src/components/palette/`
- `src/components/templates/`
- `src/utils/`

### Decoupled Testing & Mock Adapter Hardcoding
The existing E2E test suite does not mount or interact with any files under `src/`. All tests in `tests/e2e/` instantiate `MockDevBoardAdapter` from `tests/harness/mock.ts`. For example, in `tests/e2e/canvas.test.ts`:
```typescript
import { MockDevBoardAdapter } from '../harness';
...
it('test_canvas_launch_and_render', async () => {
  const adapter = new MockDevBoardAdapter();
  expect(adapter).toBeDefined();
  ...
});
```
Inside `tests/harness/mock.ts`, the mock adapter intercepts specific inputs in `executeCodeSnippet` and returns hardcoded mock outputs:
```typescript
// 6. Fibonacci calculation
if (trimmed.includes('fib(') || trimmed.includes('fibonacci')) {
  return {
    stdout: '0, 1, 1, 2, 3, 5, 8, 13, 21, 34\n',
    stderr: '',
    exit_code: 0,
    elapsed_ms: 12
  };
}

// 8. SQL query simulation
if (trimmed.toLowerCase().includes('create table') || trimmed.toLowerCase().includes('select')) {
  return {
    stdout: 'Table users created successfully.\nTable orders created successfully.\nTable order_items created successfully.\nRows affected: 3\n',
    stderr: '',
    exit_code: 0,
    elapsed_ms: 30
  };
}
```
Furthermore, the test configuration file `tests/vitest.config.ts` runs in a Node-only environment, without DOM simulation:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['e2e/**/*.test.ts'],
  },
});
```

---

## 2. Logic Chain

1. **Untested Canvas Engine**: E2E tests only interact with the in-memory TS mock variable structure in `MockDevBoardAdapter`. Because the tests never mount or call the React hook `useCanvasState` or render `Canvas.tsx`, any bug or crash in the canvas UI rendering loop, event hook propagation, or group coordinate calculations would completely bypass the test suite and pass undetected.
2. **Hardcoded Test Results (Integrity Violation)**: Checking input content for specific patterns (like `'fib('` or `'create table'`) to return pre-baked outputs simulates a facade that passes tests without executing code.
3. **Decoupling UI Testing**: To test the real React drawing and hook logic in Vitest, we need a DOM simulation environment (`jsdom` or `happy-dom`) and React testing utilities (`@testing-library/react`). By adding these dependencies, we can directly mount the state hook and verify shapes manipulation, selections, zoom limits, grouping operations, and undo/redo stacks.
4. **Mock Adapter Cleanup**: The mock adapter should serve purely as a test-double for UI layout tests (e.g. testing offline UI flags) and should not include regex-patterned execution simulators. Deferring actual execution to the Tauri Rust sandbox and local sqlite database ensures the implementation is genuine.

---

## 3. Caveats

- **Read-Only Network Mode**: We are operating in `CODE_ONLY` network mode, preventing package installation (`npm install jsdom`) or Rust crate builds during this planning phase.
- **Tauri Platform Specifics**: The sandboxing module (`sandbox.rs`) on macOS or Linux requires different process management mechanisms (e.g., `setrlimit` or cgroups) compared to Windows. Skeletal Rust files must remain abstract enough to support cross-compilation.

---

## 4. Conclusion & Actionable Remediation Plan

We propose a three-phase remediation plan to be executed by the implementer.

### Phase 1: Layout Compliance & Skeletons

#### 1. Rust Tauri Database (`src-tauri/src/db.rs`)
Implement a standard Rust skeleton mapping all local board persistence methods. We will add `rusqlite = { version = "0.29.0", features = ["bundled"] }` to `src-tauri/Cargo.toml`.
```rust
use rusqlite::{Connection, Result};
use serde::{Serialize, Deserialize};

pub struct DbState {
    pub conn_path: String,
}

#[derive(Serialize, Deserialize)]
pub struct BoardMetadata {
    pub id: String,
    pub name: String,
    pub updated_at: i64,
    pub shape_count: usize,
}

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS boards (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS shapes (
            id TEXT PRIMARY KEY,
            board_id TEXT NOT NULL,
            data TEXT NOT NULL,
            FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn create_board(state: tauri::State<'_, DbState>, name: String) -> Result<String, String> {
    // Skeletal placeholder returning generated board ID
    Ok(format!("board_{}", uuid::Uuid::new_v4()))
}
```

#### 2. Rust Tauri Code Execution Sandbox (`src-tauri/src/sandbox.rs`)
Implement process-level sandbox execution with strict timeouts.
```rust
use std::process::{Command, Stdio};
use std::time::{Instant, Duration};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct ExecutionResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub elapsed_ms: u64,
}

#[tauri::command]
pub async fn execute_code(language: String, code: String) -> Result<ExecutionResult, String> {
    let start = Instant::now();
    
    // Propose executing temporary file scripts in Node or Python child process with a timeout
    let mut child = Command::new(&language)
        .arg("-c")
        .arg(&code)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    // Implement monitoring thread to enforce <=30s timeout and kill child process if exceeded
    
    Ok(ExecutionResult {
        stdout: String::new(),
        stderr: String::new(),
        exit_code: 0,
        elapsed_ms: start.elapsed().as_millis() as u64,
    })
}
```

#### 3. Standalone WebSocket Sync Server (`sync-server/`)
Create a compliant Node.js TypeScript project.
- Create `sync-server/package.json` importing `ws` and `typescript`.
- Create `sync-server/src/index.ts`:
```typescript
import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const roomId = url.searchParams.get('roomId');
  
  if (roomId) {
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId)!.add(ws);
  }

  ws.on('message', (message) => {
    // Relay SyncMessage payload to other room participants
    const clients = rooms.get(roomId || '');
    if (clients) {
      clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });

  ws.on('close', () => {
    if (roomId && rooms.has(roomId)) {
      rooms.get(roomId)!.delete(ws);
    }
  });
});
```

#### 4. Frontend Component/Utility Skeletons
- `src/components/palette/CommandPalette.tsx`: Add a Vite-compliant modal UI component supporting keyboard Cmd+K toggles.
- `src/components/templates/TemplatePanel.tsx`: Sidebar template UI containing table, sequence diagram, and flowchart shapes metadata.
- `src/utils/vectorClock.ts`: Clock synchronization helpers.
```typescript
export function incrementClock(clock: Record<string, number>, clientId: string): Record<string, number> {
  const next = { ...clock };
  next[clientId] = (next[clientId] || 0) + 1;
  return next;
}
export function mergeClocks(local: Record<string, number>, remote: Record<string, number>): Record<string, number> {
  const merged = { ...local };
  for (const [k, v] of Object.entries(remote)) {
    merged[k] = Math.max(merged[k] || 0, v);
  }
  return merged;
}
```
- `src/utils/syncClient.ts`: Core WebSocket adapter client supporting reconnect backoffs and offline batch queues.

---

### Phase 2: UI Canvas State Testing Integration

To test the actual Canvas components/hooks, we will write a unit/integration test suite that executes inside a simulated DOM environment in Vitest.

1. **Install DOM Dependencies**:
   Propose adding `"jsdom": "^24.0.0"` and `"@testing-library/react": "^14.1.2"` to the `devDependencies` of `tests/package.json`.
2. **Vitest Config update (`tests/vitest.config.ts`)**:
   Add support for `.tsx` extension files and conditional test environments (Node for E2E tests, JSDOM for hook unit tests).
3. **Hook Unit Test (`tests/e2e/useCanvasState.test.tsx`)**:
   Create a test targeting the custom state hook directly. We render a Test Harness component using `@testing-library/react` inside `<CanvasProvider>` to verify behavior:
```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CanvasProvider, useCanvas } from '../../src/hooks/useCanvasState';

// Helper component to capture hook context
const HookHarness = ({ callback }: { callback: (hook: any) => void }) => {
  const hook = useCanvas();
  callback(hook);
  return null;
};

describe('useCanvasState React Hook Integration Tests', () => {
  it('verifies shape creation, selection, and history tracking', () => {
    let hook: any = null;
    render(
      <CanvasProvider>
        <HookHarness callback={(h) => { hook = h; }} />
      </CanvasProvider>
    );

    expect(hook.shapes).toHaveLength(0);
    expect(hook.canUndo).toBe(false);

    // 1. Create shape
    const shapeId = hook.addShape({
      type: 'rectangle',
      x: 10,
      y: 15,
      width: 100,
      height: 100,
      color: '#ff0000',
      fillColor: 'transparent',
      strokeWidth: 2
    });

    expect(hook.shapes).toHaveLength(1);
    expect(hook.shapes[0].id).toBe(shapeId);
    expect(hook.canUndo).toBe(true);

    // 2. Select shape
    hook.setSelectedIds([shapeId]);
    expect(hook.selectedIds).toEqual([shapeId]);

    // 3. Undo operation
    hook.undo();
    expect(hook.shapes).toHaveLength(0);
    expect(hook.canRedo).toBe(true);

    // 4. Redo operation
    hook.redo();
    expect(hook.shapes).toHaveLength(1);
  });

  it('verifies shape grouping and ungrouping', () => {
    let hook: any = null;
    render(
      <CanvasProvider>
        <HookHarness callback={(h) => { hook = h; }} />
      </CanvasProvider>
    );

    const s1 = hook.addShape({ type: 'rectangle', x: 0, y: 0, width: 50, height: 50, color: '#000', fillColor: '' });
    const s2 = hook.addShape({ type: 'circle', x: 20, y: 20, width: 50, height: 50, color: '#000', fillColor: '' });

    // Grouping
    hook.setSelectedIds([s1, s2]);
    hook.groupSelected();

    expect(hook.shapes[0].groupId).toBeDefined();
    expect(hook.shapes[0].groupId).toBe(hook.shapes[1].groupId);

    // Ungrouping
    hook.ungroupSelected();
    expect(hook.shapes[0].groupId).toBeUndefined();
    expect(hook.shapes[1].groupId).toBeUndefined();
  });
});
```
*(Configure `// @vitest-environment jsdom` at the top of this file to run it in JSDOM, isolating it from Node E2E tests).*

---

### Phase 3: Clean up `MockDevBoardAdapter`

1. **Remove hardcoded regexes**: Remove conditional string checks (like `.includes('fib(')`) from `executeCodeSnippet`.
2. **Explicit mock state configuration**: Add flags such as `simulateTimeout`, `simulateSyntaxError`, and `simulateResourceLimit` to the adapter.
3. **Decouple production**: Implement a production adapter `TauriDevBoardAdapter` (using real Tauri IPC endpoints) so that E2E integration tests can be run against either the mock environment (mock adapter) or the real app (tauri adapter).

---

## 5. Verification Method

To verify layouts and confirm tests pass:
1. Run layout lint checks to ensure all directories (`sync-server/`, `src/utils/`, etc.) exist and compile successfully.
2. Run Vitest verification:
   `cd tests && npm run test`
   Ensure both Node E2E tests and JSDOM hook tests run and exit with code 0.
3. **Invalidation conditions**:
   - The test runner fails to compile or fails with exit code > 0.
   - Files are added directly inside `.agents/` other than plan/handoff/progress markdown metadata.
