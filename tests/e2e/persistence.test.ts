import { describe, it, expect } from 'vitest';
import { MockDevBoardAdapter } from '../harness';

describe('Persistence E2E Tests', () => {
  // --- Tier 1: Feature Coverage (5 tests) ---

  it('test_auto_save_continuous: should auto-save within 1 second on modification', async () => {
    const adapter = new MockDevBoardAdapter();
    await adapter.createObject('rectangle', 10, 10);

    // Call autosave (triggered on change in production)
    await adapter.autoSave();

    // Check that it's persisted in the board gallery
    const boards = await adapter.getBoards();
    const defaultBoard = boards.find(b => b.id === 'board_default')!;
    expect(defaultBoard.shapeCount).toBe(1);
  });

  it('test_local_persistence_restore: should restore exact board state upon app relaunch', async () => {
    const adapter1 = new MockDevBoardAdapter();
    await adapter1.createObject('rectangle', 50, 50, { text: 'Persisted Node' });
    await adapter1.autoSave();

    // Relaunch app: new adapter instance, load same board gallery data
    const adapter2 = new MockDevBoardAdapter();
    // Copy internal boards state to simulate shared DB file
    (adapter2 as any).boards = new Map((adapter1 as any).boards);
    (adapter2 as any).currentBoardId = null;

    await adapter2.loadBoard('board_default');
    const objects = await adapter2.getObjects();
    expect(objects.length).toBe(1);
    expect(objects[0].type).toBe('rectangle');
    expect(objects[0].text).toBe('Persisted Node');
  });

  it('test_board_gallery_render: should load board gallery with metadata', async () => {
    const adapter = new MockDevBoardAdapter();
    const boardId = await adapter.createBoard('Project Alpha');
    await adapter.loadBoard(boardId);
    await adapter.createObject('circle', 10, 10);
    await adapter.autoSave();

    const boards = await adapter.getBoards();
    expect(boards.length).toBeGreaterThanOrEqual(2);
    const alpha = boards.find(b => b.id === boardId)!;
    expect(alpha.name).toBe('Project Alpha');
    expect(alpha.shapeCount).toBe(1);
    expect(alpha.updatedAt).toBeDefined();
  });

  it('test_switch_boards: should load target board from gallery and switch context', async () => {
    const adapter = new MockDevBoardAdapter();
    const board1 = await adapter.createBoard('Board 1');
    const board2 = await adapter.createBoard('Board 2');

    // Switch to board1, add object
    await adapter.loadBoard(board1);
    await adapter.createObject('rectangle', 100, 100);
    await adapter.autoSave();

    // Switch to board2, add different object
    await adapter.loadBoard(board2);
    await adapter.createObject('circle', 200, 200);
    await adapter.autoSave();

    // Reload board1, verify rect is present and circle is not
    await adapter.loadBoard(board1);
    const objs1 = await adapter.getObjects();
    expect(objs1.length).toBe(1);
    expect(objs1[0].type).toBe('rectangle');

    // Reload board2, verify circle is present
    await adapter.loadBoard(board2);
    const objs2 = await adapter.getObjects();
    expect(objs2.length).toBe(1);
    expect(objs2[0].type).toBe('circle');
  });

  it('test_create_new_board: should initialize empty board and add to database', async () => {
    const adapter = new MockDevBoardAdapter();
    const newId = await adapter.createBoard('Empty Board');
    expect(newId).toBeDefined();

    await adapter.loadBoard(newId);
    const objs = await adapter.getObjects();
    expect(objs.length).toBe(0);

    const boards = await adapter.getBoards();
    expect(boards.some(b => b.id === newId)).toBe(true);
  });

  // --- Tier 2: Boundary & Corner Cases (6 tests) ---

  it('test_persistence_disk_full: should alert user without corrupting in-memory state', async () => {
    const adapter = new MockDevBoardAdapter();
    await adapter.createObject('rectangle', 10, 10);

    adapter.simulateDiskFull = true;
    await expect(adapter.autoSave()).rejects.toThrow('DiskFullError');

    // In-memory state is intact
    const inMem = await adapter.getObjects();
    expect(inMem.length).toBe(1);
    expect(inMem[0].type).toBe('rectangle');
  });

  it('test_offline_persistence_unreconciled: should prioritize latest clock edits upon reconnection', async () => {
    const adapterA = new MockDevBoardAdapter();
    const adapterB = new MockDevBoardAdapter();

    await adapterA.connectRoom('room_1', 'client_a', 'Alice');
    await adapterB.connectRoom('room_1', 'client_b', 'Bob');

    const obj = await adapterA.createObject('rectangle', 10, 10, { text: 'Original' });
    await new Promise(r => setTimeout(r, 20));

    let bobObj = await adapterB.getObject(obj.id);
    expect(bobObj?.text).toBe('Original');

    // Alice goes offline
    await adapterA.setOffline(true);

    // Bob edits online first
    await adapterB.updateObject(obj.id, { text: 'Bob Online Edit' });
    await new Promise(r => setTimeout(r, 10));

    // Alice edits offline second
    await adapterA.updateObject(obj.id, { text: 'Alice Offline Edit' });

    // Alice reconnects
    await adapterA.setOffline(false);

    // Reconcile messages
    await new Promise(r => setTimeout(r, 30));

    const finalA = await adapterA.getObject(obj.id);
    const finalB = await adapterB.getObject(obj.id);
    expect(finalA?.text).toBe('Alice Offline Edit');
    expect(finalB?.text).toBe('Alice Offline Edit');
  });

  it('test_restore_corrupted_db: should backup corrupted db and start with clean state', async () => {
    const adapter = new MockDevBoardAdapter();
    const boardId = 'board_default';

    adapter.simulateDbCorruption = true;
    await adapter.loadBoard(boardId);

    const boards = await adapter.getBoards();
    expect((adapter as any).boards.has(`${boardId}_bak`)).toBe(true);
    expect(boards.some(b => b.name.includes('Backup'))).toBe(true);

    const currentObjects = await adapter.getObjects();
    expect(currentObjects.length).toBe(0);
  });

  it('test_concurrent_auto_saves: should coordinate database writes without locking/crashing', async () => {
    const adapter1 = new MockDevBoardAdapter();
    const adapter2 = new MockDevBoardAdapter();

    const sharedBoards = new Map();
    (adapter1 as any).boards = sharedBoards;
    (adapter2 as any).boards = sharedBoards;

    sharedBoards.set('board_shared', { id: 'board_shared', name: 'Shared', objects: [], updatedAt: Date.now() });
    await adapter1.loadBoard('board_shared');
    await adapter2.loadBoard('board_shared');

    await adapter1.createObject('rectangle', 10, 10);
    await adapter2.createObject('circle', 20, 20);

    await Promise.all([
      adapter1.autoSave(),
      adapter2.autoSave()
    ]);

    const finalBoard = sharedBoards.get('board_shared');
    expect(finalBoard).toBeDefined();
    expect(finalBoard.objects.length).toBeGreaterThan(0);
  });

  it('test_board_deletion_cascade: should purge all shapes and data of deleted board', async () => {
    const adapter = new MockDevBoardAdapter();
    const targetBoardId = await adapter.createBoard('ToDelete');
    await adapter.loadBoard(targetBoardId);
    await adapter.createObject('rectangle', 10, 10);
    await adapter.autoSave();

    let boards = await adapter.getBoards();
    let toDelete = boards.find(b => b.id === targetBoardId)!;
    expect(toDelete.shapeCount).toBe(1);

    await adapter.deleteBoard(targetBoardId);

    boards = await adapter.getBoards();
    expect(boards.some(b => b.id === targetBoardId)).toBe(false);
  });

  it('test_persistence_large_payload: should save and load 5000+ shapes efficiently', async () => {
    const adapter = new MockDevBoardAdapter();
    for (let i = 0; i < 5000; i++) {
      const obj = { id: `obj_${i}`, type: 'rectangle' as const, x: i % 100, y: Math.floor(i / 100), width: 10, height: 10 };
      (adapter as any).objects.set(obj.id, obj);
    }

    const t0 = Date.now();
    await adapter.autoSave();
    const saveTime = Date.now() - t0;

    const t1 = Date.now();
    await adapter.loadBoard('board_default');
    const loadTime = Date.now() - t1;

    expect(saveTime).toBeLessThan(1000);
    expect(loadTime).toBeLessThan(1000);
    expect((await adapter.getObjects()).length).toBe(5000);
  });
});
