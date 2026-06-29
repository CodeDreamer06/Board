import { describe, it, expect } from 'vitest';
import { MockDevBoardAdapter, createConnectedClients } from '../harness';

describe('Real-World Scenarios (Tier 4) E2E Tests', () => {
  it('Scenario 1: Database Schema Design & SQL Verification', async () => {
    const adapter = new MockDevBoardAdapter();

    // Step 1: Drag three database table templates onto canvas
    const usersTable = await adapter.createObject('db-table', 100, 100);
    const ordersTable = await adapter.createObject('db-table', 400, 100);
    const orderItemsTable = await adapter.createObject('db-table', 700, 100);

    // Step 2: Edit the columns, data types, and primary/foreign key mappings
    const usersColumns = [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY'] },
      { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE'] }
    ];
    await adapter.updateObject(usersTable.id, {
      properties: { tableName: 'users', columns: usersColumns }
    });

    const ordersColumns = [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY'] },
      { name: 'user_id', type: 'INT', constraints: ['FOREIGN KEY REFERENCES users(id)'] }
    ];
    await adapter.updateObject(ordersTable.id, {
      properties: { tableName: 'orders', columns: ordersColumns }
    });

    const orderItemsColumns = [
      { name: 'id', type: 'INT', constraints: ['PRIMARY KEY'] },
      { name: 'order_id', type: 'INT', constraints: ['FOREIGN KEY REFERENCES orders(id)'] }
    ];
    await adapter.updateObject(orderItemsTable.id, {
      properties: { tableName: 'order_items', columns: orderItemsColumns }
    });

    // Step 3: Draw auto-routing connector arrows
    const arrow1 = await adapter.createObject('arrow', 200, 150, {
      points: [[200, 150], [400, 150]],
      properties: { from: usersTable.id, to: ordersTable.id }
    });
    const arrow2 = await adapter.createObject('arrow', 500, 150, {
      points: [[500, 150], [700, 150]],
      properties: { from: ordersTable.id, to: orderItemsTable.id }
    });
    expect(arrow1.type).toBe('arrow');
    expect(arrow2.type).toBe('arrow');

    // Step 4: Place a SQL code snippet block, write DDL commands, and execute
    const sqlBlock = await adapter.createObject('code', 100, 400, {
      text: 'CREATE TABLE users (id INT PRIMARY KEY);\nCREATE TABLE orders (id INT PRIMARY KEY);\nCREATE TABLE order_items (id INT PRIMARY KEY);',
      properties: { language: 'sql' }
    });

    const executionResult = await adapter.executeCode(sqlBlock.id);
    expect(executionResult.exit_code).toBe(0);
    expect(executionResult.stdout).toContain('users created successfully');
    expect(executionResult.stdout).toContain('orders created successfully');
    expect(executionResult.stdout).toContain('order_items created successfully');

    // Step 5: Export the entire board diagram as a PNG
    const png = await adapter.exportTo('png');
    expect(png).toContain('data:image/png;base64,');
  });

  it('Scenario 2: System Architecture Planning with Network Mocks', async () => {
    const adapter = new MockDevBoardAdapter();

    // Step 1: Design 3-tier layout by creating network-node objects
    const lb = await adapter.createObject('network-node', 100, 100, { properties: { type: 'load-balancer' } });
    const server = await adapter.createObject('network-node', 300, 100, { properties: { type: 'web-server' } });
    const cache = await adapter.createObject('network-node', 500, 50, { properties: { type: 'redis-cache' } });
    const db = await adapter.createObject('network-node', 500, 200, { properties: { type: 'postgresql-db' } });

    // Step 2: Connect nodes with labeled arrows
    const arrowLB = await adapter.createObject('arrow', 150, 100, { points: [[150, 100], [300, 100]], text: 'HTTP' });
    const arrowCache = await adapter.createObject('arrow', 350, 100, { points: [[350, 100], [500, 50]], text: 'gRPC' });
    const arrowDB = await adapter.createObject('arrow', 350, 100, { points: [[350, 100], [500, 200]], text: 'SQL' });

    // Step 3: Place a sticky note next to cache node
    const stickyNote = await adapter.createObject('text', 600, 50, { text: 'eviction: volatile-lru' });
    expect(stickyNote.text).toBe('eviction: volatile-lru');

    // Step 4: Switch board to dark mode using Cmd+K command palette
    await adapter.triggerKeyboardShortcut('cmd+k');
    expect(await adapter.isCommandPaletteOpen()).toBe(true);
    await adapter.setTheme('dark');
    expect(await adapter.getTheme()).toBe('dark');

    // Step 5: Select all components, group them, and save custom template
    const ids = [lb.id, server.id, cache.id, db.id, arrowLB.id, arrowCache.id, arrowDB.id, stickyNote.id];
    await adapter.selectObjects(ids);
    await adapter.triggerKeyboardShortcut('cmd+g');

    const updatedLB = await adapter.getObject(lb.id);
    expect(updatedLB?.properties?.groupId).toBeDefined();

    const groupObjects = (await adapter.getObjects()).filter(o => o.properties?.groupId === updatedLB?.properties?.groupId);
    expect(groupObjects.length).toBe(ids.length);
  });

  it('Scenario 3: Git Branch Visualizer & CLI Command Testbed', async () => {
    const adapter = new MockDevBoardAdapter();

    // Step 1: Drag a Git branch template onto the canvas with 3 commits
    const gitObj = await adapter.createObject('git-branch', 100, 100, {
      properties: {
        commits: [
          { id: 'c1', branch: 'main' },
          { id: 'c2', branch: 'main' },
          { id: 'c3', branch: 'main' }
        ]
      }
    });

    // Step 2: Draw a feature branch off c2 with 2 new commits
    const step2Commits = [
      ...gitObj.properties?.commits,
      { id: 'c4', branch: 'feature', parent: 'c2' },
      { id: 'c5', branch: 'feature', parent: 'c4' }
    ];
    await adapter.updateObject(gitObj.id, {
      properties: { commits: step2Commits }
    });

    // Step 3: Draw a merge commit node representing the merge back to main
    const step3Commits = [
      ...step2Commits,
      { id: 'c6', branch: 'main', parents: ['c3', 'c5'], isMerge: true }
    ];
    const finalGit = await adapter.updateObject(gitObj.id, {
      properties: { commits: step3Commits }
    });
    expect(finalGit.properties?.commits.length).toBe(6);

    // Step 4: Place a shell script code block writing a script that simulates git CLI operations
    const shellBlock = await adapter.createObject('code', 100, 300, {
      text: 'git checkout -b feature && git commit -m "feat"',
      properties: { language: 'bash' }
    });

    // Step 5: Run the shell script and add a comment on the merge node requesting a code review
    const runResult = await adapter.executeCode(shellBlock.id);
    expect(runResult.exit_code).toBe(0);
    expect(runResult.stdout).toContain("Switched to a new branch 'feature'");

    const comment = await adapter.addCommentPin(150, 150, 'Please review this merge commit');
    expect(comment.replies[0].text).toBe('Please review this merge commit');
  });

  it('Scenario 4: Code Sprint Kanban Board & Backlog Grooming', async () => {
    const [clientA, clientB] = await createConnectedClients('kanban_sprint_room', [
      { id: 'client_a', name: 'Alice' },
      { id: 'client_b', name: 'Bob' }
    ]);

    // Step 1: Alice drags Kanban board onto the canvas
    const kanban = await clientA.createObject('kanban-board', 100, 100, {
      properties: {
        columns: {
          'Backlog': [],
          'In Progress': [],
          'Review': [],
          'Done': []
        }
      }
    });

    // Step 2: Populate with 5 distinct task cards in Backlog
    const initialTasks = [
      { id: 'task1', title: 'Auth Service', priority: 'high' },
      { id: 'task2', title: 'Landing Page', priority: 'medium' },
      { id: 'task3', title: 'Database Migration', priority: 'high' },
      { id: 'task4', title: 'API Integration', priority: 'low' },
      { id: 'task5', title: 'Write Tests', priority: 'high' }
    ];
    await clientA.updateObject(kanban.id, {
      properties: {
        columns: {
          'Backlog': initialTasks,
          'In Progress': [],
          'Review': [],
          'Done': []
        }
      }
    });

    // Step 3: Alice & Bob collaborate
    await new Promise(r => setTimeout(r, 25));
    const kanbanOnBob = await clientB.getObject(kanban.id);
    expect(kanbanOnBob?.properties?.columns['Backlog'].length).toBe(5);

    // Step 4: Alice moves a card from Backlog to In Progress
    const updatedColumns = {
      'Backlog': initialTasks.filter(t => t.id !== 'task1'),
      'In Progress': [initialTasks[0]],
      'Review': [],
      'Done': []
    };
    await clientA.updateObject(kanban.id, {
      properties: { columns: updatedColumns }
    });

    const comment = await clientB.addCommentPin(200, 200, 'I will take the Auth Service task');

    // Step 5: Autosaves and changes are broadcasted
    await clientA.autoSave();
    await clientB.autoSave();
    await new Promise(r => setTimeout(r, 25));

    const finalKanbanOnBob = await clientB.getObject(kanban.id);
    expect(finalKanbanOnBob?.properties?.columns['In Progress'].length).toBe(1);
    expect(finalKanbanOnBob?.properties?.columns['In Progress'][0].id).toBe('task1');

    const pinsOnAlice = await clientA.getCommentPins();
    expect(pinsOnAlice.some(p => p.id === comment.id)).toBe(true);
  });

  it('Scenario 5: Remote Pair Programming & Viewport Follow', async () => {
    const [clientA, clientB] = await createConnectedClients('pair_programming_room', [
      { id: 'dev_a', name: 'Developer A' },
      { id: 'dev_b', name: 'Developer B' }
    ]);

    expect(clientA.getRoomId()).toBe('pair_programming_room');
    expect(clientB.getRoomId()).toBe('pair_programming_room');

    // Step 2: Developer A creates a Python code block with Fibonacci calculator code
    const codeBlock = await clientA.createObject('code', 100, 100, {
      text: 'def fib(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)',
      properties: { language: 'python' }
    });
    await new Promise(r => setTimeout(r, 20));

    // Step 3: Developer B enables Follow Mode to follow Developer A
    await clientB.enableFollowMode('dev_a');
    expect(clientB.getFollowedClientId()).toBe('dev_a');

    // Step 4: Developer A pans and zooms
    await clientA.pan(200, 300);
    await clientA.zoom(1.8);
    await clientA.updateCursor(250, 350);

    // Refresh viewport follow tracking
    await clientB.enableFollowMode('dev_a');

    await new Promise(r => setTimeout(r, 20));

    const viewB = await clientB.getViewport();
    expect(viewB.zoom).toBe(1.8);

    // Step 5: Developer B disables Follow Mode and clicks "Run" on the code block
    await clientB.disableFollowMode();
    expect(clientB.getFollowedClientId()).toBeNull();

    const result = await clientB.executeCode(codeBlock.id);
    expect(result.stdout).toContain('0, 1, 1, 2, 3, 5, 8, 13, 21, 34');

    await new Promise(r => setTimeout(r, 25));

    const finalBlockOnA = await clientA.getObject(codeBlock.id);
    expect(finalBlockOnA?.properties?.output).toContain('0, 1, 1, 2, 3, 5, 8, 13, 21, 34');
  });
});
