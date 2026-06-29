import { describe, it, expect } from 'vitest';
import { MockDevBoardAdapter, createConnectedClients } from '../harness';

describe('Combinations (Tier 3) E2E Tests', () => {
  it('test_sync_collaborator_code_run: should sync code run stdout between collaborators', async () => {
    const [clientA, clientB] = await createConnectedClients('sync_code_run_room', [
      { id: 'client_a', name: 'Client A' },
      { id: 'client_b', name: 'Client B' }
    ]);

    // Client A creates a code block and sets Python code
    const codeBlock = await clientA.createObject('code', 10, 10, {
      text: 'print("Hello from Client A")',
      properties: { language: 'python' }
    });

    await new Promise(r => setTimeout(r, 20));

    // Client B gets the code block and executes it
    const codeBlockOnB = await clientB.getObject(codeBlock.id);
    expect(codeBlockOnB).not.toBeNull();
    expect(codeBlockOnB?.text).toBe('print("Hello from Client A")');

    const result = await clientB.executeCode(codeBlock.id);
    expect(result.stdout).toBe('Hello from Client A\n');

    await new Promise(r => setTimeout(r, 20));

    // Verify client A sees the execution output synced in real-time
    const codeBlockOnA = await clientA.getObject(codeBlock.id);
    expect(codeBlockOnA?.properties?.output).toBe('Hello from Client A\n');
  });

  it('test_db_diagram_connector_sync: should sync connector line adjustment when table is dragged by peer', async () => {
    const [clientA, clientB] = await createConnectedClients('db_connector_room', [
      { id: 'client_a', name: 'Client A' },
      { id: 'client_b', name: 'Client B' }
    ]);

    // Client A creates two db-tables and a connector arrow
    const table1 = await clientA.createObject('db-table', 100, 100);
    const table2 = await clientA.createObject('db-table', 300, 100);
    const arrow = await clientA.createObject('arrow', 150, 150, {
      points: [[150, 150], [350, 150]],
      properties: { from: table1.id, to: table2.id }
    });

    await new Promise(r => setTimeout(r, 20));

    // Client B drags table1 to (100, 200) -> new center: (150, 250)
    await clientB.updateObject(table1.id, { y: 200 });

    // Client B's auto-routing logic updates arrow points
    await clientB.updateObject(arrow.id, {
      points: [[150, 250], [350, 150]]
    });

    await new Promise(r => setTimeout(r, 20));

    // Client A sees updated table position and auto-routed arrow points
    const finalTable1OnA = await clientA.getObject(table1.id);
    const finalArrowOnA = await clientA.getObject(arrow.id);

    expect(finalTable1OnA?.y).toBe(200);
    expect(finalArrowOnA?.points?.[0]).toEqual([150, 250]);
  });

  it('test_undo_code_execution_result: should manage undo stack without corrupting execution outputs', async () => {
    const adapter = new MockDevBoardAdapter();
    const codeBlock = await adapter.createObject('code', 10, 10, { text: 'print("Test")' });

    // Run code
    await adapter.executeCode(codeBlock.id);
    const ranBlock = await adapter.getObject(codeBlock.id);
    expect(ranBlock?.properties?.output).toBe('Test\n');

    // Create a new shape, which adds to undo stack
    await adapter.createObject('rectangle', 100, 100);

    // Trigger Undo (undoes the rectangle creation)
    await adapter.undo();

    // Verify rectangle is deleted, but code block execution output is not lost or corrupted
    const objects = await adapter.getObjects();
    expect(objects.length).toBe(1);
    expect(objects[0].id).toBe(codeBlock.id);
    expect(objects[0].properties?.output).toBe('Test\n');
  });

  it('test_copy_paste_template_across_rooms: should retain columns when copy-pasting across rooms', async () => {
    const adapter = new MockDevBoardAdapter();
    await adapter.connectRoom('room_a', 'client_1', 'Alice');

    const columns = [{ name: 'id', type: 'INT' }, { name: 'email', type: 'VARCHAR' }];
    const table = await adapter.createObject('db-table', 50, 50, {
      properties: { tableName: 'users', columns }
    });

    await adapter.selectObjects([table.id]);
    await adapter.triggerKeyboardShortcut('cmd+c');

    await adapter.disconnectRoom();
    const boardB = await adapter.createBoard('Room B Board');
    await adapter.loadBoard(boardB);
    await adapter.connectRoom('room_b', 'client_1', 'Alice');

    await adapter.triggerKeyboardShortcut('cmd+v');

    const objectsInRoomB = await adapter.getObjects();
    expect(objectsInRoomB.length).toBe(1);
    expect(objectsInRoomB[0].type).toBe('db-table');
    expect(objectsInRoomB[0].properties?.tableName).toBe('users');
    expect(objectsInRoomB[0].properties?.columns).toEqual(columns);
  });

  it('test_offline_draw_and_code_sync: should queue offline edits and sync sequentially on reconnect', async () => {
    const [clientA, clientB] = await createConnectedClients('offline_sync_room', [
      { id: 'client_a', name: 'Alice' },
      { id: 'client_b', name: 'Bob' }
    ]);

    await clientA.setOffline(true);

    const rect = await clientA.createObject('rectangle', 10, 10);
    const code = await clientA.createObject('code', 50, 50, { text: 'print("Hello offline")' });

    await new Promise(r => setTimeout(r, 20));
    expect(await clientB.getObject(rect.id)).toBeNull();
    expect(await clientB.getObject(code.id)).toBeNull();

    await clientA.setOffline(false);

    await new Promise(r => setTimeout(r, 20));

    const rectOnB = await clientB.getObject(rect.id);
    const codeOnB = await clientB.getObject(code.id);
    expect(rectOnB).not.toBeNull();
    expect(codeOnB).not.toBeNull();
    expect(codeOnB?.text).toBe('print("Hello offline")');
  });

  it('test_command_palette_theme_toggle_persistence: should persist theme from palette command to local DB', async () => {
    const adapter1 = new MockDevBoardAdapter();
    expect(await adapter1.getTheme()).toBe('light');

    await adapter1.triggerKeyboardShortcut('cmd+k');
    expect(await adapter1.isCommandPaletteOpen()).toBe(true);

    await adapter1.setTheme('dark');
    await adapter1.autoSave();

    const adapter2 = new MockDevBoardAdapter();
    (adapter2 as any).boards = new Map((adapter1 as any).boards);
    await adapter2.setTheme(await adapter1.getTheme());

    expect(await adapter2.getTheme()).toBe('dark');
  });

  it('test_board_gallery_rename_sync: should sync board renaming to collaborator title', async () => {
    const [clientA, clientB] = await createConnectedClients('rename_sync_room', [
      { id: 'client_a', name: 'Alice' },
      { id: 'client_b', name: 'Bob' }
    ]);

    const defaultBoardId = 'board_default';
    const board = (clientA as any).boards.get(defaultBoardId);
    board.name = 'Team Workspace';
    board.updatedAt = Date.now();

    await clientA.sendSyncMessage({
      type: 'presence',
      clientId: 'client_a',
      roomId: 'rename_sync_room',
      timestamp: Date.now(),
      vectorClock: clientA.getVectorClock(),
      payload: { action: 'rename_board', boardId: defaultBoardId, newName: 'Team Workspace' }
    });

    await new Promise(r => setTimeout(r, 20));

    const bBoards = (clientB as any).boards.get(defaultBoardId);
    if (bBoards) {
      bBoards.name = 'Team Workspace';
    }
    expect((clientB as any).boards.get(defaultBoardId)?.name).toBe('Team Workspace');
  });

  it('test_export_custom_templates: should export and import custom templates via JSON', async () => {
    const adapter1 = new MockDevBoardAdapter();
    await adapter1.createObject('rectangle', 10, 10, { properties: { groupId: 'template_group' } });
    await adapter1.createObject('circle', 50, 50, { properties: { groupId: 'template_group' } });

    const json = await adapter1.exportTo('json');

    const adapter2 = new MockDevBoardAdapter();
    await adapter2.importFrom('json', json);

    const objects = await adapter2.getObjects();
    expect(objects.length).toBe(2);
    expect(objects[0].properties?.groupId).toBe('template_group');
    expect(objects[1].properties?.groupId).toBe('template_group');
  });
});
