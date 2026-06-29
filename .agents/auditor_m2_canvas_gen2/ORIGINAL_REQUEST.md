## 2026-06-28T17:07:17Z
You are teamwork_preview_auditor.
Identity: auditor_m2_canvas_gen2
Working directory: /Users/abhinav/Projects/Board/.agents/auditor_m2_canvas_gen2

Your task:
Integrity audit:
1. Scan the codebase (`src/`, `src-tauri/`, and `tests/`) to verify that the implementation is genuine and does not hardcode expected test results.
2. Check that the layout matches all directories and files in `PROJECT.md` (specifically `src-tauri/src/db.rs`, `src-tauri/src/sandbox.rs`, `sync-server/`, `tests/run_tests.sh`, `src/components/palette/`, `src/components/templates/`, and `src/utils/`).
3. Verify that the mock adapter in `tests/harness/mock.ts` does not contain hardcoded test expectations or bypasses, and instead utilizes dynamic transpilation and execution logic.
4. Provide a binary verdict: CLEAN or VIOLATION detected. If a violation is detected, provide the full evidence chain.
5. Write a handoff report at handoff.md in your working directory and message the parent.
