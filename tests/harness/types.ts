export type CanvasObjectType =
  | 'freehand'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text'
  | 'code'
  | 'db-table'
  | 'network-node'
  | 'flowchart-shape'
  | 'api-card'
  | 'kanban-board'
  | 'git-branch';

export interface CanvasObject {
  id: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  points?: [number, number][];
  properties?: Record<string, any>;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  elapsed_ms: number;
}

export interface SyncMessage {
  type: 'draw' | 'cursor' | 'presence' | 'comment';
  clientId: string;
  roomId: string;
  objectId?: string;
  timestamp: number;
  vectorClock: Record<string, number>;
  payload: any;
}

export interface CommentReply {
  id: string;
  clientId: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface CommentPin {
  id: string;
  x: number;
  y: number;
  resolved: boolean;
  replies: CommentReply[];
  roomId: string;
}

export interface BoardMetadata {
  id: string;
  name: string;
  updatedAt: number;
  shapeCount: number;
}

export interface Collaborator {
  clientId: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

export interface DevBoardAdapter {
  // Canvas operations
  createObject(type: CanvasObjectType, x: number, y: number, options?: Partial<CanvasObject>): Promise<CanvasObject>;
  updateObject(id: string, updates: Partial<CanvasObject>): Promise<CanvasObject>;
  deleteObject(id: string): Promise<void>;
  getObject(id: string): Promise<CanvasObject | null>;
  getObjects(): Promise<CanvasObject[]>;
  zoom(level: number): Promise<void>;
  getZoom(): Promise<number>;
  pan(x: number, y: number): Promise<void>;
  getViewport(): Promise<{ x: number; y: number; zoom: number }>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  getUndoStackSize(): Promise<number>;
  getRedoStackSize(): Promise<number>;
  selectObjects(ids: string[]): Promise<void>;
  getSelectedObjectIds(): Promise<string[]>;
  isCommandPaletteOpen(): Promise<boolean>;

  // Theme/Rendering
  setTheme(theme: 'light' | 'dark'): Promise<void>;
  getTheme(): Promise<'light' | 'dark'>;

  // Code Execution
  executeCode(id: string): Promise<ExecutionResult>;
  executeCodeSnippet(language: string, code: string): Promise<ExecutionResult>;

  // Collaboration & Sync
  connectRoom(roomId: string, clientId: string, clientName: string): Promise<void>;
  disconnectRoom(): Promise<void>;
  getRoomId(): string | null;
  getClientId(): string | null;
  sendSyncMessage(message: SyncMessage): Promise<void>;
  receiveSyncMessage(message: SyncMessage): Promise<void>;
  getVectorClock(): Record<string, number>;
  getCollaborators(): Collaborator[];
  updateCursor(x: number, y: number): Promise<void>;
  enableFollowMode(targetClientId: string): Promise<void>;
  disableFollowMode(): Promise<void>;
  getFollowedClientId(): string | null;
  isOffline(): boolean;
  setOffline(offline: boolean): Promise<void>;
  getOfflineQueue(): SyncMessage[];

  // Comments
  addCommentPin(x: number, y: number, text: string): Promise<CommentPin>;
  addCommentReply(pinId: string, text: string): Promise<CommentPin>;
  resolveCommentPin(pinId: string): Promise<void>;
  getCommentPins(): Promise<CommentPin[]>;

  // Keyboard Shortcuts
  triggerKeyboardShortcut(shortcut: string): Promise<void>;

  // Import/Export
  exportTo(format: 'png' | 'svg' | 'json'): Promise<string>;
  importFrom(format: 'json', data: string): Promise<void>;

  // Persistence & Gallery
  createBoard(name: string): Promise<string>;
  loadBoard(boardId: string): Promise<void>;
  deleteBoard(boardId: string): Promise<void>;
  getBoards(): Promise<BoardMetadata[]>;
  autoSave(): Promise<void>;

  // Event Subscription
  on(event: 'sync', callback: (msg: SyncMessage) => void): void;
  on(event: 'cursor', callback: (data: { clientId: string; cursor?: { x: number; y: number } }) => void): void;
  on(event: 'collaborators', callback: (collaborators: Collaborator[]) => void): void;
  on(event: 'change', callback: (objects: CanvasObject[]) => void): void;
  off(event: string, callback: Function): void;
}
