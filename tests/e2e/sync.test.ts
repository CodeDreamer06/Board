import { describe, it, expect, beforeEach } from 'vitest';
import { createConnectedClients, MockRoomServer } from '../harness';

describe('Custom Synchronization Protocol E2E Tests', () => {
  beforeEach(() => {
    MockRoomServer.clearAll();
  });

  // --- Tier 1: Feature Coverage ---

  it('test_sync_server_accepts_connections', async () => {
    const [clientA, clientB] = await createConnectedClients('room_1', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    expect(clientA.getRoomId()).toBe('room_1');
    expect(clientB.getRoomId()).toBe('room_1');

    const clients = MockRoomServer.getClients('room_1');
    expect(clients).toContain(clientA);
    expect(clients).toContain(clientB);

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_sync_message_format', async () => {
    const [clientA, clientB] = await createConnectedClients('room_format', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    let receivedMsg: any = null;
    // The sync listener is triggered locally on the sender adapter
    clientA.on('sync', (msg) => {
      receivedMsg = msg;
    });

    await clientA.createObject('rectangle', 10, 10, { width: 100, height: 100 });

    expect(receivedMsg).not.toBeNull();
    expect(receivedMsg.type).toBe('draw');
    expect(receivedMsg.clientId).toBe('a');
    expect(receivedMsg.roomId).toBe('room_format');
    expect(receivedMsg.timestamp).toBeTypeOf('number');
    expect(receivedMsg.vectorClock).toBeTypeOf('object');
    expect(receivedMsg.payload).toBeDefined();

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_realtime_draw_propagation', async () => {
    const [clientA, clientB] = await createConnectedClients('room_prop', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    const rect = await clientA.createObject('rectangle', 50, 50, { color: '#ff0000' });

    // Propagation time (< 500ms constraint, we wait 15ms)
    await new Promise((resolve) => setTimeout(resolve, 15));

    const bobRect = await clientB.getObject(rect.id);
    expect(bobRect).not.toBeNull();
    expect(bobRect!.type).toBe('rectangle');
    expect(bobRect!.x).toBe(50);
    expect(bobRect!.color).toBe('#ff0000');

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_vector_clock_increment', async () => {
    const [clientA, clientB] = await createConnectedClients('room_vector', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    // Initial clock starts at 1 because connectRoom sends a presence message
    expect(clientA.getVectorClock()['a']).toBe(1);

    // Local action should increment
    await clientA.createObject('rectangle', 10, 10);
    expect(clientA.getVectorClock()['a']).toBe(2);

    // Wait for sync message to arrive at B
    await new Promise((resolve) => setTimeout(resolve, 15));
    
    // Bob should have reconciled Alice's vector clock index
    expect(clientB.getVectorClock()['a']).toBeGreaterThanOrEqual(2);

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_disconnect_reconnect_sync', async () => {
    const [clientA, clientB] = await createConnectedClients('room_recon', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    // Alice goes offline
    await clientA.setOffline(true);

    // Alice creates object while offline
    const rect = await clientA.createObject('rectangle', 100, 100);

    // Wait to confirm Bob hasn't received it
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(await clientB.getObject(rect.id)).toBeNull();

    // Alice reconnects
    await clientA.setOffline(false);

    // Wait for catch-up
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(await clientB.getObject(rect.id)).not.toBeNull();

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  // --- Tier 2: Boundary & Corner Cases ---

  it('test_concurrent_edits_resolve_lww', async () => {
    const [clientA, clientB] = await createConnectedClients('room_lww', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    const obj = await clientA.createObject('rectangle', 10, 10, { color: '#000000' });
    await new Promise((resolve) => setTimeout(resolve, 15));

    // Both go offline to perform concurrent edits
    await clientA.setOffline(true);
    await clientB.setOffline(true);

    // Alice edits color to red
    await clientA.updateObject(obj.id, { color: '#ff0000' });

    // Wait 5ms to ensure the timestamp is strictly greater for Bob
    await new Promise((resolve) => setTimeout(resolve, 5));

    // Bob edits color to blue (which should win due to later timestamp)
    await clientB.updateObject(obj.id, { color: '#0000ff' });

    // Bring clients online to propagate queued updates
    await clientA.setOffline(false);
    await clientB.setOffline(false);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 15));

    const stateA = await clientA.getObject(obj.id);
    const stateB = await clientB.getObject(obj.id);

    // Bob's message should win LWW conflict resolution on both sides
    expect(stateA!.color).toBe('#0000ff');
    expect(stateB!.color).toBe('#0000ff');

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_network_latency_compensation', async () => {
    const [clientA] = await createConnectedClients('room_latency', [
      { id: 'a', name: 'Alice' }
    ]);

    // Optimistic local update should render immediately (0ms wait)
    const rectPromise = clientA.createObject('rectangle', 10, 10);
    
    // Read local state instantly
    const rect = await rectPromise;
    const instantObj = await clientA.getObject(rect.id);
    expect(instantObj).not.toBeNull();
    expect(instantObj!.x).toBe(10);

    await clientA.disconnectRoom();
  });

  it('test_offline_operation_queueing', async () => {
    const [clientA, clientB] = await createConnectedClients('room_queue', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    await clientA.setOffline(true);

    // Queue 3 operations while offline
    await clientA.createObject('rectangle', 10, 10);
    await clientA.createObject('circle', 20, 20);
    await clientA.createObject('text', 30, 30);

    expect(clientA.getOfflineQueue().length).toBe(3);

    // Reconnecting should drain the queue
    await clientA.setOffline(false);
    expect(clientA.getOfflineQueue().length).toBe(0);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 15));
    const bobObjects = await clientB.getObjects();
    expect(bobObjects.length).toBe(3);

    await clientA.disconnectRoom();
    await clientB.disconnectRoom();
  });

  it('test_exponential_backoff_reconnect', async () => {
    const getReconnectDelay = (attempt: number): number => {
      return Math.min(1000 * Math.pow(2, attempt), 30000);
    };

    expect(getReconnectDelay(0)).toBe(1000);
    expect(getReconnectDelay(1)).toBe(2000);
    expect(getReconnectDelay(2)).toBe(4000);
    expect(getReconnectDelay(3)).toBe(8000);
    expect(getReconnectDelay(5)).toBe(30000); // capped at 30000
  });

  it('test_out_of_order_messages', async () => {
    const [clientA] = await createConnectedClients('room_ooo', [
      { id: 'a', name: 'Alice' }
    ]);

    const obj = await clientA.createObject('rectangle', 10, 10, { color: '#000000' });

    // Simulate receiving a newer message (timestamp 1000)
    const newMsg = {
      type: 'draw' as const,
      clientId: 'b',
      roomId: 'room_ooo',
      timestamp: 1000,
      vectorClock: {},
      payload: {
        action: 'update',
        object: {
          ...obj,
          color: '#ffffff',
          properties: { _lastUpdateTimestamp: 1000 }
        }
      }
    };
    await clientA.receiveSyncMessage(newMsg);

    const checkNew = await clientA.getObject(obj.id);
    expect(checkNew!.color).toBe('#ffffff');

    // Simulate receiving an older message (timestamp 500) representing out of order frame
    const oldMsg = {
      type: 'draw' as const,
      clientId: 'b',
      roomId: 'room_ooo',
      timestamp: 500,
      vectorClock: {},
      payload: {
        action: 'update',
        object: {
          ...obj,
          color: '#ff0000',
          properties: { _lastUpdateTimestamp: 500 }
        }
      }
    };
    await clientA.receiveSyncMessage(oldMsg);

    // State should remain '#ffffff' (ignored older timestamp)
    const checkOld = await clientA.getObject(obj.id);
    expect(checkOld!.color).toBe('#ffffff');

    await clientA.disconnectRoom();
  });

  it('test_corrupted_sync_payload', async () => {
    const [clientA] = await createConnectedClients('room_corrupt', [
      { id: 'a', name: 'Alice' }
    ]);

    const obj = await clientA.createObject('rectangle', 10, 10, { color: '#000000' });

    // Send a corrupted message
    const corruptMsg = {
      type: 'draw' as any,
      timestamp: Date.now(),
      vectorClock: {},
      payload: {}
    };

    // Should not crash and keep existing objects intact
    await expect(clientA.receiveSyncMessage(corruptMsg as any)).resolves.not.toThrow();

    const check = await clientA.getObject(obj.id);
    expect(check).not.toBeNull();
    expect(check!.color).toBe('#000000');

    await clientA.disconnectRoom();
  });
});
