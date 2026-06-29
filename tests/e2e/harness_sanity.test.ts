import { describe, it, expect } from 'vitest';
import { createConnectedClients } from '../harness';

describe('E2E Test Harness Sanity', () => {
  it('should create and connect clients', async () => {
    const [clientA, clientB] = await createConnectedClients('test_room', [
      { id: 'client_a', name: 'Client A' },
      { id: 'client_b', name: 'Client B' }
    ]);

    expect(clientA.getRoomId()).toBe('test_room');
    expect(clientB.getRoomId()).toBe('test_room');
    expect(clientA.getClientId()).toBe('client_a');
    expect(clientB.getClientId()).toBe('client_b');
  });

  it('should sync drawn shapes between clients', async () => {
    const [clientA, clientB] = await createConnectedClients('sync_room', [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' }
    ]);

    // Alice draws a rectangle
    const rect = await clientA.createObject('rectangle', 10, 20, { width: 100, height: 50 });
    expect(rect.type).toBe('rectangle');
    expect(rect.x).toBe(10);
    expect(rect.y).toBe(20);

    // Wait slightly for simulated async network propagation
    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify Bob received the shape
    const bobObj = await clientB.getObject(rect.id);
    expect(bobObj).not.toBeNull();
    expect(bobObj!.type).toBe('rectangle');
    expect(bobObj!.x).toBe(10);
    expect(bobObj!.y).toBe(20);
  });
});
