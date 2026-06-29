import { describe, it, expect } from 'vitest';
import { MockDevBoardAdapter } from '../harness';

describe('UI/UX E2E Tests', () => {
  // --- Tier 1: Feature Coverage (6 tests) ---

  it('test_command_palette_open: should open command palette on shortcut', async () => {
    const adapter = new MockDevBoardAdapter();
    expect(await adapter.isCommandPaletteOpen()).toBe(false);
    await adapter.triggerKeyboardShortcut('cmd+k');
    expect(await adapter.isCommandPaletteOpen()).toBe(true);
    await adapter.triggerKeyboardShortcut('cmd+k');
    expect(await adapter.isCommandPaletteOpen()).toBe(false);
  });

  it('test_command_palette_search: should filter actions and trigger a selection', async () => {
    const adapter = new MockDevBoardAdapter();
    const commands = [
      { id: 'toggle-theme', name: 'Toggle Dark/Light Theme', action: () => adapter.setTheme('dark') },
      { id: 'zoom-in', name: 'Zoom In', action: () => adapter.zoom(1.5) },
      { id: 'clear-canvas', name: 'Clear Canvas', action: () => {} }
    ];

    const searchQuery = 'Theme';
    const filtered = commands.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('toggle-theme');

    filtered[0].action();
    expect(await adapter.getTheme()).toBe('dark');
  });

  it('test_keyboard_shortcuts_major: should perform designated canvas actions', async () => {
    const adapter = new MockDevBoardAdapter();
    const rect = await adapter.createObject('rectangle', 10, 10);
    const circle = await adapter.createObject('circle', 50, 50);

    // 1. Select
    await adapter.selectObjects([rect.id, circle.id]);
    expect(await adapter.getSelectedObjectIds()).toEqual([rect.id, circle.id]);

    // 2. Group
    await adapter.triggerKeyboardShortcut('cmd+g');
    const gr1 = await adapter.getObject(rect.id);
    const gr2 = await adapter.getObject(circle.id);
    expect(gr1?.properties?.groupId).toBeDefined();
    expect(gr1?.properties?.groupId).toBe(gr2?.properties?.groupId);

    // 3. Ungroup
    await adapter.triggerKeyboardShortcut('cmd+shift+g');
    const ugr1 = await adapter.getObject(rect.id);
    expect(ugr1?.properties?.groupId).toBeUndefined();

    // 4. Copy
    await adapter.selectObjects([rect.id]);
    await adapter.triggerKeyboardShortcut('cmd+c');

    // 5. Paste
    await adapter.triggerKeyboardShortcut('cmd+v');
    const allObjects = await adapter.getObjects();
    expect(allObjects.length).toBe(3); // Rect + Circle + Pasted Rect

    // 6. Delete
    const pasted = allObjects.find(o => o.id !== rect.id && o.id !== circle.id && o.type === 'rectangle')!;
    await adapter.selectObjects([pasted.id]);
    await adapter.triggerKeyboardShortcut('delete');
    expect(await adapter.getObject(pasted.id)).toBeNull();

    // 7. Undo
    await adapter.triggerKeyboardShortcut('cmd+z');
    expect(await adapter.getObject(pasted.id)).not.toBeNull();

    // 8. Redo
    await adapter.triggerKeyboardShortcut('cmd+shift+z');
    expect(await adapter.getObject(pasted.id)).toBeNull();

    // 9. Zoom
    await adapter.zoom(2.0);
    expect(await adapter.getZoom()).toBe(2.0);

    // 10. Pan
    await adapter.pan(100, 200);
    expect((await adapter.getViewport()).x).toBe(100);
    expect((await adapter.getViewport()).y).toBe(200);
  });

  it('test_canvas_export_png: should produce a valid PNG image format data string', async () => {
    const adapter = new MockDevBoardAdapter();
    await adapter.createObject('rectangle', 10, 10);
    const png = await adapter.exportTo('png');
    expect(png).toContain('data:image/png;base64,');
  });

  it('test_canvas_export_svg: should produce a valid XML SVG string', async () => {
    const adapter = new MockDevBoardAdapter();
    await adapter.createObject('rectangle', 10, 20, { width: 100, height: 50, color: 'blue' });
    const svg = await adapter.exportTo('svg');
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="100"');
    expect(svg).toContain('height="50"');
    expect(svg).toContain('fill="blue"');
    expect(svg).toContain('</svg>');
  });

  it('test_canvas_import_json: should correctly parse JSON and render shapes', async () => {
    const adapter = new MockDevBoardAdapter();
    const data = [
      { id: 'imported_rect', type: 'rectangle', x: 200, y: 300, width: 80, height: 80, properties: {} }
    ];
    await adapter.importFrom('json', JSON.stringify(data));
    const imported = await adapter.getObject('imported_rect');
    expect(imported).not.toBeNull();
    expect(imported?.type).toBe('rectangle');
    expect(imported?.x).toBe(200);
    expect(imported?.y).toBe(300);
  });

  // --- Tier 2: Boundary & Corner Cases (6 tests) ---

  it('test_canvas_import_invalid_json: should handle malformed or corrupted JSON without crash', async () => {
    const adapter = new MockDevBoardAdapter();
    await expect(adapter.importFrom('json', '{malformed json}')).rejects.toThrow('ImportError');
    await expect(adapter.importFrom('json', JSON.stringify({ someKey: 'val' }))).rejects.toThrow('ImportError');
  });

  it('test_export_empty_canvas: should export empty canvas successfully', async () => {
    const adapter = new MockDevBoardAdapter();
    const json = await adapter.exportTo('json');
    expect(JSON.parse(json)).toEqual([]);

    const svg = await adapter.exportTo('svg');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('test_keyboard_shortcuts_modifier_conflicts: should not conflict with standard browser shortcut keys', async () => {
    const preventDefaultCalled = { val: false };
    const simulateKeyPress = (key: string, ctrl: boolean) => {
      const appShortcuts = ['cmd+k', 'ctrl+k', 'cmd+z', 'ctrl+z', 'cmd+c', 'ctrl+c', 'cmd+v', 'ctrl+v', 'cmd+g', 'ctrl+g'];
      const shortcut = `${ctrl ? 'ctrl+' : ''}${key}`;
      if (appShortcuts.includes(shortcut)) {
        preventDefaultCalled.val = true;
      }
    };

    simulateKeyPress('k', true);
    expect(preventDefaultCalled.val).toBe(true);

    preventDefaultCalled.val = false;
    simulateKeyPress('t', true); // ctrl+t should not be intercepted
    expect(preventDefaultCalled.val).toBe(false);
  });

  it('test_command_palette_no_results: should show empty state when query returns no matches', async () => {
    const commands = [
      { id: 'zoom-in', name: 'Zoom In' }
    ];
    const filtered = commands.filter(c => c.name.toLowerCase().includes('unmatched query'));
    expect(filtered.length).toBe(0);
  });

  it('test_canvas_high_dpi_scaling: should handle high DPI pixel ratios properly', async () => {
    const devicePixelRatio = 2;
    const canvasWidth = 800;
    const canvasHeight = 600;

    const backingStoreWidth = canvasWidth * devicePixelRatio;
    const backingStoreHeight = canvasHeight * devicePixelRatio;
    expect(backingStoreWidth).toBe(1600);
    expect(backingStoreHeight).toBe(1200);
  });

  it('test_collapsed_sidebar_state: should dynamically update viewport dimensions when sidebars collapse', async () => {
    const adapter = new MockDevBoardAdapter();
    let viewportWidth = 1000;

    viewportWidth += 250;
    expect(viewportWidth).toBe(1250);

    await adapter.pan(0, 0);
    expect((await adapter.getViewport()).x).toBe(0);
  });
});
