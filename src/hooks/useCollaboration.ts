import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncClient, ConnectionStatus, RemoteUser, SyncMessage } from '../utils/syncClient';
import { RemoteCursor } from '../components/collaboration/RemoteCursors';
import { useCanvas } from './useCanvasState';

const SYNC_URL = 'ws://localhost:8080';

function generateClientId(): string {
  return 'client_' + Math.random().toString(36).substring(2, 10);
}

export function useCollaboration() {
  const ctx = useCanvas();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [roomCode, setRoomCode] = useState('');
  const [clientId] = useState(() => generateClientId());
  const [displayName] = useState(() => `User-${clientId.slice(7, 11)}`);

  const syncClientRef = useRef<SyncClient | null>(null);
  const shapesRef = useRef(ctx.shapes);
  shapesRef.current = ctx.shapes;

  const handleRemoteOperation = useCallback((msg: SyncMessage) => {
    if (msg.type !== 'draw') return;
    const { action, shape, objectId } = msg.payload;

    if (action === 'create' && shape) {
      const exists = shapesRef.current.some(s => s.id === objectId);
      if (!exists) {
        ctx.setShapes(prev => [...prev, { ...shape, id: objectId }]);
      }
    } else if (action === 'update' && shape) {
      ctx.setShapes(prev => prev.map(s =>
        s.id === objectId ? { ...s, ...shape } : s
      ));
    } else if (action === 'delete') {
      ctx.setShapes(prev => prev.filter(s => s.id !== objectId));
    }
  }, [ctx]);

  const handleSyncResponse = useCallback((operations: SyncMessage[]) => {
    // Apply all operations from the server to reconstruct state
    const shapeMap = new Map<string, any>();
    operations.forEach(op => {
      if (op.type === 'draw' && op.payload) {
        const { action, shape, objectId } = op.payload;
        if (action === 'create' && shape) {
          shapeMap.set(objectId || shape.id, { ...shape, id: objectId || shape.id });
        } else if (action === 'update' && shape && objectId) {
          const existing = shapeMap.get(objectId);
          if (existing) {
            shapeMap.set(objectId, { ...existing, ...shape });
          }
        } else if (action === 'delete' && objectId) {
          shapeMap.delete(objectId);
        }
      }
    });

    if (shapeMap.size > 0) {
      ctx.setShapes(prev => {
        const localIds = new Set(prev.map(s => s.id));
        const remoteShapes = Array.from(shapeMap.values()).filter(s => !localIds.has(s.id));
        return [...prev, ...remoteShapes];
      });
    }
  }, [ctx]);



  // Create room
  const createRoom = useCallback(() => {
    const newRoomId = 'room_' + Math.random().toString(36).substring(2, 8);
    const client = new SyncClient(
      { url: SYNC_URL, clientId, roomId: newRoomId, displayName },
      {
        onConnectionStatusChange: setConnectionStatus,
        onPresenceUpdate: (users, code) => {
          setRemoteUsers(users);
          if (code) setRoomCode(code);
        },
        onCursorUpdate: (cid, cursor) => {
          setRemoteCursors(prev => {
            const next = new Map(prev);
            next.set(cid, { ...cursor, lastUpdate: Date.now() });
            return next;
          });
        },
        onRemoteOperation: handleRemoteOperation,
        onSyncResponse: handleSyncResponse,
      }
    );
    if (syncClientRef.current) syncClientRef.current.disconnect();
    syncClientRef.current = client;
    client.connect();
  }, [clientId, displayName, handleRemoteOperation, handleSyncResponse]);

  // Join room
  const joinRoom = useCallback((code: string) => {
    const client = new SyncClient(
      { url: SYNC_URL, clientId, roomId: code, displayName },
      {
        onConnectionStatusChange: setConnectionStatus,
        onPresenceUpdate: (users, rCode) => {
          setRemoteUsers(users);
          if (rCode) setRoomCode(rCode);
        },
        onCursorUpdate: (cid, cursor) => {
          setRemoteCursors(prev => {
            const next = new Map(prev);
            next.set(cid, { ...cursor, lastUpdate: Date.now() });
            return next;
          });
        },
        onRemoteOperation: handleRemoteOperation,
        onSyncResponse: handleSyncResponse,
      }
    );
    if (syncClientRef.current) syncClientRef.current.disconnect();
    syncClientRef.current = client;
    setRoomCode(code);
    client.connect();
  }, [clientId, displayName, handleRemoteOperation, handleSyncResponse]);

  // Leave room
  const leaveRoom = useCallback(() => {
    if (syncClientRef.current) {
      syncClientRef.current.disconnect();
      syncClientRef.current = null;
    }
    setConnectionStatus('disconnected');
    setRemoteUsers([]);
    setRemoteCursors(new Map());
    setRoomCode('');
  }, []);

  // Send draw operation
  const sendOperation = useCallback((action: 'create' | 'update' | 'delete', objectId: string, shape?: any) => {
    syncClientRef.current?.sendOperation('draw', { action, objectId, shape }, objectId);
  }, []);

  // Send cursor update
  const sendCursorUpdate = useCallback((x: number, y: number) => {
    syncClientRef.current?.sendCursorUpdate(x, y);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      syncClientRef.current?.disconnect();
    };
  }, []);

  return {
    connectionStatus,
    remoteUsers,
    remoteCursors,
    roomCode,
    clientId,
    createRoom,
    joinRoom,
    leaveRoom,
    sendOperation,
    sendCursorUpdate,
  };
}
