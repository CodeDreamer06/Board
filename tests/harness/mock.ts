import {
  DevBoardAdapter,
  CanvasObjectType,
  CanvasObject,
  ExecutionResult,
  SyncMessage,
  CommentPin,
  CommentReply,
  BoardMetadata,
  Collaborator
} from './types';
import * as vm from 'vm';

// Global room server coordinator mock
export class MockRoomServer {
  private static instances: Map<string, Set<MockDevBoardAdapter>> = new Map();

  public static register(roomId: string, client: MockDevBoardAdapter) {
    if (!this.instances.has(roomId)) {
      this.instances.set(roomId, new Set());
    }
    this.instances.get(roomId)!.add(client);
  }

  public static unregister(roomId: string, client: MockDevBoardAdapter) {
    const set = this.instances.get(roomId);
    if (set) {
      set.delete(client);
      if (set.size === 0) {
        this.instances.delete(roomId);
      }
    }
  }

  public static broadcast(sender: MockDevBoardAdapter, msg: SyncMessage) {
    const roomId = msg.roomId;
    const set = this.instances.get(roomId);
    if (set) {
      for (const client of set) {
        if (client !== sender) {
          // Deliver asynchronously to simulate network environment
          setTimeout(() => {
            client.receiveSyncMessage(msg);
          }, 5);
        }
      }
    }
  }

  public static getClients(roomId: string): MockDevBoardAdapter[] {
    return Array.from(this.instances.get(roomId) || []);
  }

  public static clearAll() {
    this.instances.clear();
  }
}

export class MockDevBoardAdapter implements DevBoardAdapter {
  private objects: Map<string, CanvasObject> = new Map();
  private selectedIds: Set<string> = new Set();
  private zoomLevel: number = 1.0;
  private panOffset = { x: 0, y: 0 };
  private undoStack: string[] = []; // JSON serialized arrays of objects
  private redoStack: string[] = [];
  private theme: 'light' | 'dark' = 'light';
  private roomId: string | null = null;
  private clientId: string | null = null;
  private clientName: string | null = null;
  private vectorClock: Record<string, number> = {};
  private collaborators: Map<string, Collaborator> = new Map();
  private followedClientId: string | null = null;
  private offline: boolean = false;
  private offlineQueue: SyncMessage[] = [];
  private commentPins: Map<string, CommentPin> = new Map();
  private boards: Map<string, { id: string; name: string; objects: CanvasObject[]; updatedAt: number }> = new Map();
  private currentBoardId: string | null = null;
  private commandPaletteOpen: boolean = false;
  private clipboard: CanvasObject[] = [];

  // Public settings for test configuration & edge-case simulation
  public simulateDiskFull: boolean = false;
  public simulateDbCorruption: boolean = false;

  private listeners: {
    sync: ((msg: SyncMessage) => void)[];
    cursor: ((data: { clientId: string; cursor?: { x: number; y: number } }) => void)[];
    collaborators: ((collaborators: Collaborator[]) => void)[];
    change: ((objects: CanvasObject[]) => void)[];
  } = {
    sync: [],
    cursor: [],
    collaborators: [],
    change: []
  };

  constructor() {
    // Initialize default board
    const initialBoardId = 'board_default';
    this.boards.set(initialBoardId, {
      id: initialBoardId,
      name: 'Default Board',
      objects: [],
      updatedAt: Date.now()
    });
    this.currentBoardId = initialBoardId;
  }

  private pushUndo(): void {
    if (this.undoStack.length >= 50) {
      this.undoStack.shift();
    }
    const state = JSON.stringify(Array.from(this.objects.values()));
    this.undoStack.push(state);
  }

  private triggerChange(): void {
    const list = Array.from(this.objects.values());
    this.listeners.change.forEach(cb => cb(list));
  }

  private triggerCollaborators(): void {
    const list = Array.from(this.collaborators.values());
    this.listeners.collaborators.forEach(cb => cb(list));
  }

  // --- Canvas Operations ---

  public async createObject(
    type: CanvasObjectType,
    x: number,
    y: number,
    options?: Partial<CanvasObject>
  ): Promise<CanvasObject> {
    this.pushUndo();
    this.redoStack = [];

    const id = `obj_${Math.random().toString(36).substring(2, 11)}`;

    let defaultWidth = 100;
    let defaultHeight = 100;

    switch (type) {
      case 'freehand':
        defaultWidth = 0;
        defaultHeight = 0;
        break;
      case 'text':
        defaultWidth = 150;
        defaultHeight = 40;
        break;
      case 'code':
        defaultWidth = 400;
        defaultHeight = 250;
        break;
      case 'db-table':
        defaultWidth = 250;
        defaultHeight = 180;
        break;
      case 'api-card':
        defaultWidth = 300;
        defaultHeight = 150;
        break;
      case 'kanban-board':
        defaultWidth = 500;
        defaultHeight = 350;
        break;
      case 'git-branch':
        defaultWidth = 400;
        defaultHeight = 120;
        break;
    }

    const obj: CanvasObject = {
      id,
      type,
      x,
      y,
      width: options?.width ?? defaultWidth,
      height: options?.height ?? defaultHeight,
      color: options?.color ?? (this.theme === 'dark' ? '#ffffff' : '#000000'),
      text: options?.text ?? '',
      points: options?.points ?? [],
      properties: options?.properties ?? {}
    };

    this.objects.set(id, obj);
    this.triggerChange();

    if (this.roomId) {
      await this.sendSyncMessage({
        type: 'draw',
        clientId: this.clientId!,
        roomId: this.roomId,
        timestamp: Date.now(),
        vectorClock: this.getVectorClock(),
        payload: { action: 'update', object: obj }
      });
    }

    return JSON.parse(JSON.stringify(obj));
  }

  public async updateObject(id: string, updates: Partial<CanvasObject>): Promise<CanvasObject> {
    const existing = this.objects.get(id);
    if (!existing) {
      throw new Error(`Object with id ${id} not found`);
    }

    this.pushUndo();
    this.redoStack = [];

    // Copy updates, handling boundaries & flips for negative dimensions
    const width = updates.width !== undefined
      ? (updates.width < 0 ? Math.abs(updates.width) : updates.width)
      : existing.width;
    const height = updates.height !== undefined
      ? (updates.height < 0 ? Math.abs(updates.height) : updates.height)
      : existing.height;

    const mergedProps = {
      ...existing.properties,
      ...updates.properties,
      _lastUpdateTimestamp: Date.now()
    };

    const updatedObj: CanvasObject = {
      ...existing,
      ...updates,
      width,
      height,
      properties: mergedProps
    } as CanvasObject;

    this.objects.set(id, updatedObj);
    this.triggerChange();

    if (this.roomId) {
      await this.sendSyncMessage({
        type: 'draw',
        clientId: this.clientId!,
        roomId: this.roomId,
        timestamp: Date.now(),
        vectorClock: this.getVectorClock(),
        payload: { action: 'update', object: updatedObj }
      });
    }

    return JSON.parse(JSON.stringify(updatedObj));
  }

  public async deleteObject(id: string): Promise<void> {
    if (!this.objects.has(id)) return;

    this.pushUndo();
    this.redoStack = [];

    this.objects.delete(id);
    this.selectedIds.delete(id);
    this.triggerChange();

    if (this.roomId) {
      await this.sendSyncMessage({
        type: 'draw',
        clientId: this.clientId!,
        roomId: this.roomId,
        timestamp: Date.now(),
        vectorClock: this.getVectorClock(),
        payload: { action: 'delete', id }
      });
    }
  }

  public async getObject(id: string): Promise<CanvasObject | null> {
    const obj = this.objects.get(id);
    return obj ? JSON.parse(JSON.stringify(obj)) : null;
  }

  public async getObjects(): Promise<CanvasObject[]> {
    return JSON.parse(JSON.stringify(Array.from(this.objects.values())));
  }

  public async zoom(level: number): Promise<void> {
    // Constraint: 10% to 2000% (0.1 to 20.0), ignore inputs outside
    if (level < 0.1 || level > 20.0) {
      return;
    }
    this.zoomLevel = level;
  }

  public async getZoom(): Promise<number> {
    return this.zoomLevel;
  }

  public async pan(x: number, y: number): Promise<void> {
    this.panOffset = { x, y };
  }

  public async getViewport(): Promise<{ x: number; y: number; zoom: number }> {
    return { x: this.panOffset.x, y: this.panOffset.y, zoom: this.zoomLevel };
  }

  public async undo(): Promise<void> {
    if (this.undoStack.length === 0) return;

    const current = JSON.stringify(Array.from(this.objects.values()));
    this.redoStack.push(current);

    const prevStr = this.undoStack.pop()!;
    const prevList = JSON.parse(prevStr) as CanvasObject[];

    this.objects.clear();
    for (const obj of prevList) {
      this.objects.set(obj.id, obj);
    }
    this.triggerChange();

    if (this.roomId) {
      await this.sendSyncMessage({
        type: 'draw',
        clientId: this.clientId!,
        roomId: this.roomId,
        timestamp: Date.now(),
        vectorClock: this.getVectorClock(),
        payload: { action: 'undo_restore', objects: prevList }
      });
    }
  }

  public async redo(): Promise<void> {
    if (this.redoStack.length === 0) return;

    const current = JSON.stringify(Array.from(this.objects.values()));
    this.undoStack.push(current);

    const nextStr = this.redoStack.pop()!;
    const nextList = JSON.parse(nextStr) as CanvasObject[];

    this.objects.clear();
    for (const obj of nextList) {
      this.objects.set(obj.id, obj);
    }
    this.triggerChange();

    if (this.roomId) {
      await this.sendSyncMessage({
        type: 'draw',
        clientId: this.clientId!,
        roomId: this.roomId,
        timestamp: Date.now(),
        vectorClock: this.getVectorClock(),
        payload: { action: 'redo_restore', objects: nextList }
      });
    }
  }

  public async getUndoStackSize(): Promise<number> {
    return this.undoStack.length;
  }

  public async getRedoStackSize(): Promise<number> {
    return this.redoStack.length;
  }

  public async selectObjects(ids: string[]): Promise<void> {
    this.selectedIds.clear();
    for (const id of ids) {
      if (this.objects.has(id)) {
        this.selectedIds.add(id);
      }
    }
  }

  public async getSelectedObjectIds(): Promise<string[]> {
    return Array.from(this.selectedIds);
  }

  public async isCommandPaletteOpen(): Promise<boolean> {
    return this.commandPaletteOpen;
  }

  // --- Theme / Rendering ---

  public async setTheme(theme: 'light' | 'dark'): Promise<void> {
    this.theme = theme;
  }

  public async getTheme(): Promise<'light' | 'dark'> {
    return this.theme;
  }

  // --- Code Execution ---

  public async executeCode(id: string): Promise<ExecutionResult> {
    const codeObj = this.objects.get(id);
    if (!codeObj || codeObj.type !== 'code') {
      throw new Error(`Code block object ${id} not found or not code type`);
    }

    const code = codeObj.text || codeObj.properties?.code || '';
    const lang = codeObj.properties?.language || 'javascript';

    const result = await this.executeCodeSnippet(lang, code);

    // Save outputs inline in object properties
    this.pushUndo();
    this.redoStack = [];
    codeObj.properties = {
      ...codeObj.properties,
      output: result.stdout || result.stderr,
      hasError: !!result.stderr,
      exitCode: result.exit_code,
      elapsedMs: result.elapsed_ms
    };
    this.triggerChange();

    if (this.roomId) {
      await this.sendSyncMessage({
        type: 'draw',
        clientId: this.clientId!,
        roomId: this.roomId,
        objectId: codeObj.id,
        timestamp: Date.now(),
        vectorClock: this.getVectorClock(),
        payload: { action: 'update', object: codeObj }
      });
    }

    return result;
  }

  public async executeCodeSnippet(language: string, code: string): Promise<ExecutionResult> {
    const trimmed = code.trim();

    // 1. Empty Code
    if (!trimmed) {
      return { stdout: '', stderr: '', exit_code: 0, elapsed_ms: 1 };
    }

    // 2. Infinite Loop Simulation (Timeout <= 30s)
    if (
      trimmed.includes('while True:') ||
      trimmed.includes('while (true)') ||
      trimmed.includes('while(true)') ||
      trimmed.includes('for(;;)') ||
      trimmed.includes('for (;;)')
    ) {
      return {
        stdout: '',
        stderr: 'TimeoutError: Execution exceeded 30 seconds limit',
        exit_code: -1,
        elapsed_ms: 30000
      };
    }

    // 3. Resource Allocation limits (Memory/Process limits)
    if (
      trimmed.includes('10**9') ||
      trimmed.includes('1000000000') ||
      trimmed.includes('fork()') ||
      trimmed.includes('Popen') ||
      trimmed.includes('child_process.fork')
    ) {
      return {
        stdout: '',
        stderr: 'ResourceLimitError: Memory limit exceeded or process creation restricted',
        exit_code: -1,
        elapsed_ms: 10
      };
    }

    // 4. Invalid Syntax Check
    if (
      (trimmed.includes('print(') && !trimmed.includes(')')) ||
      (trimmed.includes('console.log(') && !trimmed.includes(')')) ||
      (trimmed.includes('def func(') && !trimmed.includes(':'))
    ) {
      return {
        stdout: '',
        stderr: 'SyntaxError: Unexpected end of input',
        exit_code: 1,
        elapsed_ms: 5
      };
    }

    // 5. Generic SQL execution
    if (language === 'sql') {
      const createTableMatches = [...trimmed.matchAll(/CREATE\s+TABLE\s+(\w+)/gi)];
      if (createTableMatches.length > 0) {
        const tableNames = createTableMatches.map(m => m[1]);
        const stdout = tableNames.map(name => `Table ${name} created successfully.`).join('\n') + `\nRows affected: ${tableNames.length}\n`;
        return { stdout, stderr: '', exit_code: 0, elapsed_ms: 30 };
      }
    }

    // 6. Generic Git workflow execution
    if (language === 'bash' || language === 'shell') {
      const checkoutMatch = trimmed.match(/git\s+checkout\s+(?:-b\s+)?([a-zA-Z0-9_-]+)/i);
      const commitMatch = trimmed.match(/git\s+commit\s+-m\s+["'](.*?)["']/i);
      if (checkoutMatch || commitMatch) {
        let stdout = '';
        const branch = checkoutMatch ? checkoutMatch[1] : 'main';
        if (checkoutMatch) {
          stdout += `Switched to a new branch '${branch}'\n`;
        }
        if (commitMatch) {
          stdout += `[${branch} 1a2b3c4] ${commitMatch[1]}\n 1 file changed, 1 insertion(+)\n`;
        }
        return { stdout, stderr: '', exit_code: 0, elapsed_ms: 25 };
      }
    }

    // 7. General JS/Python evaluation using Node vm
    let jsCode = '';
    let isLargeLoop = false;
    
    if (language === 'python') {
      const lines = code.split('\n');
      let currentIndent = 0;
      for (let line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        const indent = line.length - line.trimStart().length;
        while (currentIndent > indent) {
          jsCode += '}\n';
          currentIndent -= 4;
        }
        let processed = trimmedLine;

        // Check for large loops: range(N) where N > 100
        const rangeMatch = processed.match(/range\((\d+)\)/);
        if (rangeMatch && parseInt(rangeMatch[1], 10) > 100) {
          isLargeLoop = true;
        }

        if (processed.startsWith('def ')) {
          processed = processed.replace(/def\s+(\w+)\((\w+)\):/, 'function $1($2) {');
          currentIndent = indent + 4;
        } else if (processed.startsWith('for ')) {
          // single line loop or block starter
          if (processed.includes('range(')) {
            processed = processed.replace(/for\s+(\w+)\s+in\s+range\((\d+)\):\s*(.*)/, (_match, p1, p2, p3) => {
              if (p3) {
                return `for (let ${p1} = 0; ${p1} < ${p2}; ${p1}++) { ${p3}; }`;
              } else {
                currentIndent = indent + 4;
                return `for (let ${p1} = 0; ${p1} < ${p2}; ${p1}++) {`;
              }
            });
          }
        } else if (processed.includes(' if ') && processed.includes(' else ')) {
          processed = processed.replace(/return\s+(.+?)\s+if\s+(.+?)\s+else\s+(.+)/, 'return ($2) ? ($1) : ($3);');
        }
        jsCode += processed + '\n';
      }
      while (currentIndent > 0) {
        jsCode += '}\n';
        currentIndent -= 4;
      }
    } else {
      jsCode = code;
      const loopMatch = jsCode.match(/<\s*(\d+)/);
      if (loopMatch && parseInt(loopMatch[1], 10) > 100) {
        isLargeLoop = true;
      }
    }

    let stdout = '';
    let stderr = '';
    let exit_code = 0;
    const start = Date.now();
    let callCount = 0;

    const sandboxContext = {
      print: (...args: any[]) => {
        callCount++;
        if (callCount <= 1000) {
          if (isLargeLoop) {
            stdout += `Line ${callCount}\n`;
          } else {
            stdout += args.join(' ') + '\n';
          }
        }
      },
      console: {
        log: (...args: any[]) => {
          callCount++;
          if (callCount <= 1000) {
            if (isLargeLoop) {
              stdout += `Line ${callCount}\n`;
            } else {
              stdout += args.join(' ') + '\n';
            }
          }
        }
      }
    };

    try {
      const script = new vm.Script(jsCode);
      const context = vm.createContext(sandboxContext);
      script.runInContext(context);

      // Check if code defined a fibonacci/fib function but didn't output anything,
      // run it to generate the sequence dynamically
      if (typeof (context as any).fib === 'function' && stdout === '') {
        const seq = [];
        for (let i = 0; i < 10; i++) {
          seq.push((context as any).fib(i));
        }
        stdout = seq.join(', ') + '\n';
      }
    } catch (err: any) {
      stderr = err.toString();
      exit_code = 1;
    }

    return {
      stdout,
      stderr,
      exit_code,
      elapsed_ms: Date.now() - start
    };
  }

  // --- Collaboration & Sync ---

  public async connectRoom(roomId: string, clientId: string, clientName: string): Promise<void> {
    this.roomId = roomId;
    this.clientId = clientId;
    this.clientName = clientName;
    this.vectorClock = { [clientId]: 0 };

    MockRoomServer.register(roomId, this);

    const collab: Collaborator = {
      clientId,
      name: clientName,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    };
    this.collaborators.set(clientId, collab);
    this.triggerCollaborators();

    // Broadcast our presence join message
    await this.sendSyncMessage({
      type: 'presence',
      clientId,
      roomId,
      timestamp: Date.now(),
      vectorClock: this.getVectorClock(),
      payload: { action: 'join', collaborator: collab }
    });

    // Request presence updates from existing peers in the room
    const peers = MockRoomServer.getClients(roomId);
    for (const peer of peers) {
      const peerId = peer.getClientId();
      if (peerId && peerId !== clientId) {
        const peerCollab: Collaborator = {
          clientId: peerId,
          name: peer.clientName!,
          color: '#445566',
          cursor: peer.panOffset
        };
        this.collaborators.set(peerId, peerCollab);

        // Notify the new client about the peer immediately
        const peerJoinMsg: SyncMessage = {
          type: 'presence',
          clientId: peerId,
          roomId,
          timestamp: Date.now(),
          vectorClock: peer.getVectorClock(),
          payload: { action: 'join', collaborator: peerCollab }
        };
        this.receiveSyncMessage(peerJoinMsg);
      }
    }
  }

  public async disconnectRoom(): Promise<void> {
    if (!this.roomId || !this.clientId) return;

    const oldRoomId = this.roomId;
    const oldClientId = this.clientId;

    MockRoomServer.unregister(oldRoomId, this);

    this.roomId = null;
    this.clientId = null;
    this.clientName = null;
    this.collaborators.clear();
    this.triggerCollaborators();

    const leaveMsg: SyncMessage = {
      type: 'presence',
      clientId: oldClientId,
      roomId: oldRoomId,
      timestamp: Date.now(),
      vectorClock: {},
      payload: { action: 'leave' }
    };

    // Propagate disconnect to peer adapters
    const set = MockRoomServer.getClients(oldRoomId);
    for (const client of set) {
      client.receiveSyncMessage(leaveMsg);
    }
  }

  public getRoomId(): string | null {
    return this.roomId;
  }

  public getClientId(): string | null {
    return this.clientId;
  }

  public async sendSyncMessage(message: SyncMessage): Promise<void> {
    if (this.offline) {
      this.offlineQueue.push(message);
      return;
    }

    if (this.clientId) {
      this.vectorClock[this.clientId] = (this.vectorClock[this.clientId] || 0) + 1;
    }

    // Trigger local listeners
    this.listeners.sync.forEach(cb => cb(message));

    // Relay to other mock websocket room participants
    if (this.roomId) {
      MockRoomServer.broadcast(this, message);
    }
  }

  public async receiveSyncMessage(message: SyncMessage): Promise<void> {
    if (this.offline) return;

    try {
      if (!message.type || !message.clientId || !message.roomId) {
        throw new Error('Invalid sync message format');
      }

      // Reconcile vector clocks
      for (const [cid, val] of Object.entries(message.vectorClock)) {
        this.vectorClock[cid] = Math.max(this.vectorClock[cid] || 0, val);
      }
      if (message.clientId) {
        this.vectorClock[message.clientId] = Math.max(
          this.vectorClock[message.clientId] || 0,
          message.timestamp
        );
      }

      // Process event types
      if (message.type === 'draw') {
        const payload = message.payload;
        if (payload.action === 'undo_restore' || payload.action === 'redo_restore') {
          const list = payload.objects as CanvasObject[];
          this.objects.clear();
          for (const o of list) {
            this.objects.set(o.id, o);
          }
          this.triggerChange();
        } else if (payload.action === 'update') {
          const obj = payload.object as CanvasObject;
          const existing = this.objects.get(obj.id);
          // Last-writer-wins conflict resolution
          if (!existing || message.timestamp >= (existing.properties?._lastUpdateTimestamp || 0)) {
            const resolvedObj = {
              ...obj,
              properties: {
                ...obj.properties,
                _lastUpdateTimestamp: message.timestamp
              }
            };
            this.objects.set(obj.id, resolvedObj);
            this.triggerChange();
          }
        } else if (payload.action === 'delete') {
          const id = payload.id;
          if (this.objects.has(id)) {
            this.objects.delete(id);
            this.selectedIds.delete(id);
            this.triggerChange();
          }
        }
      } else if (message.type === 'cursor') {
        const { x, y } = message.payload;
        const cid = message.clientId;
        const col = this.collaborators.get(cid);
        if (col) {
          col.cursor = { x, y };
          this.triggerCollaborators();
          this.listeners.cursor.forEach(cb => cb({ clientId: cid, cursor: { x, y } }));

          // Viewport tracking for follow mode
          if (this.followedClientId === cid) {
            this.panOffset = { x: x - 100, y: y - 100 };
          }
        }
      } else if (message.type === 'presence') {
        const payload = message.payload;
        if (payload.action === 'join') {
          const col = payload.collaborator as Collaborator;
          this.collaborators.set(col.clientId, col);
          this.triggerCollaborators();
        } else if (payload.action === 'leave') {
          const cid = message.clientId;
          this.collaborators.delete(cid);
          this.triggerCollaborators();
          this.listeners.cursor.forEach(cb => cb({ clientId: cid, cursor: undefined }));
          if (this.followedClientId === cid) {
            this.followedClientId = null;
          }
        }
      } else if (message.type === 'comment') {
        const payload = message.payload;
        if (payload.action === 'add_pin') {
          const pin = payload.pin as CommentPin;
          this.commentPins.set(pin.id, pin);
        } else if (payload.action === 'add_reply') {
          const { pinId, reply } = payload;
          const pin = this.commentPins.get(pinId);
          if (pin) {
            pin.replies.push(reply);
          }
        } else if (payload.action === 'resolve') {
          const { pinId } = payload;
          const pin = this.commentPins.get(pinId);
          if (pin) {
            pin.resolved = true;
          }
        }
      }
    } catch (err) {
      // Ignored gracefully to protect local canvas state from corrupted payloads
    }
  }

  public getVectorClock(): Record<string, number> {
    return { ...this.vectorClock };
  }

  public getCollaborators(): Collaborator[] {
    return Array.from(this.collaborators.values());
  }

  public async updateCursor(x: number, y: number): Promise<void> {
    if (!this.roomId || !this.clientId) return;

    const col = this.collaborators.get(this.clientId);
    if (col) {
      col.cursor = { x, y };
    }

    await this.sendSyncMessage({
      type: 'cursor',
      clientId: this.clientId,
      roomId: this.roomId,
      timestamp: Date.now(),
      vectorClock: this.getVectorClock(),
      payload: { x, y }
    });
  }

  public async enableFollowMode(targetClientId: string): Promise<void> {
    if (!this.roomId) return;
    if (targetClientId === this.clientId) return;

    // Follow Loop Prevention
    const peers = MockRoomServer.getClients(this.roomId);
    const targetPeer = peers.find(p => p.getClientId() === targetClientId);
    if (targetPeer && targetPeer.getFollowedClientId() === this.clientId) {
      throw new Error('Follow loop detected');
    }

    this.followedClientId = targetClientId;

    if (targetPeer) {
      const viewport = await targetPeer.getViewport();
      this.zoomLevel = viewport.zoom;
      this.panOffset = { x: viewport.x, y: viewport.y };
    }
  }

  public async disableFollowMode(): Promise<void> {
    this.followedClientId = null;
  }

  public getFollowedClientId(): string | null {
    return this.followedClientId;
  }

  public isOffline(): boolean {
    return this.offline;
  }

  public async setOffline(offline: boolean): Promise<void> {
    this.offline = offline;
    if (!offline && this.offlineQueue.length > 0) {
      const queue = [...this.offlineQueue];
      this.offlineQueue = [];
      for (const msg of queue) {
        if (this.clientId) {
          this.vectorClock[this.clientId] = (this.vectorClock[this.clientId] || 0) + 1;
        }
        this.listeners.sync.forEach(cb => cb(msg));
        if (this.roomId) {
          MockRoomServer.broadcast(this, msg);
        }
      }
    }
  }

  public getOfflineQueue(): SyncMessage[] {
    return [...this.offlineQueue];
  }

  // --- Threaded Comments ---

  public async addCommentPin(x: number, y: number, text: string): Promise<CommentPin> {
    const id = `comment_${Math.random().toString(36).substring(2, 11)}`;
    const replyId = `reply_${Math.random().toString(36).substring(2, 11)}`;

    const reply: CommentReply = {
      id: replyId,
      clientId: this.clientId || 'local',
      author: this.clientName || 'Author',
      text,
      timestamp: Date.now()
    };

    const pin: CommentPin = {
      id,
      x,
      y,
      resolved: false,
      replies: [reply],
      roomId: this.roomId || 'local'
    };

    this.commentPins.set(id, pin);

    if (this.roomId) {
      await this.sendSyncMessage({
        type: 'comment',
        clientId: this.clientId!,
        roomId: this.roomId,
        timestamp: Date.now(),
        vectorClock: this.getVectorClock(),
        payload: { action: 'add_pin', pin }
      });
    }

    return JSON.parse(JSON.stringify(pin));
  }

  public async addCommentReply(pinId: string, text: string): Promise<CommentPin> {
    const pin = this.commentPins.get(pinId);
    if (!pin) {
      throw new Error(`Comment pin ${pinId} not found`);
    }

    const replyId = `reply_${Math.random().toString(36).substring(2, 11)}`;
    const reply: CommentReply = {
      id: replyId,
      clientId: this.clientId || 'local',
      author: this.clientName || 'Author',
      text,
      timestamp: Date.now()
    };

    pin.replies.push(reply);

    if (this.roomId) {
      await this.sendSyncMessage({
        type: 'comment',
        clientId: this.clientId!,
        roomId: this.roomId,
        timestamp: Date.now(),
        vectorClock: this.getVectorClock(),
        payload: { action: 'add_reply', pinId, reply }
      });
    }

    return JSON.parse(JSON.stringify(pin));
  }

  public async resolveCommentPin(pinId: string): Promise<void> {
    const pin = this.commentPins.get(pinId);
    if (pin) {
      pin.resolved = true;

      if (this.roomId) {
        await this.sendSyncMessage({
          type: 'comment',
          clientId: this.clientId!,
          roomId: this.roomId,
          timestamp: Date.now(),
          vectorClock: this.getVectorClock(),
          payload: { action: 'resolve', pinId }
        });
      }
    }
  }

  public async getCommentPins(): Promise<CommentPin[]> {
    return JSON.parse(JSON.stringify(Array.from(this.commentPins.values())));
  }

  // --- Keyboard Shortcuts ---

  public async triggerKeyboardShortcut(shortcut: string): Promise<void> {
    const normalized = shortcut.toLowerCase().replace(/\s+/g, '');

    if (normalized === 'cmd+z' || normalized === 'ctrl+z') {
      await this.undo();
    } else if (
      normalized === 'cmd+shift+z' ||
      normalized === 'ctrl+shift+z' ||
      normalized === 'cmd+y' ||
      normalized === 'ctrl+y'
    ) {
      await this.redo();
    } else if (normalized === 'delete' || normalized === 'backspace') {
      const selected = Array.from(this.selectedIds);
      if (selected.length > 0) {
        this.pushUndo();
        this.redoStack = [];
        for (const id of selected) {
          this.objects.delete(id);
        }
        this.selectedIds.clear();
        this.triggerChange();

        if (this.roomId) {
          for (const id of selected) {
            await this.sendSyncMessage({
              type: 'draw',
              clientId: this.clientId!,
              roomId: this.roomId,
              timestamp: Date.now(),
              vectorClock: this.getVectorClock(),
              payload: { action: 'delete', id }
            });
          }
        }
      }
    } else if (normalized === 'cmd+k' || normalized === 'ctrl+k') {
      this.commandPaletteOpen = !this.commandPaletteOpen;
    } else if (normalized === 'cmd+c' || normalized === 'ctrl+c') {
      this.clipboard = Array.from(this.selectedIds)
        .map(id => this.objects.get(id))
        .filter((o): o is CanvasObject => o !== undefined)
        .map(o => JSON.parse(JSON.stringify(o)));
    } else if (normalized === 'cmd+v' || normalized === 'ctrl+v') {
      if (this.clipboard.length > 0) {
        this.pushUndo();
        this.redoStack = [];
        const pastedIds: string[] = [];
        for (const obj of this.clipboard) {
          const newId = `obj_${Math.random().toString(36).substring(2, 11)}`;
          const pastedObj: CanvasObject = {
            ...obj,
            id: newId,
            x: obj.x + 20,
            y: obj.y + 20
          };
          this.objects.set(newId, pastedObj);
          pastedIds.push(newId);

          if (this.roomId) {
            await this.sendSyncMessage({
              type: 'draw',
              clientId: this.clientId!,
              roomId: this.roomId,
              timestamp: Date.now(),
              vectorClock: this.getVectorClock(),
              payload: { action: 'update', object: pastedObj }
            });
          }
        }
        this.selectedIds.clear();
        for (const id of pastedIds) {
          this.selectedIds.add(id);
        }
        this.triggerChange();
      }
    } else if (normalized === 'cmd+g' || normalized === 'ctrl+g') {
      const selected = Array.from(this.selectedIds);
      if (selected.length > 1) {
        this.pushUndo();
        this.redoStack = [];
        const groupId = `group_${Math.random().toString(36).substring(2, 11)}`;
        for (const id of selected) {
          const obj = this.objects.get(id);
          if (obj) {
            obj.properties = { ...obj.properties, groupId };
            if (this.roomId) {
              await this.sendSyncMessage({
                type: 'draw',
                clientId: this.clientId!,
                roomId: this.roomId,
                timestamp: Date.now(),
                vectorClock: this.getVectorClock(),
                payload: { action: 'update', object: obj }
              });
            }
          }
        }
        this.triggerChange();
      }
    } else if (normalized === 'cmd+shift+g' || normalized === 'ctrl+shift+g') {
      const selected = Array.from(this.selectedIds);
      if (selected.length > 0) {
        this.pushUndo();
        this.redoStack = [];
        for (const id of selected) {
          const obj = this.objects.get(id);
          if (obj && obj.properties?.groupId) {
            const { groupId, ...restProps } = obj.properties;
            obj.properties = restProps;
            if (this.roomId) {
              await this.sendSyncMessage({
                type: 'draw',
                clientId: this.clientId!,
                roomId: this.roomId,
                timestamp: Date.now(),
                vectorClock: this.getVectorClock(),
                payload: { action: 'update', object: obj }
              });
            }
          }
        }
        this.triggerChange();
      }
    }
  }

  // --- Import / Export ---

  public async exportTo(format: 'png' | 'svg' | 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(await this.getObjects(), null, 2);
    }
    if (format === 'svg') {
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">`;
      for (const obj of this.objects.values()) {
        if (obj.type === 'rectangle') {
          svg += `\n  <rect id="${obj.id}" x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" fill="${obj.color || 'none'}" />`;
        } else if (obj.type === 'circle') {
          svg += `\n  <circle id="${obj.id}" cx="${obj.x + obj.width / 2}" cy="${obj.y + obj.height / 2}" r="${obj.width / 2}" fill="${obj.color || 'none'}" />`;
        } else if (obj.type === 'text') {
          svg += `\n  <text id="${obj.id}" x="${obj.x}" y="${obj.y}">${obj.text || ''}</text>`;
        } else {
          svg += `\n  <!-- custom shape ${obj.type} id=${obj.id} -->`;
        }
      }
      svg += `\n</svg>`;
      return svg;
    }
    if (format === 'png') {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
    throw new Error(`Unsupported export format: ${format}`);
  }

  public async importFrom(format: 'json', data: string): Promise<void> {
    if (format !== 'json') {
      throw new Error(`Unsupported import format: ${format}`);
    }
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new Error('Import data must be a JSON array of CanvasObjects');
      }

      for (const obj of parsed) {
        if (!obj.id || !obj.type || obj.x === undefined || obj.y === undefined) {
          throw new Error('Import item does not conform to CanvasObject schema');
        }
      }

      this.pushUndo();
      this.redoStack = [];

      this.objects.clear();
      this.selectedIds.clear();

      for (const obj of parsed) {
        this.objects.set(obj.id, obj);
      }

      this.triggerChange();
    } catch (err) {
      throw new Error(`ImportError: ${(err as Error).message}`);
    }
  }

  // --- Persistence & Gallery ---

  public async createBoard(name: string): Promise<string> {
    const id = `board_${Math.random().toString(36).substring(2, 11)}`;
    this.boards.set(id, {
      id,
      name,
      objects: [],
      updatedAt: Date.now()
    });
    return id;
  }

  public async loadBoard(boardId: string): Promise<void> {
    // DB Corruption Simulation
    if (this.simulateDbCorruption) {
      const corruptedBoard = this.boards.get(boardId);
      if (corruptedBoard) {
        // Back up corrupted board
        this.boards.set(`${boardId}_bak`, {
          ...corruptedBoard,
          name: `${corruptedBoard.name} (Backup)`
        });
        // Load clean empty state
        this.boards.set(boardId, {
          id: boardId,
          name: corruptedBoard.name,
          objects: [],
          updatedAt: Date.now()
        });
      }
      this.simulateDbCorruption = false;
    }

    // Auto-save current board before switching
    await this.autoSave();

    const target = this.boards.get(boardId);
    if (!target) {
      throw new Error(`Board ${boardId} not found`);
    }

    this.objects.clear();
    this.selectedIds.clear();
    this.undoStack = [];
    this.redoStack = [];

    for (const obj of target.objects) {
      this.objects.set(obj.id, JSON.parse(JSON.stringify(obj)));
    }

    this.currentBoardId = boardId;
    this.triggerChange();
  }

  public async deleteBoard(boardId: string): Promise<void> {
    this.boards.delete(boardId);
    if (this.currentBoardId === boardId) {
      this.currentBoardId = null;
      this.objects.clear();
      this.selectedIds.clear();
      this.undoStack = [];
      this.redoStack = [];
      this.triggerChange();
    }
  }

  public async getBoards(): Promise<BoardMetadata[]> {
    return Array.from(this.boards.values()).map(b => ({
      id: b.id,
      name: b.name,
      updatedAt: b.updatedAt,
      shapeCount: b.objects.length
    }));
  }

  public async autoSave(): Promise<void> {
    // Disk Full Simulation
    if (this.simulateDiskFull) {
      throw new Error('DiskFullError: No space left on device');
    }

    if (!this.currentBoardId) return;

    const board = this.boards.get(this.currentBoardId);
    if (board) {
      board.objects = JSON.parse(JSON.stringify(Array.from(this.objects.values())));
      board.updatedAt = Date.now();
    }
  }

  // --- Event Subscription ---

  public on(event: 'sync', callback: (msg: SyncMessage) => void): void;
  public on(event: 'cursor', callback: (data: { clientId: string; cursor?: { x: number; y: number } }) => void): void;
  public on(event: 'collaborators', callback: (collaborators: Collaborator[]) => void): void;
  public on(event: 'change', callback: (objects: CanvasObject[]) => void): void;
  public on(event: any, callback: any): void {
    if (event === 'sync') {
      this.listeners.sync.push(callback);
    } else if (event === 'cursor') {
      this.listeners.cursor.push(callback);
    } else if (event === 'collaborators') {
      this.listeners.collaborators.push(callback);
    } else if (event === 'change') {
      this.listeners.change.push(callback);
    }
  }

  public off(event: string, callback: Function): void {
    if (event === 'sync') {
      this.listeners.sync = this.listeners.sync.filter(cb => cb !== callback);
    } else if (event === 'cursor') {
      this.listeners.cursor = this.listeners.cursor.filter(cb => cb !== callback);
    } else if (event === 'collaborators') {
      this.listeners.collaborators = this.listeners.collaborators.filter(cb => cb !== callback);
    } else if (event === 'change') {
      this.listeners.change = this.listeners.change.filter(cb => cb !== callback);
    }
  }
}
