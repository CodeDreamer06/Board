# E2E Test Infra: DevBoard

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise + Real-World Workload Testing.

## Feature Inventory

This section details all application features, maps them to their respective requirements (from `PROJECT.md` / `ORIGINAL_REQUEST.md`), and specifies the E2E test coverage across Tiers 1, 2, and 3.

---

### 1. Canvas & Drawing Engine
**Requirements Mapped:** R1 (Canvas & Drawing Engine), Canvas & Drawing Acceptance Criteria

#### Tier 1: Feature Coverage (10 tests)
1. `test_canvas_launch_and_render`: Verify the application launches successfully and renders an interactive, infinite canvas.
2. `test_draw_freehand`: Verify the freehand drawing tool creates a line/path object on the canvas.
3. `test_draw_rectangle`: Verify the rectangle tool creates a rectangle shape.
4. `test_draw_circle`: Verify the circle/ellipse tool creates a circular shape.
5. `test_draw_line_and_arrow`: Verify the line and arrow tools create connected and oriented line objects.
6. `test_draw_text`: Verify the text tool creates editable text label blocks on the canvas.
7. `test_object_selection_and_move`: Verify that drawn objects can be selected and dragged to different coordinates on the canvas.
8. `test_object_resize`: Verify that shapes can be resized using their bounding box corner/edge drag handles.
9. `test_object_deletion`: Verify that selected shapes/objects can be deleted using the delete action.
10. `test_undo_redo_stack`: Verify that undo and redo operations correctly step backward and forward through a stack of at least 20 operations.

#### Tier 2: Boundary & Corner Cases (8 tests)
1. `test_resize_to_negative_dimensions`: Verify that dragging a resize handle past the opposite boundary flips the shape coordinates or caps it gracefully.
2. `test_undo_empty_stack`: Verify that triggering undo when the history stack is empty does not crash the app or affect state.
3. `test_redo_empty_stack`: Verify that triggering redo when there are no undone actions does not crash the app or affect state.
4. `test_draw_offscreen`: Verify that drawing objects far outside the initial visible viewport bounds updates coordinates correctly without canvas failures.
5. `test_zoom_boundaries`: Verify that zooming is constrained within defined limits (e.g., minimum 10%, maximum 2000%) and ignores inputs outside this range.
6. `test_multi_select_delete`: Verify that multi-selecting multiple shapes and deleting them purges all selected objects simultaneously.
7. `test_text_rendering_empty`: Verify that creating a text label, leaving it empty, and clicking away automatically discards the empty label.
8. `test_theme_toggle_rendering`: Verify that switching between light and dark themes updates the canvas background and shape rendering colors.

---

### 2. Code Snippet Blocks
**Requirements Mapped:** R2 (Code Snippet Blocks), Code Execution Acceptance Criteria

#### Tier 1: Feature Coverage (6 tests)
1. `test_code_block_creation`: Verify a code snippet block can be dragged or created on the canvas.
2. `test_syntax_highlighting_js`: Verify JavaScript code inside the block displays appropriate syntax highlighting.
3. `test_syntax_highlighting_python`: Verify Python code inside the block displays appropriate syntax highlighting.
4. `test_run_js_snippet`: Verify clicking the "Run" button on a Node/JS block executes the script and outputs the correct stdout.
5. `test_run_python_snippet`: Verify clicking the "Run" button on a Python block executes the script and outputs the correct stdout.
6. `test_language_auto_detection`: Verify that pasting code snippet auto-detects the programming language and configures the editor mode.

#### Tier 2: Boundary & Corner Cases (6 tests)
1. `test_code_execution_timeout`: Verify that running an infinite loop script (e.g., `while True: pass`) terminates automatically within the timeout limit (<=30s) and keeps the client responsive.
2. `test_run_invalid_syntax`: Verify that running syntactically incorrect code returns a compiler/interpreter syntax error to stderr and shows it inline.
3. `test_sandbox_resource_limits`: Verify that scripts attempting to exceed resource caps (e.g. allocating excessive memory or opening massive subprocesses) are killed by the sandbox.
4. `test_execution_empty_code`: Verify that clicking "Run" on a code block containing zero code does not attempt execution and returns gracefully.
5. `test_large_output`: Verify that running code which prints a very large volume of output handles the data stream without crashing the UI, truncating or wrapping output nicely.
6. `test_concurrent_code_runs`: Verify that triggering execution on multiple code blocks on the canvas runs them concurrently in separate background processes without blocking UI rendering.

---

### 3. Custom Synchronization Protocol
**Requirements Mapped:** R3 (Custom Synchronization Protocol), Sync Protocol Acceptance Criteria

#### Tier 1: Feature Coverage (5 tests)
1. `test_sync_server_accepts_connections`: Verify that the standalone synchronization WebSocket server starts and accepts client connections.
2. `test_sync_message_format`: Verify that the JSON payloads exchanged conform strictly to the defined schema (type, clientId, roomId, objectId, timestamp, vectorClock, payload).
3. `test_realtime_draw_propagation`: Verify that drawing/modifying a shape on Client A propagates to Client B's screen in under 500ms on localhost.
4. `test_vector_clock_increment`: Verify that the local vector clock increments correctly upon local user actions and reconciles with peer vector clocks on incoming sync messages.
5. `test_disconnect_reconnect_sync`: Verify that disconnecting a client, making edits, and reconnecting the client successfully synchronizes the state and catches up on all missed operations.

#### Tier 2: Boundary & Corner Cases (6 tests)
1. `test_concurrent_edits_resolve_lww`: Verify that concurrent modifications to the same object by Client A and Client B are resolved consistently across both nodes using last-writer-wins with vector clocks.
2. `test_network_latency_compensation`: Verify that drawing operations are optimistically rendered on the local canvas immediately, and reconciled once the server sends a message acknowledgment.
3. `test_offline_operation_queueing`: Verify that actions performed while offline are queued locally in sequence, and successfully batched/replayed to the sync server upon reconnection.
4. `test_exponential_backoff_reconnect`: Verify that the client attempts automatic reconnection with exponential backoff if the synchronization server becomes unavailable.
5. `test_out_of_order_messages`: Verify that the client uses vector clocks or Lamport timestamps to correctly order updates even if WebSocket frames are received out of chronological order.
6. `test_corrupted_sync_payload`: Verify that receiving invalid or corrupt WebSocket data payloads is ignored gracefully and does not corrupt local canvas state.

---

### 4. Developer Diagram Templates & Smart Blocks
**Requirements Mapped:** R4 (Developer Diagram Templates & Smart Blocks), Developer Templates Acceptance Criteria

#### Tier 1: Feature Coverage (6 tests)
1. `test_template_panel_rendered`: Verify the template library panel displays categories for database diagrams, networking diagrams, sequence diagrams, and flowcharts.
2. `test_drag_database_table`: Verify dragging a database table template onto the canvas renders a table block with column inputs, type dropdowns, and key constraints.
3. `test_drag_network_node`: Verify dragging a network diagram template renders appropriate client, server, and database nodes on the canvas.
4. `test_drag_flowchart_shapes`: Verify dragging flowchart symbols (start/end terminal, decision diamond, process block) places them on the canvas.
5. `test_drag_api_card`: Verify dragging an API card template creates a block showing HTTP method badges (GET, POST, etc.) and paths.
6. `test_custom_template_save`: Verify that a user can select a custom group of canvas shapes and save it as a reusable custom template.

#### Tier 2: Boundary & Corner Cases (6 tests)
1. `test_db_table_column_edit`: Verify columns can be dynamically added, edited, or deleted from an active database diagram table block, updating its vertical height correctly.
2. `test_flowchart_connection_auto_routing`: Verify that connector arrows between flowchart process blocks auto-route and adjust their paths when shapes are moved around the canvas.
3. `test_git_branch_nodes`: Verify that adding commit nodes to the Git branch template correctly updates branch lines, labels, and merges.
4. `test_kanban_card_drag_drop`: Verify that Kanban task cards can be dragged and dropped between different columns, updating their board columns and coordinates.
5. `test_sequence_diagram_message_reorder`: Verify that reordering sequence diagram arrows/messages correctly re-flows the lifeline vertical layout.
6. `test_api_card_invalid_method`: Verify that entering an custom, non-standard HTTP method in the API card template handles input boundaries gracefully.

---

### 5. Collaboration Features
**Requirements Mapped:** R5 (Collaboration Features), Collaboration Acceptance Criteria

#### Tier 1: Feature Coverage (6 tests)
1. `test_cursor_presence`: Verify that Client A sees Client B's cursor moving in real-time, complete with Client B's name label and unique color.
2. `test_presence_bar_avatars`: Verify that the room presence bar renders the avatars or initials of all currently connected clients in the session.
3. `test_selection_awareness`: Verify that objects selected by Client A are visually highlighted as selected/locked on Client B's canvas.
4. `test_follow_mode_viewport`: Verify that enabling Follow Mode on Client A locks their viewport to Client B's view, panning and zooming in sync.
5. `test_threaded_comments_create`: Verify that clicking anywhere on the canvas adds a threaded comment pin where users can leave replies.
6. `test_room_creation_and_joining`: Verify that a user can generate a unique room code to create a room, and other users can enter the code to join.

#### Tier 2: Boundary & Corner Cases (6 tests)
1. `test_collaborator_sudden_disconnect`: Verify that if a collaborator suddenly disconnects (e.g. browser tab closed), their cursor, selection highlight, and presence avatar are immediately removed.
2. `test_overlapping_cursor_render`: Verify that rendering cursors for many concurrent users (e.g., 10+) operates smoothly at 60fps without text overlapping or visual glitches.
3. `test_visual_diffing_history`: Verify that comparing visual history snapshots highlights newly added elements in green and removed elements in red.
4. `test_thread_comments_resolved`: Verify that marking a threaded comment as resolved hides the pin from the active canvas, but retains it in the comments sidebar history.
5. `test_follow_loop_prevention`: Verify that if Client A follows Client B, and Client B tries to follow Client A, the application prevents or breaks the follow loop.
6. `test_stale_room_code_handling`: Verify that attempting to join with an expired, deleted, or invalid room code triggers a user-friendly error message.

---

### 6. UI/UX Polish
**Requirements Mapped:** R6 (UI/UX Polish), UI/UX Acceptance Criteria

#### Tier 1: Feature Coverage (6 tests)
1. `test_command_palette_open`: Verify that pressing Cmd+K (or Ctrl+K) opens the global command palette UI.
2. `test_command_palette_search`: Verify that searching for actions in the command palette filters list items and triggers the selected action.
3. `test_keyboard_shortcuts_major`: Verify at least 10 key bindings (select, pan, zoom, delete, copy, paste, undo, redo, group, ungroup) perform the designated canvas action.
4. `test_canvas_export_png`: Verify that triggering PNG export produces a valid image file containing the current canvas drawing.
5. `test_canvas_export_svg`: Verify that triggering SVG export produces a valid XML SVG format file representing the drawn paths.
6. `test_canvas_import_json`: Verify importing a JSON board file correctly parses the schema and renders the exact shapes onto the canvas.

#### Tier 2: Boundary & Corner Cases (6 tests)
1. `test_canvas_import_invalid_json`: Verify that importing a corrupted or malformed JSON schema does not crash the app, showing an import error popup.
2. `test_export_empty_canvas`: Verify exporting an empty canvas produces a clean JSON or image file without errors.
3. `test_keyboard_shortcuts_modifier_conflicts`: Verify that custom keyboard shortcuts do not conflict with or block critical native operating system/browser shortcut keys.
4. `test_command_palette_no_results`: Verify that entering a query with no matches in the command palette renders a clean "No results found" feedback state.
5. `test_canvas_high_dpi_scaling`: Verify that drawing components scale and render crisply on high-DPI (Retina) displays without blurriness.
6. `test_collapsed_sidebar_state`: Verify that collapsing sidebars/panels dynamically scales the main canvas workspace and updates bounding calculation boundaries.

---

### 7. Persistence & Local-First Architecture
**Requirements Mapped:** R7 (Persistence & Local-First Architecture), Persistence Acceptance Criteria

#### Tier 1: Feature Coverage (5 tests)
1. `test_auto_save_continuous`: Verify that modifications to the canvas auto-save continuously to the local SQLite database/filesystem within 1 second.
2. `test_local_persistence_restore`: Verify that quitting the application and relaunching it restores the exact board state of the last active board.
3. `test_board_gallery_render`: Verify that the startup dashboard loads a board gallery showcasing thumbnails and metadata of recent local boards.
4. `test_switch_boards`: Verify that clicking a board in the gallery correctly loads that board's state onto the canvas.
5. `test_create_new_board`: Verify that creating a new board initializes an empty canvas and appends a new entry to the gallery databases.

#### Tier 2: Boundary & Corner Cases (6 tests)
1. `test_persistence_disk_full`: Verify that if writing to local storage fails (e.g. disk full), the application alerts the user without corrupting the current memory state.
2. `test_offline_persistence_unreconciled`: Verify that offline-saved changes are not overwritten by stale server states upon reconnecting, prioritising the latest local clock edits.
3. `test_restore_corrupted_db`: Verify that if the local database file is corrupted, the application backs it up and loads a clean database file rather than crashing.
4. `test_concurrent_auto_saves`: Verify that when running multiple local app instances, database writes are coordinated without write locks crashing either instance.
5. `test_board_deletion_cascade`: Verify that deleting a board from the gallery purges all related shapes, layers, and synchronization queues from the database.
6. `test_persistence_large_payload`: Verify that saving and loading boards containing large numbers of shapes (5000+) finishes efficiently without locking the UI.

---

### Tier 3: Cross-Feature Combinations (8 tests)

1. `test_sync_collaborator_code_run`: Client A creates a Python code block and edits code, Client B runs the block, and both clients see the stdout execution result synced in real-time. (Crosses: Code Snippets + Sync + Collaboration).
2. `test_db_diagram_connector_sync`: Client A links two database tables with a connector line. Client B drags one table to a new location. Both clients see the table move and the auto-routed line adjust dynamically. (Crosses: Developer Templates + Canvas & Drawing + Sync).
3. `test_undo_code_execution_result`: A user runs a code block, shows output, then triggers Undo. The E2E test verifies that the history undo stack manages shape operations without corrupting code outputs. (Crosses: Canvas & Drawing + Code Snippets).
4. `test_copy_paste_template_across_rooms`: User A copies a custom database template block in Room A, connects to Room B, and pastes it. The template retains its columns and configuration. (Crosses: Developer Templates + Collaboration + UI/UX).
5. `test_offline_draw_and_code_sync`: A user disconnects from the internet, draws several shapes, and writes code inside a block. Upon reconnecting, the sync protocol uploads all changes sequentially without losing data. (Crosses: Persistence + Sync + Code Snippets).
6. `test_command_palette_theme_toggle_persistence`: A user opens the Cmd+K command palette, changes the application theme to Dark Mode, and reloads the app. The theme state is persisted in the local database. (Crosses: UI/UX + Persistence).
7. `test_board_gallery_rename_sync`: A user renames a board in the gallery list while another collaborator is actively viewing that board. The collaborator's window title updates instantly. (Crosses: Persistence + Collaboration + Sync).
8. `test_export_custom_templates`: A user creates a custom grouped template, exports the board to a JSON file, and imports it on another system, verifying the custom template is available in the library. (Crosses: Developer Templates + UI/UX).

---

## Test Architecture

- **Test Runner**: Vitest + TypeScript. Vitest provides high-performance testing, fast hot-reloading, and out-of-the-box TypeScript parsing.
- **UI & Canvas Simulation**: We use `jsdom` (or `happy-dom`) combined with mock mouse/touch event dispatchers to simulate panning, zooming, and drawing shapes.
- **Sync Mocking**: Standard WebSocket connections are mocked using a custom client/server mock implementation, allowing simultaneous assertions on multiple virtual client instances.
- **Test Case Format**: All E2E tests are written as Vitest `.test.ts` files containing clear descriptive `describe` and `it`/`test` blocks.
- **Directory Layout**:
  ```
  tests/
  ├── e2e/
  │   ├── canvas.test.ts          # Canvas and drawing engine tests
  │   ├── code.test.ts            # Code snippet sandboxed runner tests
  │   ├── sync.test.ts            # Sync protocol and vector clock tests
  │   ├── templates.test.ts       # Developer templates and smart blocks tests
  │   ├── collaboration.test.ts   # Cursor and room collaboration tests
  │   ├── ui.test.ts              # Command palette, shortcuts, and exports
  │   └── persistence.test.ts     # SQLite local-first persistence tests
  └── run_tests.sh                # Test runner orchestration script
  ```

---

## Real-World Application Scenarios (Tier 4)

These scenarios represent high-level user workflows simulating multi-step real-world workloads to ensure all integrated modules function correctly.

### 1. Database Schema Design & SQL Verification
- **Step 1**: User drags three database table templates onto the canvas (`users`, `orders`, `order_items`).
- **Step 2**: User edits the columns, data types, and primary/foreign key mappings for each table block.
- **Step 3**: User draws auto-routing connector arrows representing the relationships (1:N, N:M) between the tables.
- **Step 4**: User places a SQL code snippet block next to the diagram, writes the DDL `CREATE TABLE` commands representing the design, clicks "Run" to verify execution in the database, and displays the success output.
- **Step 5**: User exports the entire board diagram as a PNG for project documentation.

### 2. System Architecture Planning with Network Mocks
- **Step 1**: User designs a 3-tier system layout by dragging server, database, load balancer, cache, and queue icons from the network template panel.
- **Step 2**: User connects the infrastructure nodes with labeled arrows showing network paths (HTTP/gRPC/SQL).
- **Step 3**: User places a sticky note next to the cache node, writing the eviction policy details (`eviction: volatile-lru`).
- **Step 4**: User triggers the Cmd+K command palette to switch the board to dark mode, checking the visual readability.
- **Step 5**: User selects all components, groups them, and saves the system architecture design as a reusable custom template.

### 3. Git Branch Visualizer & CLI Command Testbed
- **Step 1**: User drags a Git branch template onto the canvas, starting with three commit nodes on the `main` branch.
- **Step 2**: User draws a `feature` branch branching off the second commit node, placing two new commits.
- **Step 3**: User draws a merge line with a commit node representing the merge back to the `main` branch.
- **Step 4**: User places a shell script code block next to the branch graph, writing a script that simulates the git CLI operations (`git checkout -b feature && git commit -m "feat"`).
- **Step 5**: User runs the shell script inside the sandbox, checks that the simulation output matches, and places a threaded comment on the merge node requesting a code review from their team.

### 4. Code Sprint Kanban Board & Backlog Grooming
- **Step 1**: User drags a Kanban board template onto the canvas, featuring columns: `Backlog`, `In Progress`, `Review`, and `Done`.
- **Step 2**: User populates the columns by creating five distinct task cards with descriptions and priorities.
- **Step 3**: A collaborator joins the room via room code. Both users edit the cards simultaneously in real-time.
- **Step 4**: User A moves a card from `Backlog` to `In Progress`, while User B adds a detailed comment to another card in the `Review` column.
- **Step 5**: The board autosaves to local SQLite database, and changes are successfully broadcasted to both viewports.

### 5. Remote Pair Programming & Viewport Follow
- **Step 1**: Developer A and Developer B connect to the same whiteboard collaboration room.
- **Step 2**: Developer A creates a Python code block and writes an algorithm to calculate Fibonacci sequences.
- **Step 3**: Developer B enables Follow Mode to follow Developer A's viewport.
- **Step 4**: Developer A pans the canvas and zooms into the code block to explain the code. Developer B's screen automatically pans and zooms.
- **Step 5**: Developer B disables Follow Mode, clicks "Run" on the code block, and both developers see the execution output synced on the canvas.

---

## Coverage Thresholds

To achieve release readiness, the E2E test suite must implement the minimum test count thresholds across all tiers:

- **Tier 1 (Feature Coverage)**: >= 40 tests
- **Tier 2 (Boundary & Corner Cases)**: >= 40 tests
- **Tier 3 (Cross-Feature Combinations)**: >= 8 tests
- **Tier 4 (Real-World Application Scenarios)**: >= 5 tests
- **Total Minimum Target**: **93 tests** (Detailed inventory here specifies 101 tests)
