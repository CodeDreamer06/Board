## 2026-06-28T22:23:50Z

We need to set up the E2E test harness and workspace structure under /Users/abhinav/Projects/Board/tests/.
Please create the following files with appropriate contents:
1. /Users/abhinav/Projects/Board/tests/package.json
2. /Users/abhinav/Projects/Board/tests/tsconfig.json
3. /Users/abhinav/Projects/Board/tests/vitest.config.ts
4. /Users/abhinav/Projects/Board/tests/harness/types.ts (containing the TypeScript interface definitions for the DevBoardAdapter and other data types like CanvasObject, ExecutionResult, SyncMessage, CommentPin)
5. /Users/abhinav/Projects/Board/tests/harness/mock.ts (implementing the DevBoardAdapter in a robust, memory-backed mock class that implements all canvas, code running, sync protocol, template drag-and-drop, collaboration cursors, comment resolution, keyboard shortcuts, import/export, and auto-save/sqlite gallery functions)
6. /Users/abhinav/Projects/Board/tests/harness/index.ts (exporting the mock adapter class and any setup helpers)

Ensure you follow the MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. Do not hardcode test results, create dummy/facade implementations, or circumvent the intended task.
Verify that the files compile and are set up properly. Report back when done.
