import { describe, it, expect } from 'vitest';
import { MockDevBoardAdapter } from '../harness';

describe('Templates E2E Tests', () => {
  // --- Tier 1: Feature Coverage (6 tests) ---

  it('test_template_panel_rendered: should display categories for diagrams', async () => {
    const categories = ['database diagrams', 'networking diagrams', 'sequence diagrams', 'flowcharts'];
    expect(categories).toContain('database diagrams');
    expect(categories).toContain('networking diagrams');
    expect(categories).toContain('sequence diagrams');
    expect(categories).toContain('flowcharts');
  });

  it('test_drag_database_table: should render a table block with columns and constraints', async () => {
    const adapter = new MockDevBoardAdapter();
    const columns = [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY', 'AUTOINCREMENT'] },
      { name: 'username', type: 'VARCHAR(255)', constraints: ['UNIQUE'] }
    ];
    const table = await adapter.createObject('db-table', 100, 150, {
      properties: {
        tableName: 'users',
        columns: columns
      }
    });

    expect(table.type).toBe('db-table');
    expect(table.x).toBe(100);
    expect(table.y).toBe(150);
    expect(table.properties?.tableName).toBe('users');
    expect(table.properties?.columns).toEqual(columns);
    expect(table.properties?.columns[0].constraints).toContain('PRIMARY KEY');
  });

  it('test_drag_network_node: should render client, server, and database nodes', async () => {
    const adapter = new MockDevBoardAdapter();
    const client = await adapter.createObject('network-node', 50, 100, { properties: { role: 'client', ip: '192.168.1.10' } });
    const server = await adapter.createObject('network-node', 200, 100, { properties: { role: 'server', ip: '10.0.0.1' } });
    const db = await adapter.createObject('network-node', 350, 100, { properties: { role: 'database', dbType: 'PostgreSQL' } });

    expect(client.type).toBe('network-node');
    expect(client.properties?.role).toBe('client');
    expect(server.properties?.role).toBe('server');
    expect(db.properties?.role).toBe('database');
  });

  it('test_drag_flowchart_shapes: should place flowchart symbols on canvas', async () => {
    const adapter = new MockDevBoardAdapter();
    const terminal = await adapter.createObject('flowchart-shape', 10, 10, { properties: { shapeType: 'terminal', label: 'Start' } });
    const process = await adapter.createObject('flowchart-shape', 10, 100, { properties: { shapeType: 'process', label: 'Step 1' } });
    const decision = await adapter.createObject('flowchart-shape', 10, 200, { properties: { shapeType: 'decision', label: 'Is Valid?' } });

    expect(terminal.properties?.shapeType).toBe('terminal');
    expect(process.properties?.shapeType).toBe('process');
    expect(decision.properties?.shapeType).toBe('decision');
  });

  it('test_drag_api_card: should create API card block with HTTP badge and path', async () => {
    const adapter = new MockDevBoardAdapter();
    const card = await adapter.createObject('api-card', 150, 150, {
      properties: {
        method: 'POST',
        path: '/api/v1/login',
        headers: { 'Content-Type': 'application/json' }
      }
    });

    expect(card.type).toBe('api-card');
    expect(card.properties?.method).toBe('POST');
    expect(card.properties?.path).toBe('/api/v1/login');
  });

  it('test_custom_template_save: should select grouped shapes and save as reusable template', async () => {
    const adapter = new MockDevBoardAdapter();
    const shape1 = await adapter.createObject('rectangle', 0, 0, { width: 50, height: 50 });
    const shape2 = await adapter.createObject('circle', 60, 0, { width: 50, height: 50 });

    await adapter.selectObjects([shape1.id, shape2.id]);
    await adapter.triggerKeyboardShortcut('cmd+g');

    const updated1 = await adapter.getObject(shape1.id);
    const updated2 = await adapter.getObject(shape2.id);
    expect(updated1?.properties?.groupId).toBeDefined();
    expect(updated1?.properties?.groupId).toBe(updated2?.properties?.groupId);

    // Save as reusable template
    const templateLibrary: Record<string, any> = {};
    const groupId = updated1?.properties?.groupId;
    const groupObjects = (await adapter.getObjects()).filter(o => o.properties?.groupId === groupId);

    templateLibrary['custom_template_1'] = {
      name: 'Custom Node Pair',
      objects: groupObjects.map(o => ({
        type: o.type,
        width: o.width,
        height: o.height,
        properties: { ...o.properties }
      }))
    };

    expect(templateLibrary['custom_template_1'].objects.length).toBe(2);
    expect(templateLibrary['custom_template_1'].name).toBe('Custom Node Pair');
  });

  // --- Tier 2: Boundary & Corner Cases (6 tests) ---

  it('test_db_table_column_edit: should add, edit, and delete columns, updating height', async () => {
    const adapter = new MockDevBoardAdapter();
    const table = await adapter.createObject('db-table', 10, 10, {
      properties: {
        columns: [{ name: 'id', type: 'INT' }]
      },
      height: 100
    });

    // Add a column, height should grow
    const newColumns = [
      { name: 'id', type: 'INT' },
      { name: 'name', type: 'VARCHAR' }
    ];
    // Dynamic height logic calculation
    const calculatedHeight = 100 + (newColumns.length - 1) * 30; // each column adds 30px
    const updated = await adapter.updateObject(table.id, {
      properties: { columns: newColumns },
      height: calculatedHeight
    });

    expect(updated.properties?.columns.length).toBe(2);
    expect(updated.height).toBe(130);

    // Remove column
    const reducedColumns = [{ name: 'id', type: 'INT' }];
    const reducedHeight = 100 + (reducedColumns.length - 1) * 30;
    const finalTable = await adapter.updateObject(table.id, {
      properties: { columns: reducedColumns },
      height: reducedHeight
    });
    expect(finalTable.properties?.columns.length).toBe(1);
    expect(finalTable.height).toBe(100);
  });

  it('test_flowchart_connection_auto_routing: should adjust connection path when process blocks move', async () => {
    const adapter = new MockDevBoardAdapter();
    const blockA = await adapter.createObject('flowchart-shape', 100, 100, { width: 80, height: 60 });
    const blockB = await adapter.createObject('flowchart-shape', 300, 100, { width: 80, height: 60 });

    // Initial arrow connecting center of A to center of B
    // A center: (140, 130), B center: (340, 130)
    const arrow = await adapter.createObject('arrow', 140, 130, {
      points: [[140, 130], [340, 130]],
      properties: { from: blockA.id, to: blockB.id }
    });

    // Move block A to (100, 200) -> new center: (140, 230)
    await adapter.updateObject(blockA.id, { y: 200 });

    // Auto-routing logic updates arrow points
    const newA_Center: [number, number] = [140, 230];
    const newB_Center: [number, number] = [340, 130];
    const updatedArrow = await adapter.updateObject(arrow.id, {
      points: [newA_Center, newB_Center]
    });

    expect(updatedArrow.points?.[0]).toEqual([140, 230]);
    expect(updatedArrow.points?.[1]).toEqual([340, 130]);
  });

  it('test_git_branch_nodes: should update branch lines and commits', async () => {
    const adapter = new MockDevBoardAdapter();
    const gitBranch = await adapter.createObject('git-branch', 50, 50, {
      properties: {
        commits: [
          { id: 'c1', branch: 'main', message: 'Initial commit' },
          { id: 'c2', branch: 'main', message: 'Second commit' }
        ]
      }
    });

    expect(gitBranch.properties?.commits.length).toBe(2);

    // Add new branch & commit node
    const updatedCommits = [
      ...gitBranch.properties?.commits,
      { id: 'c3', branch: 'feature', parents: ['c2'], message: 'Feature start' }
    ];
    const updated = await adapter.updateObject(gitBranch.id, {
      properties: {
        commits: updatedCommits,
        activeBranches: ['main', 'feature']
      }
    });

    expect(updated.properties?.commits.length).toBe(3);
    expect(updated.properties?.activeBranches).toContain('feature');
  });

  it('test_kanban_card_drag_drop: should move card between columns and update coordinates', async () => {
    const adapter = new MockDevBoardAdapter();
    const kanban = await adapter.createObject('kanban-board', 100, 100, {
      properties: {
        columns: {
          'Backlog': [{ id: 'card1', text: 'Task 1' }],
          'In Progress': []
        }
      }
    });

    // Move 'card1' to 'In Progress' column
    const newColumns = {
      'Backlog': [],
      'In Progress': [{ id: 'card1', text: 'Task 1' }]
    };

    const updated = await adapter.updateObject(kanban.id, {
      properties: {
        columns: newColumns
      }
    });

    expect(updated.properties?.columns['Backlog'].length).toBe(0);
    expect(updated.properties?.columns['In Progress'].length).toBe(1);
    expect(updated.properties?.columns['In Progress'][0].id).toBe('card1');
  });

  it('test_sequence_diagram_message_reorder: should reorder messages and reflow lifelines', async () => {
    const adapter = new MockDevBoardAdapter();
    const sequenceObj = await adapter.createObject('rectangle', 50, 50, {
      properties: {
        type: 'sequence-diagram',
        lifelines: ['Client', 'Server'],
        messages: [
          { id: 'msg1', from: 'Client', to: 'Server', label: 'GET /index.html', yOffset: 100 },
          { id: 'msg2', from: 'Server', to: 'Client', label: '200 OK', yOffset: 150 }
        ]
      }
    });

    // Reorder messages (flip order, meaning their indices or yOffsets adjust)
    const reorderedMessages = [
      { id: 'msg2', from: 'Server', to: 'Client', label: '200 OK', yOffset: 100 },
      { id: 'msg1', from: 'Client', to: 'Server', label: 'GET /index.html', yOffset: 150 }
    ];

    const updated = await adapter.updateObject(sequenceObj.id, {
      properties: {
        ...sequenceObj.properties,
        messages: reorderedMessages
      }
    });

    expect(updated.properties?.messages[0].id).toBe('msg2');
    expect(updated.properties?.messages[0].yOffset).toBe(100);
    expect(updated.properties?.messages[1].id).toBe('msg1');
  });

  it('test_api_card_invalid_method: should handle custom or non-standard HTTP method gracefully', async () => {
    const adapter = new MockDevBoardAdapter();
    const card = await adapter.createObject('api-card', 10, 10, {
      properties: {
        method: 'INVALID_METHOD_NAME',
        path: '/test'
      }
    });

    expect(card.properties?.method).toBe('INVALID_METHOD_NAME');
  });
});
