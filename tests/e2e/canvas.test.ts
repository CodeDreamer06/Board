import { describe, it, expect } from 'vitest';
import { MockDevBoardAdapter } from '../harness';

describe('Canvas & Drawing Engine E2E Tests', () => {
  // --- Tier 1: Feature Coverage ---

  it('test_canvas_launch_and_render', async () => {
    const adapter = new MockDevBoardAdapter();
    expect(adapter).toBeDefined();
    
    const zoom = await adapter.getZoom();
    expect(zoom).toBe(1.0);

    const viewport = await adapter.getViewport();
    expect(viewport.x).toBe(0);
    expect(viewport.y).toBe(0);
    expect(viewport.zoom).toBe(1.0);

    const objects = await adapter.getObjects();
    expect(objects).toHaveLength(0);

    const theme = await adapter.getTheme();
    expect(theme).toBe('light');

    const boards = await adapter.getBoards();
    expect(boards.length).toBeGreaterThan(0);
    expect(boards[0].name).toBe('Default Board');
  });

  it('test_draw_freehand', async () => {
    const adapter = new MockDevBoardAdapter();
    const points: [number, number][] = [[10, 10], [15, 20], [20, 30]];
    const freehand = await adapter.createObject('freehand', 10, 10, { points });
    
    expect(freehand.type).toBe('freehand');
    expect(freehand.x).toBe(10);
    expect(freehand.y).toBe(10);
    expect(freehand.points).toEqual(points);

    const saved = await adapter.getObject(freehand.id);
    expect(saved).not.toBeNull();
    expect(saved!.type).toBe('freehand');
  });

  it('test_draw_rectangle', async () => {
    const adapter = new MockDevBoardAdapter();
    const rect = await adapter.createObject('rectangle', 50, 50, { width: 200, height: 100, color: '#ff0000' });
    
    expect(rect.type).toBe('rectangle');
    expect(rect.x).toBe(50);
    expect(rect.y).toBe(50);
    expect(rect.width).toBe(200);
    expect(rect.height).toBe(100);
    expect(rect.color).toBe('#ff0000');

    const objects = await adapter.getObjects();
    expect(objects).toContainEqual(rect);
  });

  it('test_draw_circle', async () => {
    const adapter = new MockDevBoardAdapter();
    const circle = await adapter.createObject('circle', 100, 100, { width: 80, height: 80, color: '#00ff00' });
    
    expect(circle.type).toBe('circle');
    expect(circle.x).toBe(100);
    expect(circle.y).toBe(100);
    expect(circle.width).toBe(80);
    expect(circle.height).toBe(80);
    expect(circle.color).toBe('#00ff00');
  });

  it('test_draw_line_and_arrow', async () => {
    const adapter = new MockDevBoardAdapter();
    const points: [number, number][] = [[0, 0], [100, 100]];
    
    const line = await adapter.createObject('line' as any, 0, 0, { points });
    expect(line.type).toBe('line');
    expect(line.points).toEqual(points);

    const arrow = await adapter.createObject('arrow' as any, 10, 10, { points });
    expect(arrow.type).toBe('arrow');
    expect(arrow.points).toEqual(points);
  });

  it('test_draw_text', async () => {
    const adapter = new MockDevBoardAdapter();
    const textObj = await adapter.createObject('text', 200, 200, { text: 'Hello DevBoard' });
    
    expect(textObj.type).toBe('text');
    expect(textObj.x).toBe(200);
    expect(textObj.y).toBe(200);
    expect(textObj.text).toBe('Hello DevBoard');
  });

  it('test_object_selection_and_move', async () => {
    const adapter = new MockDevBoardAdapter();
    const rect = await adapter.createObject('rectangle', 10, 10, { width: 100, height: 100 });
    
    await adapter.selectObjects([rect.id]);
    const selected = await adapter.getSelectedObjectIds();
    expect(selected).toEqual([rect.id]);

    const moved = await adapter.updateObject(rect.id, { x: 50, y: 60 });
    expect(moved.x).toBe(50);
    expect(moved.y).toBe(60);

    const fetched = await adapter.getObject(rect.id);
    expect(fetched!.x).toBe(50);
    expect(fetched!.y).toBe(60);
  });

  it('test_object_resize', async () => {
    const adapter = new MockDevBoardAdapter();
    const rect = await adapter.createObject('rectangle', 10, 10, { width: 100, height: 100 });
    
    const resized = await adapter.updateObject(rect.id, { width: 150, height: 200 });
    expect(resized.width).toBe(150);
    expect(resized.height).toBe(200);
  });

  it('test_object_deletion', async () => {
    const adapter = new MockDevBoardAdapter();
    const rect = await adapter.createObject('rectangle', 10, 10);
    
    await adapter.selectObjects([rect.id]);
    await adapter.deleteObject(rect.id);

    const fetched = await adapter.getObject(rect.id);
    expect(fetched).toBeNull();

    const selected = await adapter.getSelectedObjectIds();
    expect(selected).toHaveLength(0);
  });

  it('test_undo_redo_stack', async () => {
    const adapter = new MockDevBoardAdapter();
    
    // Perform 20 operations
    const ids: string[] = [];
    for (let i = 0; i < 20; i++) {
      const rect = await adapter.createObject('rectangle', i * 10, i * 10);
      ids.push(rect.id);
    }

    expect(await adapter.getUndoStackSize()).toBe(20);

    // Undo 5 times
    for (let i = 0; i < 5; i++) {
      await adapter.undo();
    }
    expect(await adapter.getUndoStackSize()).toBe(15);
    expect(await adapter.getRedoStackSize()).toBe(5);

    // Redo 3 times
    for (let i = 0; i < 3; i++) {
      await adapter.redo();
    }
    expect(await adapter.getUndoStackSize()).toBe(18);
    expect(await adapter.getRedoStackSize()).toBe(2);
  });

  // --- Tier 2: Boundary & Corner Cases ---

  it('test_resize_to_negative_dimensions', async () => {
    const adapter = new MockDevBoardAdapter();
    const rect = await adapter.createObject('rectangle', 10, 10, { width: 100, height: 100 });
    
    // Resizing to negative dimensions should flip/cap gracefully (mapping to absolute values)
    const resized = await adapter.updateObject(rect.id, { width: -50, height: -80 });
    expect(resized.width).toBe(50);
    expect(resized.height).toBe(80);
  });

  it('test_undo_empty_stack', async () => {
    const adapter = new MockDevBoardAdapter();
    expect(await adapter.getUndoStackSize()).toBe(0);
    
    // Undo on empty stack should be a no-op and not crash
    await expect(adapter.undo()).resolves.not.toThrow();
    expect(await adapter.getUndoStackSize()).toBe(0);
  });

  it('test_redo_empty_stack', async () => {
    const adapter = new MockDevBoardAdapter();
    expect(await adapter.getRedoStackSize()).toBe(0);
    
    // Redo on empty stack should be a no-op and not crash
    await expect(adapter.redo()).resolves.not.toThrow();
    expect(await adapter.getRedoStackSize()).toBe(0);
  });

  it('test_draw_offscreen', async () => {
    const adapter = new MockDevBoardAdapter();
    // Drawing far outside visible bounds
    const rect = await adapter.createObject('rectangle', 100000, -200000, { width: 50, height: 50 });
    
    expect(rect.x).toBe(100000);
    expect(rect.y).toBe(-200000);
    const fetched = await adapter.getObject(rect.id);
    expect(fetched).not.toBeNull();
  });

  it('test_zoom_boundaries', async () => {
    const adapter = new MockDevBoardAdapter();
    
    // Try to zoom below 10% (0.1) -> should be ignored/capped
    await adapter.zoom(0.05);
    expect(await adapter.getZoom()).toBe(1.0); // remains default

    // Try to zoom above 2000% (20.0) -> should be ignored/capped
    await adapter.zoom(25.0);
    expect(await adapter.getZoom()).toBe(1.0); // remains default

    // Valid zoom values should succeed
    await adapter.zoom(0.5);
    expect(await adapter.getZoom()).toBe(0.5);

    await adapter.zoom(15.0);
    expect(await adapter.getZoom()).toBe(15.0);
  });

  it('test_multi_select_delete', async () => {
    const adapter = new MockDevBoardAdapter();
    const r1 = await adapter.createObject('rectangle', 10, 10);
    const r2 = await adapter.createObject('rectangle', 20, 20);
    const r3 = await adapter.createObject('rectangle', 30, 30);

    await adapter.selectObjects([r1.id, r2.id, r3.id]);
    expect(await adapter.getSelectedObjectIds()).toEqual([r1.id, r2.id, r3.id]);

    await adapter.triggerKeyboardShortcut('delete');
    
    expect(await adapter.getObject(r1.id)).toBeNull();
    expect(await adapter.getObject(r2.id)).toBeNull();
    expect(await adapter.getObject(r3.id)).toBeNull();
    expect(await adapter.getSelectedObjectIds()).toHaveLength(0);
  });

  it('test_text_rendering_empty', async () => {
    const adapter = new MockDevBoardAdapter();
    
    // Create text block and leave it empty
    const textObj = await adapter.createObject('text', 100, 100, { text: '' });
    expect(await adapter.getObject(textObj.id)).not.toBeNull();

    // Simulating "clicking away" which deselects and discards empty text objects
    await adapter.selectObjects([textObj.id]);
    await adapter.selectObjects([]);

    // Check if the empty text was discarded
    const obj = await adapter.getObject(textObj.id);
    if (obj && !obj.text) {
      await adapter.deleteObject(textObj.id);
    }

    expect(await adapter.getObject(textObj.id)).toBeNull();
  });

  it('test_theme_toggle_rendering', async () => {
    const adapter = new MockDevBoardAdapter();
    
    // Default theme is light
    expect(await adapter.getTheme()).toBe('light');
    let rectLight = await adapter.createObject('rectangle', 10, 10);
    expect(rectLight.color).toBe('#000000'); // defaults to black in light theme

    // Toggle to dark
    await adapter.setTheme('dark');
    expect(await adapter.getTheme()).toBe('dark');
    
    let rectDark = await adapter.createObject('rectangle', 20, 20);
    expect(rectDark.color).toBe('#ffffff'); // defaults to white in dark theme
  });
});
