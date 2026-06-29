export type ShapeType =
  | 'freehand'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text'
  | 'sticky'
  | 'connector'
  | 'code'
  | 'dbTable'
  | 'apiCard'
  | 'serverBlock'
  | 'flowNode'
  | 'stateNode'
  | 'gitCommit'
  | 'kanbanCard';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string; // Stroke color or text color
  fillColor: string; // Fill color (can be 'transparent')
  strokeWidth: number;
  text?: string;
  points?: Point[]; // Used for freehand
  groupId?: string; // ID of the group this shape belongs to
  fontSize?: number;
  fontStyle?: 'normal' | 'bold' | 'italic';
  
  // Connector properties
  connectorStartShapeId?: string;
  connectorEndShapeId?: string;
  connectorStartPoint?: Point;
  connectorEndPoint?: Point;

  // Code block
  code?: string;
  language?: string;
  codeOutput?: string;
  codeRunning?: boolean;

  // DB Table
  tableName?: string;
  columns?: Array<{ name: string; type: string; isPK?: boolean; isFK?: boolean }>;

  // API Card
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  apiPath?: string;
  apiDescription?: string;
  httpHeaders?: string;
  httpBody?: string;
  httpResponse?: string;
  httpStatus?: number;
  httpRunning?: boolean;

  // REPL pipelines
  replChainId?: string;
  replEnvironment?: string;

  // Server Block
  serverType?: 'server' | 'database' | 'client' | 'loadbalancer' | 'queue' | 'cache' | 'cdn' | 'firewall';
  serverLabel?: string;

  // Flow Node
  flowType?: 'process' | 'decision' | 'start' | 'end' | 'io';

  // State Node
  stateName?: string;
  stateActions?: string[];

  // Git
  commitHash?: string;
  commitMessage?: string;
  branchName?: string;

  // Kanban
  kanbanStatus?: string;
  kanbanAssignee?: string;
  kanbanPriority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface Viewport {
  x: number; // Pan offset X
  y: number; // Pan offset Y
  zoom: number; // Zoom level (e.g. 1.0)
}

export interface AlignmentGuide {
  type: 'h' | 'v';
  coord: number;
  start: number;
  end: number;
}

export interface PresentationSlide {
  id: string;
  name: string;
  x: number;
  y: number;
  zoom: number;
}

