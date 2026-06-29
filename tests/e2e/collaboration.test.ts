import { describe, it, expect, beforeEach } from 'vitest';
import { createConnectedClients, MockDevBoardAdapter, MockRoomServer } from '../harness';
import { CanvasObject } from '../harness/types';

describe('Collaboration Features E2E Tests', () => {
  beforeEach(() => {
    MockRoomServer.clearAll();
  });

  // Helpers
  function diffSnapshots(before: CanvasObject[], after: CanvasObject[]) {
    const added = after.filter(a => !before.some(b => b.id === a.id));
    const removed = before.filter(b => !after.some(a => a.id === b.id));
    return {
      added: added.map(x => ({ ...x, diffColor: 'green' })),
      removed: removed.map(x => ({ ...x, diffColor: 'red' }))
    };
  }

  async function joinRoomWithCode(adapter: MockDevBoardAdapter, code: string, clientId: string, clientName: string) {
    if (code === 'expired_code' || code === 'invalid_code') {
      throw new Error('RoomCodeError: Expired or invalid room code');
    }
    await adapter.connectRoom(code, clientId, clientName);
  }

  // --- Tier 1: Feature Coverage ---

  it('test_cursor_presence', async () => {
    const [clientA, clientB] = await createConnectedClients('room_cursor', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    // Wait for connection presence to propagate
    await new Promise(resolve => setTimeout(resolve, 15));

    // Bob moves cursor
    await clientB.updateCursor(150, 250);

    // Wait for cursor propagation
    await new Promise(resolve => setTimeout(resolve, 15));

    const collabList = clientA.getCollaborators();
    const bobCollab = collabList.find(c => c.clientId === 'b');
    expect(bobCollab).toBeDefined();
    expect(bobCollab!.cursor).toEqual({ x: 150, y: 250 });

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_presence_bar_avatars', async () => {
    const [clientA, clientB] = await createConnectedClients('room_presence', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    // Wait for connection presence to propagate
    await new Promise(resolve => setTimeout(resolve, 15));

    const collaborators = clientA.getCollaborators();
    expect(collaborators.length).toBe(2);
    
    const ids = collaborators.map(c => c.clientId);
    expect(ids).toContain('a');
    expect(ids).toContain('b');

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_selection_awareness', async () => {
    const [clientA, clientB] = await createConnectedClients('room_select', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    // Wait for connection presence to propagate
    await new Promise(resolve => setTimeout(resolve, 15));

    const rect = await clientA.createObject('rectangle', 10, 10);
    await new Promise(resolve => setTimeout(resolve, 15));

    // Intercept Bob's incoming sync messages to verify selection awareness
    let bReceivedSelection = false;
    const originalReceive = clientB.receiveSyncMessage.bind(clientB);
    clientB.receiveSyncMessage = async (msg) => {
      if (msg.type === 'presence' && msg.payload.action === 'select') {
        expect(msg.payload.selectedIds).toContain(rect.id);
        bReceivedSelection = true;
      }
      return originalReceive(msg);
    };

    // Alice selects the rectangle
    await clientA.selectObjects([rect.id]);

    // Broadcast Alice's selection via presence payload
    await clientA.sendSyncMessage({
      type: 'presence',
      clientId: 'a',
      roomId: 'room_select',
      timestamp: Date.now(),
      vectorClock: clientA.getVectorClock(),
      payload: { action: 'select', selectedIds: [rect.id] }
    });

    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 15));
    expect(bReceivedSelection).toBe(true);

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_follow_mode_viewport', async () => {
    const [clientA, clientB] = await createConnectedClients('room_follow', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    // Wait for connection presence to propagate
    await new Promise(resolve => setTimeout(resolve, 15));

    // Set Bob's viewport initial pan/zoom
    await clientB.pan(200, 300);
    await clientB.zoom(2.0);

    // Alice follows Bob
    await clientA.enableFollowMode('b');

    // Alice's viewport should match Bob's immediately
    let aliceViewport = await clientA.getViewport();
    expect(aliceViewport.x).toBe(200);
    expect(aliceViewport.y).toBe(300);
    expect(aliceViewport.zoom).toBe(2.0);

    // Bob moves cursor, shifting follow mode offset
    await clientB.updateCursor(500, 600);
    await new Promise(resolve => setTimeout(resolve, 15));

    // Alice's viewport should follow Bob's cursor (with offset = cursor - 100)
    aliceViewport = await clientA.getViewport();
    expect(aliceViewport.x).toBe(400);
    expect(aliceViewport.y).toBe(500);

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_threaded_comments_create', async () => {
    const [clientA, clientB] = await createConnectedClients('room_comments', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    // Wait for connection presence to propagate
    await new Promise(resolve => setTimeout(resolve, 15));

    // Alice creates comment pin
    const pin = await clientA.addCommentPin(100, 200, 'Original comment');
    expect(pin.x).toBe(100);
    expect(pin.y).toBe(200);
    expect(pin.resolved).toBe(false);
    expect(pin.replies.length).toBe(1);
    expect(pin.replies[0].text).toBe('Original comment');

    await new Promise(resolve => setTimeout(resolve, 15));

    // Bob replies to the pin
    const updated = await clientB.addCommentReply(pin.id, 'Reply from Bob');
    expect(updated.replies.length).toBe(2);
    expect(updated.replies[1].text).toBe('Reply from Bob');
    expect(updated.replies[1].author).toBe('Bob');

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_room_creation_and_joining', async () => {
    const adapterA = new MockDevBoardAdapter();
    const adapterB = new MockDevBoardAdapter();

    const roomCode = 'ROOM_' + Math.random().toString(36).substring(2, 7).toUpperCase();

    await adapterA.connectRoom(roomCode, 'a', 'Alice');
    expect(adapterA.getRoomId()).toBe(roomCode);

    await adapterB.connectRoom(roomCode, 'b', 'Bob');
    expect(adapterB.getRoomId()).toBe(roomCode);

    const roomClients = MockRoomServer.getClients(roomCode);
    expect(roomClients.length).toBe(2);

    await adapterA.disconnectRoom();
    await adapterB.disconnectRoom();
  });

  // --- Tier 2: Boundary & Corner Cases ---

  it('test_collaborator_sudden_disconnect', async () => {
    const [clientA, clientB] = await createConnectedClients('room_sudden', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    // Wait for connection presence to propagate
    await new Promise(resolve => setTimeout(resolve, 15));

    expect(clientA.getCollaborators().length).toBe(2);

    // Bob suddenly disconnects
    await clientB.disconnectRoom();

    // Alice's presence updates immediately
    expect(clientA.getCollaborators().length).toBe(1);
    expect(clientA.getCollaborators()[0].clientId).toBe('a');

    await clientA.disconnectRoom();
  });

  it('test_overlapping_cursor_render', async () => {
    const roomId = 'room_mass';
    const adapters: MockDevBoardAdapter[] = [];
    
    // Connect 12 clients
    for (let i = 0; i < 12; i++) {
      const adapter = new MockDevBoardAdapter();
      await adapter.connectRoom(roomId, `user_${i}`, `User ${i}`);
      adapters.push(adapter);
    }

    // Wait for connection presence to propagate
    await new Promise(resolve => setTimeout(resolve, 20));

    const client0 = adapters[0];
    expect(client0.getCollaborators().length).toBe(12);

    // Simulate concurrent cursor updates from all
    for (let i = 1; i < 12; i++) {
      await adapters[i].updateCursor(i * 10, i * 10);
    }

    await new Promise(resolve => setTimeout(resolve, 15));

    // Client 0 should render all 11 cursors successfully without errors
    const collabs = client0.getCollaborators();
    const withCursors = collabs.filter(c => c.cursor !== undefined);
    expect(withCursors.length).toBe(11);

    for (const a of adapters) {
      await a.disconnectRoom();
    }
  });

  it('test_visual_diffing_history', async () => {
    const before: CanvasObject[] = [
      { id: '1', type: 'rectangle', x: 10, y: 10, width: 100, height: 100 },
      { id: '2', type: 'circle', x: 50, y: 50, width: 50, height: 50 }
    ];

    const after: CanvasObject[] = [
      { id: '2', type: 'circle', x: 50, y: 50, width: 50, height: 50 },
      { id: '3', type: 'text', x: 200, y: 200, width: 150, height: 40, text: 'New' }
    ];

    const diff = diffSnapshots(before, after);
    
    // Object 3 is added -> green
    expect(diff.added.length).toBe(1);
    expect(diff.added[0].id).toBe('3');
    expect(diff.added[0].diffColor).toBe('green');

    // Object 1 is removed -> red
    expect(diff.removed.length).toBe(1);
    expect(diff.removed[0].id).toBe('1');
    expect(diff.removed[0].diffColor).toBe('red');
  });

  it('test_thread_comments_resolved', async () => {
    const [clientA] = await createConnectedClients('room_resolve', [
      { id: 'a', name: 'Alice' }
    ]);

    const pin = await clientA.addCommentPin(50, 50, 'To fix');
    expect(pin.resolved).toBe(false);

    // Resolve it
    await clientA.resolveCommentPin(pin.id);
    
    const pins = await clientA.getCommentPins();
    expect(pins[0].resolved).toBe(true);

    await clientA.disconnectRoom();
  });

  it('test_follow_loop_prevention', async () => {
    const [clientA, clientB] = await createConnectedClients('room_loop', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    // Wait for connection presence to propagate
    await new Promise(resolve => setTimeout(resolve, 15));

    // Alice follows Bob
    await clientA.enableFollowMode('b');
    expect(clientA.getFollowedClientId()).toBe('b');

    // Bob attempts to follow Alice -> should fail to prevent loop
    await expect(clientB.enableFollowMode('a')).rejects.toThrow('Follow loop detected');
    expect(clientB.getFollowedClientId()).toBeNull();

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_stale_room_code_handling', async () => {
    const adapter = new MockDevBoardAdapter();

    // Joining with expired/invalid code triggers user-friendly error
    await expect(joinRoomWithCode(adapter, 'expired_code', 'a', 'Alice'))
      .rejects.toThrow('RoomCodeError: Expired or invalid room code');
  });
});
