import React, { useState } from 'react';
import { X, Code2, AlertCircle, Sparkles, Wand2 } from 'lucide-react';
import { useCanvas } from '../../hooks/useCanvasState';
import { ShapeType } from '../../types/canvas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagramGenerator: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addShape, viewport } = useCanvas();
  const [sourceCode, setSourceCode] = useState('');
  const [parserType, setParserType] = useState<'sql' | 'mermaid' | 'sequence' | 'class'>('sql');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setError(null);
    try {
      const canvas = document.querySelector('canvas');
      const cw = canvas?.width || 800;
      const ch = canvas?.height || 600;
      const startX = (-viewport.x + cw / 2) / viewport.zoom - 150;
      const startY = (-viewport.y + ch / 2) / viewport.zoom - 100;

      if (parserType === 'sql') {
        parseSQL(sourceCode, startX, startY);
      } else if (parserType === 'mermaid') {
        parseMermaid(sourceCode, startX, startY);
      } else if (parserType === 'sequence') {
        parseSequence(sourceCode, startX, startY);
      } else if (parserType === 'class') {
        parseClass(sourceCode, startX, startY);
      }
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to parse code. Please check your syntax.');
    }
  };

  // 1. SQL Parser
  const parseSQL = (code: string, startX: number, startY: number) => {
    // Basic CREATE TABLE parsing
    const tableRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]+?)\);/gi;
    let match;

    const tablesFound: Array<{ name: string; cols: Array<{ name: string; type: string; isPK: boolean; isFK: boolean }> }> = [];

    while ((match = tableRegex.exec(code)) !== null) {
      const tableName = match[1];
      const columnsContent = match[2];
      const columnLines = columnsContent.split(',');
      const columns: Array<{ name: string; type: string; isPK: boolean; isFK: boolean }> = [];

      columnLines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.toUpperCase().startsWith('PRIMARY KEY') || trimmed.toUpperCase().startsWith('FOREIGN KEY') || trimmed.toUpperCase().startsWith('CONSTRAINT')) {
          return;
        }

        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const colName = parts[0].replace(/['"`]/g, '');
          const colType = parts[1].replace(/,$/, '');
          const upper = trimmed.toUpperCase();
          const isPK = upper.includes('PRIMARY KEY');
          const isFK = upper.includes('REFERENCES') || upper.includes('FOREIGN KEY');
          columns.push({ name: colName, type: colType, isPK, isFK });
        }
      });

      tablesFound.push({ name: tableName, cols: columns });
    }

    if (tablesFound.length === 0) {
      throw new Error('No valid CREATE TABLE statements found. Example:\nCREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(50)\n);');
    }

    tablesFound.forEach((table, i) => {
      addShape({
        type: 'dbTable' as ShapeType,
        x: startX + i * 260,
        y: startY + (i % 2) * 50,
        width: 220,
        height: 50 + table.cols.length * 24,
        color: '#3b82f6',
        fillColor: '#1e293b',
        strokeWidth: 2,
        tableName: table.name,
        columns: table.cols,
      });
    });
  };

  // 2. Mermaid Flowchart Parser (graph TD, A[Label] --> B[Other])
  const parseMermaid = (code: string, startX: number, startY: number) => {
    const lines = code.split('\n');
    const nodes = new Map<string, { id: string; shapeId: string; text: string }>();
    const connections: Array<{ from: string; to: string; text?: string }> = [];

    // Parse Node declarations and Node connections
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('graph') || trimmed.startsWith('flowchart')) return;

      // Match node decl e.g. A[My Label] or B(Some Process)
      const nodeDeclRegex = /(\w+)(?:\[([^\]]+)\]|\(([^)]+)\))/g;
      let nodeMatch;
      while ((nodeMatch = nodeDeclRegex.exec(trimmed)) !== null) {
        const id = nodeMatch[1];
        const text = nodeMatch[2] || nodeMatch[3] || id;
        if (!nodes.has(id)) {
          nodes.set(id, { id, shapeId: '', text });
        }
      }

      // Match connection e.g. A --> B or A -->|text| B
      const connRegex = /(\w+)\s*-->\s*(?:\|([^|]+)\|\s*)?(\w+)/g;
      let connMatch;
      while ((connMatch = connRegex.exec(trimmed)) !== null) {
        const from = connMatch[1];
        const text = connMatch[2];
        const to = connMatch[3];
        connections.push({ from, to, text });

        // Ensure nodes exist
        if (!nodes.has(from)) nodes.set(from, { id: from, shapeId: '', text: from });
        if (!nodes.has(to)) nodes.set(to, { id: to, shapeId: '', text: to });
      }
    });

    if (nodes.size === 0) {
      throw new Error('No nodes found. Example:\ngraph TD\n  A[Start] --> B[Process]\n  B --> C[End]');
    }

    // Place nodes in a simple layout
    const nodeArray = Array.from(nodes.values());
    const spacing = 180;
    
    nodeArray.forEach((node, idx) => {
      const shapeId = addShape({
        type: 'flowNode' as ShapeType,
        x: startX + (idx % 3) * spacing,
        y: startY + Math.floor(idx / 3) * 120,
        width: 120,
        height: 60,
        color: '#10b981',
        fillColor: '#064e3b',
        strokeWidth: 2,
        flowType: idx === 0 ? 'start' : (idx === nodeArray.length - 1 ? 'end' : 'process'),
        text: node.text,
      });
      node.shapeId = shapeId;
    });

    // Draw connections
    connections.forEach(conn => {
      const fromNode = nodes.get(conn.from);
      const toNode = nodes.get(conn.to);

      if (fromNode?.shapeId && toNode?.shapeId) {
        addShape({
          type: 'connector' as ShapeType,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          color: '#f59e0b',
          fillColor: 'transparent',
          strokeWidth: 2,
          connectorStartShapeId: fromNode.shapeId,
          connectorEndShapeId: toNode.shapeId,
        });
      }
    });
  };

  // 3. PlantUML / Sequence Diagram Parser (Alice -> Bob: message)
  const parseSequence = (code: string, startX: number, startY: number) => {
    const lines = code.split('\n');
    const actors = new Set<string>();
    const messages: Array<{ from: string; to: string; msg: string }> = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('@start') || trimmed.startsWith('@end')) return;

      // Match A -> B : Message
      const msgRegex = /(\w+)\s*->\s*(\w+)\s*:\s*(.+)/;
      const match = msgRegex.exec(trimmed);
      if (match) {
        const from = match[1];
        const to = match[2];
        const msg = match[3];
        actors.add(from);
        actors.add(to);
        messages.push({ from, to, msg });
      } else {
        // Parse actor declarations e.g. actor Alice or participant Bob
        const actorRegex = /(?:actor|participant)\s+(\w+)/;
        const actorMatch = actorRegex.exec(trimmed);
        if (actorMatch) {
          actors.add(actorMatch[1]);
        }
      }
    });

    if (actors.size === 0) {
      throw new Error('No actors or messages found. Example:\nAlice -> Bob: hello\nBob -> WebServer: request');
    }

    // Place actor lifelines horizontally
    const actorArray = Array.from(actors);
    const actorShapeIds = new Map<string, string>();
    const spacingX = 220;

    actorArray.forEach((actor, idx) => {
      const id = addShape({
        type: 'serverBlock' as ShapeType,
        x: startX + idx * spacingX,
        y: startY,
        width: 100,
        height: 100,
        color: '#6366f1',
        fillColor: '#1e1b4b',
        strokeWidth: 2,
        serverType: actor.toLowerCase().includes('server') || actor.toLowerCase().includes('api') ? 'server' : 'client',
        serverLabel: actor,
      });
      actorShapeIds.set(actor, id);
    });

    // Draw message arrows as connectors
    messages.forEach((msg) => {
      const fromId = actorShapeIds.get(msg.from);
      const toId = actorShapeIds.get(msg.to);
      if (fromId && toId) {
        addShape({
          type: 'connector' as ShapeType,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          color: '#f43f5e',
          fillColor: 'transparent',
          strokeWidth: 2,
          connectorStartShapeId: fromId,
          connectorEndShapeId: toId,
          text: msg.msg, // Store the message as connection label
        });
      }
    });
  };

  // 4. OOP Class / Object Parser
  const parseClass = (code: string, startX: number, startY: number) => {
    // basic OOP class parsing (TypeScript / Python style)
    const classRegex = /class\s+(\w+)\s*(?:extends\s+(\w+)\s*)?\{([\s\S]*?)\}/g;
    let match;

    const classesFound: Array<{ name: string; parent?: string; fields: string[] }> = [];

    while ((match = classRegex.exec(code)) !== null) {
      const className = match[1];
      const parentName = match[2];
      const body = match[3];
      const lines = body.split('\n');
      const fields: string[] = [];

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('/') && !trimmed.startsWith('*') && !trimmed.startsWith('}')) {
          // clean constructor or methods
          if (trimmed.includes('(') || trimmed.includes('constructor')) return;
          fields.push(trimmed.replace(/;$/, ''));
        }
      });

      classesFound.push({ name: className, parent: parentName, fields });
    }

    if (classesFound.length === 0) {
      throw new Error('No valid class declarations found. Example:\nclass User {\n  id: number\n  name: string\n}');
    }

    classesFound.forEach((cls, i) => {
      addShape({
        type: 'stateNode' as ShapeType,
        x: startX + i * 220,
        y: startY + (i % 2) * 40,
        width: 180,
        height: 60 + cls.fields.length * 18,
        color: '#a855f7',
        fillColor: '#2e1065',
        strokeWidth: 2,
        stateName: cls.name,
        stateActions: cls.fields,
      });
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.98)',
          borderColor: 'rgba(71, 85, 105, 0.5)',
          animation: 'modalIn 150ms ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200">Live Code-to-Diagram</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-5 space-y-4">
          <div className="flex bg-slate-800/80 p-1 rounded-xl gap-1">
            {(['sql', 'mermaid', 'sequence', 'class'] as const).map(type => (
              <button
                key={type}
                onClick={() => setParserType(type)}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg uppercase tracking-wider transition-all ${
                  parserType === type
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5" />
              Source Code
            </label>
            <textarea
              value={sourceCode}
              onChange={e => setSourceCode(e.target.value)}
              placeholder={
                parserType === 'sql'
                  ? 'CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  name VARCHAR(50),\n  email VARCHAR(100) REFERENCES logs(email)\n);'
                  : parserType === 'mermaid'
                  ? 'graph TD\n  A[Start API] --> B[Check Auth]\n  B --> C[Fetch DB]\n  C --> D[Return JSON]'
                  : parserType === 'sequence'
                  ? 'Client -> Gateway: HTTP GET /users\nGateway -> AuthServer: checkToken()\nGateway -> DB: Query User'
                  : 'class Project {\n  id: string\n  name: string\n  status: string\n}'
              }
              rows={8}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/50 text-slate-100 font-mono text-xs outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="flex gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="whitespace-pre-line">{error}</div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Wand2 className="w-4 h-4" />
            Generate Diagram
          </button>
        </div>
      </div>
    </div>
  );
};
