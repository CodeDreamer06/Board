## 2026-06-28T17:03:22Z
You are teamwork_preview_worker.
Identity: worker_remediation
Working directory: /Users/abhinav/Projects/Board/.agents/worker_m2_remediation

Your task:
Implement the remediation plan in /Users/abhinav/Projects/Board to resolve layout compliance issues, clean up the mock adapter integrity issues, and test the production canvas code directly.

1. **Layout Compliance & Skeletons**:
   Create the missing files and folders required by `PROJECT.md` so that the project directory structure compiles and satisfies layout validation:
   - Create `src-tauri/src/db.rs` with the Rust SQLite database interfaces skeleton. Add `rusqlite = { version = "0.29.0", features = ["bundled"] }` to `src-tauri/Cargo.toml`.
   - Create `src-tauri/src/sandbox.rs` with the Rust sandboxed code runner interfaces skeleton.
   - Register modules in `src-tauri/src/main.rs`: `mod db; mod sandbox;` so they compile.
   - Create `sync-server/` folder and initialize `package.json` and `src/index.ts` with a basic TypeScript WebSocket relay server structure.
   - Create empty placeholder directories/files for the remaining missing paths:
     - `src/components/palette/CommandPalette.tsx` (a simple React component skeleton)
     - `src/components/templates/TemplatePanel.tsx` (a simple React component skeleton)
     - `src/utils/vectorClock.ts` (helper functions to merge and increment clocks)
     - `src/utils/syncClient.ts` (WebSocket synchronization client skeleton)
     - `tests/run_tests.sh` (a simple bash script skeleton that runs `cd tests && npm run test`)

2. **Clean up Mock Adapter**:
   - In `tests/harness/mock.ts`, remove all hardcoded code execution input checks (e.g., checks for `'fib('` or `'create table'`) from `executeCodeSnippet`.
   - Make the mock adapter return a generic or simulated output that does not rely on hardcoding specific test suite query inputs.

3. **Direct Canvas Hook Unit Testing**:
   - Write a unit/integration test file `tests/e2e/useCanvasState.test.tsx` (or inside `tests/e2e/canvas.test.ts` or as a new file) that directly tests the custom state hook `useCanvasState` / `useCanvas` context to ensure the actual code under `src/` is tested.
   - If JSDOM is needed, add `"jsdom": "^24.0.0"` and `"@testing-library/react": "^14.1.2"` to `tests/package.json` under `devDependencies` (and run `npm install` inside `tests/` directory).
   - In `tests/vitest.config.ts`, verify that `vitest` config compiles and runs tsx files, and set `environment` to `jsdom` if running DOM-based tests (or use `@vitest-environment jsdom` directive in the test file).
   - If `npm install` fails due to network limitations, write pure TS/JS tests for `useCanvasState` that mock `useState` or test the hook logic directly without DOM mounting (for example, mock `useState` React behavior or test hook functions directly).

4. **Verify Verification Command Execution**:
   - Ensure the project builds successfully with `npm run build` and `cargo check`.
   - Run the E2E tests and hook tests to ensure they all compile and pass.
   - Update your progress.md.
   - Write a handoff report at handoff.md in your working directory and message the parent with the results.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
