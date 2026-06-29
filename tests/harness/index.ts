export * from './types';
export * from './mock';

import { MockDevBoardAdapter } from './mock';

/**
 * Helper to bootstrap multiple mock client adapters connected to the same room.
 */
export async function createConnectedClients(
  roomId: string,
  clients: { id: string; name: string }[]
): Promise<MockDevBoardAdapter[]> {
  const adapters: MockDevBoardAdapter[] = [];

  for (const client of clients) {
    const adapter = new MockDevBoardAdapter();
    await adapter.connectRoom(roomId, client.id, client.name);
    adapters.push(adapter);
  }

  return adapters;
}
