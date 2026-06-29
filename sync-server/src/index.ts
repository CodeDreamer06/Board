import { WebSocketServer, WebSocket } from 'ws';

// ──────────────────── Types ────────────────────

interface SyncMessage {
  type: 'draw' | 'cursor' | 'presence' | 'comment' | 'sync_request' | 'sync_response' | 'ack' | 'room_info';
  clientId: string;
  roomId: string;
  objectId?: string;
  timestamp: number;
  vectorClock: Record<string, number>;
  payload: any;
}

interface ClientInfo {
  ws: WebSocket;
  name: string;
  color: string;
  lastHeartbeat: number;
}

interface RoomState {
  code: string;
  operations: SyncMessage[];
  clients: Map<string, ClientInfo>;
  colorIndex: number;
}

// ──────────────────── Constants ────────────────────

const PORT = 8080;
const MAX_OPS_PER_ROOM = 1000;
const HEARTBEAT_TIMEOUT_MS = 30_000;
const HEARTBEAT_CHECK_INTERVAL_MS = 10_000;

const COLOR_PALETTE = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#a855f7', '#e11d48', '#84cc16',
];

// ──────────────────── State ────────────────────

const rooms = new Map<string, RoomState>();
const roomCodeMap = new Map<string, string>(); // code -> roomId

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    let code = generateRoomCode();
    while (roomCodeMap.has(code)) code = generateRoomCode();
    const room: RoomState = {
      code,
      operations: [],
      clients: new Map(),
      colorIndex: 0,
    };
    rooms.set(roomId, room);
    roomCodeMap.set(code, roomId);
  }
  return rooms.get(roomId)!;
}

function assignColor(room: RoomState): string {
  const color = COLOR_PALETTE[room.colorIndex % COLOR_PALETTE.length];
  room.colorIndex++;
  return color;
}

function mergeVectorClocks(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const merged = { ...a };
  for (const [k, v] of Object.entries(b)) {
    merged[k] = Math.max(merged[k] || 0, v);
  }
  return merged;
}

function areConcurrent(a: Record<string, number>, b: Record<string, number>): boolean {
  let aGreater = false, bGreater = false;
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of allKeys) {
    const va = a[k] || 0;
    const vb = b[k] || 0;
    if (va > vb) aGreater = true;
    if (vb > va) bGreater = true;
  }
  return aGreater && bGreater;
}

// ──────────────────── Server ────────────────────

const wss = new WebSocketServer({ port: PORT });

console.log(`\n  ⚡ DevBoard Sync Server`);
console.log(`  ─────────────────────────`);
console.log(`  Port:    ${PORT}`);
console.log(`  Status:  Ready for connections`);
console.log(`  Proto:   WebSocket (ws://localhost:${PORT})\n`);

wss.on('connection', (ws: WebSocket) => {
  let clientRoomId: string | null = null;
  let clientUuid: string | null = null;

  ws.on('message', (raw: Buffer) => {
    try {
      const msg: SyncMessage = JSON.parse(raw.toString());
      if (!msg.roomId || !msg.clientId) return;

      clientRoomId = msg.roomId;
      clientUuid = msg.clientId;
      const room = getOrCreateRoom(clientRoomId);

      // Register client if not present
      if (!room.clients.has(clientUuid)) {
        const color = assignColor(room);
        const name = msg.payload?.name || `User-${clientUuid.slice(0, 4)}`;
        room.clients.set(clientUuid, { ws, name, color, lastHeartbeat: Date.now() });
        console.log(`[${room.code}] ${name} joined (${room.clients.size} clients)`);

        // Broadcast presence update to all clients
        broadcastPresence(room);
      } else {
        // Update ws ref and heartbeat
        const client = room.clients.get(clientUuid)!;
        client.ws = ws;
        client.lastHeartbeat = Date.now();
        if (msg.payload?.name) client.name = msg.payload.name;
      }

      switch (msg.type) {
        case 'draw': {
          // Conflict resolution: LWW with vector clock comparison
          const existing = room.operations.findIndex(
            op => op.objectId === msg.objectId && op.type === 'draw'
          );

          if (existing >= 0 && msg.objectId) {
            const existingOp = room.operations[existing];
            if (areConcurrent(existingOp.vectorClock, msg.vectorClock)) {
              // Concurrent: use timestamp as tiebreaker (LWW)
              if (msg.timestamp >= existingOp.timestamp) {
                room.operations[existing] = msg;
              }
              // else keep existing
            } else {
              // Not concurrent: just replace
              room.operations[existing] = msg;
            }
          } else {
            room.operations.push(msg);
            if (room.operations.length > MAX_OPS_PER_ROOM) {
              room.operations.shift();
            }
          }

          // Send ack to sender
          const ack: SyncMessage = {
            type: 'ack',
            clientId: 'server',
            roomId: msg.roomId,
            objectId: msg.objectId,
            timestamp: Date.now(),
            vectorClock: msg.vectorClock,
            payload: { acked: true },
          };
          ws.send(JSON.stringify(ack));

          // Broadcast to all other clients
          broadcastToOthers(room, clientUuid!, msg);
          break;
        }

        case 'cursor': {
          // Relay cursor updates to all others (no storage needed)
          broadcastToOthers(room, clientUuid!, msg);
          break;
        }

        case 'presence': {
          const client = room.clients.get(clientUuid!);
          if (client) {
            client.lastHeartbeat = Date.now();
            if (msg.payload?.name) client.name = msg.payload.name;
          }
          broadcastPresence(room);
          break;
        }

        case 'comment': {
          room.operations.push(msg);
          broadcastToOthers(room, clientUuid!, msg);
          break;
        }

        case 'sync_request': {
          // Send full state to requesting client
          const response: SyncMessage = {
            type: 'sync_response',
            clientId: 'server',
            roomId: msg.roomId,
            timestamp: Date.now(),
            vectorClock: {},
            payload: {
              operations: room.operations.filter(op => op.type === 'draw'),
              roomCode: room.code,
            },
          };
          ws.send(JSON.stringify(response));

          // Also send current presence
          broadcastPresence(room);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  ws.on('close', () => {
    if (clientRoomId && clientUuid) {
      const room = rooms.get(clientRoomId);
      if (room) {
        const client = room.clients.get(clientUuid);
        if (client) {
          console.log(`[${room.code}] ${client.name} disconnected (${room.clients.size - 1} clients)`);
        }
        room.clients.delete(clientUuid);

        if (room.clients.size === 0) {
          // Keep room alive for reconnection, clean up after 5 min
          setTimeout(() => {
            const r = rooms.get(clientRoomId!);
            if (r && r.clients.size === 0) {
              roomCodeMap.delete(r.code);
              rooms.delete(clientRoomId!);
              console.log(`[${r.code}] Room cleaned up (empty)`);
            }
          }, 5 * 60 * 1000);
        } else {
          broadcastPresence(room);
        }
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
});

// ──────────────────── Helpers ────────────────────

function broadcastToOthers(room: RoomState, senderId: string, msg: SyncMessage) {
  const data = JSON.stringify(msg);
  for (const [cid, client] of room.clients.entries()) {
    if (cid !== senderId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function broadcastPresence(room: RoomState) {
  const users = Array.from(room.clients.entries()).map(([id, c]) => ({
    clientId: id,
    name: c.name,
    color: c.color,
  }));

  const msg: SyncMessage = {
    type: 'presence',
    clientId: 'server',
    roomId: '',
    timestamp: Date.now(),
    vectorClock: {},
    payload: { users, roomCode: room.code },
  };

  const data = JSON.stringify(msg);
  for (const client of room.clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

// ──────────────────── Heartbeat Cleanup ────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    for (const [clientId, client] of room.clients.entries()) {
      if (now - client.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        console.log(`[${room.code}] ${client.name} timed out`);
        client.ws.close();
        room.clients.delete(clientId);
      }
    }
    if (room.clients.size > 0) {
      broadcastPresence(room);
    }
  }
}, HEARTBEAT_CHECK_INTERVAL_MS);
