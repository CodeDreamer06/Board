import { VectorClock, increment, merge } from './vectorClock';

// ──────────────────── Types ────────────────────

export interface SyncMessage {
  type: 'draw' | 'cursor' | 'presence' | 'comment' | 'sync_request' | 'sync_response' | 'ack' | 'room_info';
  clientId: string;
  roomId: string;
  objectId?: string;
  timestamp: number;
  vectorClock: VectorClock;
  payload: any;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface RemoteUser {
  clientId: string;
  name: string;
  color: string;
}

export interface SyncClientConfig {
  url: string;
  clientId: string;
  roomId: string;
  displayName?: string;
}

export interface SyncClientCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  onRemoteOperation?: (msg: SyncMessage) => void;
  onPresenceUpdate?: (users: RemoteUser[], roomCode: string) => void;
  onCursorUpdate?: (clientId: string, cursor: { x: number; y: number; name: string; color: string }) => void;
  onError?: (error: Error) => void;
  onAck?: (objectId: string) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  onSyncResponse?: (operations: SyncMessage[]) => void;
}

// ──────────────────── Constants ────────────────────

const MAX_RECONNECT_ATTEMPTS = 20;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 10000;
const CURSOR_THROTTLE_MS = 50; // 20 updates/sec

// ──────────────────── Client ────────────────────

export class SyncClient {
  private ws: WebSocket | null = null;
  private config: SyncClientConfig;
  private callbacks: SyncClientCallbacks;
  private vectorClock: VectorClock = {};

  // Reconnection state
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  // Offline queue
  private offlineQueue: SyncMessage[] = [];

  // Heartbeat
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // Cursor throttle
  private lastCursorSend = 0;

  // Status
  private _status: ConnectionStatus = 'disconnected';

  constructor(config: SyncClientConfig, callbacks: SyncClientCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
    this.vectorClock[config.clientId] = 0;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.callbacks.onConnectionStatusChange?.(status);
  }

  // ──────── Connect ────────

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.intentionalClose = false;
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        console.log(`[Sync] Connected to ${this.config.url}`);
        this.setStatus('connected');

        const wasReconnect = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;

        // Start heartbeat
        this.startHeartbeat();

        // Request full sync
        this.sendRaw({
          type: 'sync_request',
          clientId: this.config.clientId,
          roomId: this.config.roomId,
          timestamp: Date.now(),
          vectorClock: { ...this.vectorClock },
          payload: { name: this.config.displayName || this.config.clientId },
        });

        // Send initial presence
        this.sendPresence();

        // Flush offline queue
        this.flushOfflineQueue();

        if (wasReconnect) {
          this.callbacks.onReconnect?.();
        } else {
          this.callbacks.onConnect?.();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: SyncMessage = JSON.parse(event.data as string);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[Sync] Failed to parse message', e);
        }
      };

      this.ws.onerror = () => {
        this.callbacks.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.setStatus('disconnected');
        this.callbacks.onDisconnect?.();

        if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      this.scheduleReconnect();
    }
  }

  // ──────── Message Handling ────────

  private handleMessage(msg: SyncMessage) {
    // Merge vector clocks on receive
    if (msg.vectorClock && Object.keys(msg.vectorClock).length > 0) {
      this.vectorClock = merge(this.vectorClock, msg.vectorClock);
    }

    switch (msg.type) {
      case 'draw':
        this.callbacks.onRemoteOperation?.(msg);
        break;

      case 'cursor':
        if (msg.clientId !== this.config.clientId) {
          this.callbacks.onCursorUpdate?.(msg.clientId, msg.payload);
        }
        break;

      case 'presence':
        if (msg.payload?.users) {
          this.callbacks.onPresenceUpdate?.(msg.payload.users, msg.payload.roomCode || '');
        }
        break;

      case 'comment':
        this.callbacks.onRemoteOperation?.(msg);
        break;

      case 'sync_response':
        if (msg.payload?.operations) {
          this.callbacks.onSyncResponse?.(msg.payload.operations);
        }
        break;

      case 'ack':
        if (msg.objectId) {
          this.callbacks.onAck?.(msg.objectId);
        }
        break;

      default:
        break;
    }
  }

  // ──────── Sending ────────

  private sendRaw(msg: SyncMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  sendOperation(type: SyncMessage['type'], payload: any, objectId?: string): void {
    this.vectorClock = increment(this.vectorClock, this.config.clientId);

    const msg: SyncMessage = {
      type,
      clientId: this.config.clientId,
      roomId: this.config.roomId,
      objectId,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock },
      payload,
    };

    if (!this.sendRaw(msg)) {
      // Queue for later
      if (type === 'draw' || type === 'comment') {
        this.offlineQueue.push(msg);
      }
    }
  }

  sendCursorUpdate(x: number, y: number): void {
    const now = Date.now();
    if (now - this.lastCursorSend < CURSOR_THROTTLE_MS) return;
    this.lastCursorSend = now;

    this.sendRaw({
      type: 'cursor',
      clientId: this.config.clientId,
      roomId: this.config.roomId,
      timestamp: now,
      vectorClock: { ...this.vectorClock },
      payload: {
        x, y,
        name: this.config.displayName || this.config.clientId,
        color: '#3b82f6',
      },
    });
  }

  private sendPresence(): void {
    this.sendRaw({
      type: 'presence',
      clientId: this.config.clientId,
      roomId: this.config.roomId,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock },
      payload: {
        name: this.config.displayName || this.config.clientId,
        active: true,
      },
    });
  }

  // ──────── Offline Queue ────────

  private flushOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return;
    console.log(`[Sync] Flushing ${this.offlineQueue.length} queued operations`);
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    for (const msg of queue) {
      this.sendRaw(msg);
    }
  }

  // ──────── Reconnection ────────

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[Sync] Max reconnect attempts reached');
      return;
    }

    const baseDelay = Math.min(
      BASE_BACKOFF_MS * Math.pow(2, this.reconnectAttempts),
      MAX_BACKOFF_MS
    );
    // Add ±20% jitter
    const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
    const delay = Math.round(baseDelay + jitter);

    console.log(`[Sync] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // ──────── Heartbeat ────────

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendPresence();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ──────── Disconnect ────────

  disconnect(): void {
    this.intentionalClose = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  // ──────── Accessors ────────

  getVectorClock(): VectorClock {
    return { ...this.vectorClock };
  }

  getQueueSize(): number {
    return this.offlineQueue.length;
  }
}
