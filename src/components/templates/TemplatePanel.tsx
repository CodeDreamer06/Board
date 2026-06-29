import React, { useState } from 'react';
import { useCanvas } from '../../hooks/useCanvasState';
import { CanvasShape, ShapeType } from '../../types/canvas';
import {
  X, ChevronDown, ChevronRight, Database, Server, GitBranch,
  Code2, LayoutList, Workflow, Boxes, Globe, Zap
} from 'lucide-react';

interface TemplateItem {
  name: string;
  preview: string; // Emoji or short label for preview
  shape: Omit<CanvasShape, 'id'>;
}

interface TemplateCategory {
  name: string;
  icon: React.ReactNode;
  items: TemplateItem[];
}

const defaultShapeBase = {
  color: '#3b82f6',
  fillColor: 'transparent',
  strokeWidth: 2,
  fontSize: 14,
};

const TEMPLATES: TemplateCategory[] = [
  {
    name: 'Database',
    icon: <Database className="w-4 h-4" />,
    items: [
      {
        name: 'Users Table',
        preview: '👤',
        shape: {
          ...defaultShapeBase, type: 'dbTable' as ShapeType, x: 0, y: 0, width: 220, height: 160,
          tableName: 'users',
          columns: [
            { name: 'id', type: 'uuid', isPK: true },
            { name: 'name', type: 'varchar(255)' },
            { name: 'email', type: 'varchar(255)' },
            { name: 'created_at', type: 'timestamp' },
          ],
        },
      },
      {
        name: 'Products Table',
        preview: '📦',
        shape: {
          ...defaultShapeBase, type: 'dbTable' as ShapeType, x: 0, y: 0, width: 220, height: 160,
          tableName: 'products',
          columns: [
            { name: 'id', type: 'serial', isPK: true },
            { name: 'name', type: 'varchar(255)' },
            { name: 'price', type: 'decimal(10,2)' },
            { name: 'category', type: 'varchar(100)' },
          ],
        },
      },
      {
        name: 'Orders Table',
        preview: '🛒',
        shape: {
          ...defaultShapeBase, type: 'dbTable' as ShapeType, x: 0, y: 0, width: 220, height: 160,
          tableName: 'orders',
          columns: [
            { name: 'id', type: 'serial', isPK: true },
            { name: 'user_id', type: 'uuid', isFK: true },
            { name: 'total', type: 'decimal(10,2)' },
            { name: 'status', type: 'varchar(50)' },
          ],
        },
      },
      {
        name: 'Empty Table',
        preview: '📋',
        shape: {
          ...defaultShapeBase, type: 'dbTable' as ShapeType, x: 0, y: 0, width: 220, height: 120,
          tableName: 'table_name',
          columns: [
            { name: 'id', type: 'serial', isPK: true },
            { name: 'column1', type: 'varchar' },
          ],
        },
      },
    ],
  },
  {
    name: 'Architecture',
    icon: <Server className="w-4 h-4" />,
    items: [
      { name: 'Web Server', preview: '🖥️', shape: { ...defaultShapeBase, type: 'serverBlock' as ShapeType, x: 0, y: 0, width: 100, height: 100, serverType: 'server', serverLabel: 'Web Server' } },
      { name: 'Database', preview: '🗄️', shape: { ...defaultShapeBase, type: 'serverBlock' as ShapeType, x: 0, y: 0, width: 100, height: 100, serverType: 'database', serverLabel: 'PostgreSQL' } },
      { name: 'Load Balancer', preview: '⚖️', shape: { ...defaultShapeBase, type: 'serverBlock' as ShapeType, x: 0, y: 0, width: 100, height: 100, serverType: 'loadbalancer', serverLabel: 'Load Balancer' } },
      { name: 'Message Queue', preview: '📬', shape: { ...defaultShapeBase, type: 'serverBlock' as ShapeType, x: 0, y: 0, width: 100, height: 100, serverType: 'queue', serverLabel: 'RabbitMQ' } },
      { name: 'Cache', preview: '⚡', shape: { ...defaultShapeBase, type: 'serverBlock' as ShapeType, x: 0, y: 0, width: 100, height: 100, serverType: 'cache', serverLabel: 'Redis' } },
      { name: 'CDN', preview: '🌐', shape: { ...defaultShapeBase, type: 'serverBlock' as ShapeType, x: 0, y: 0, width: 100, height: 100, serverType: 'cdn', serverLabel: 'CDN' } },
      { name: 'Client', preview: '💻', shape: { ...defaultShapeBase, type: 'serverBlock' as ShapeType, x: 0, y: 0, width: 100, height: 100, serverType: 'client', serverLabel: 'Client' } },
      { name: 'Firewall', preview: '🛡️', shape: { ...defaultShapeBase, type: 'serverBlock' as ShapeType, x: 0, y: 0, width: 100, height: 100, serverType: 'firewall', serverLabel: 'Firewall' } },
    ],
  },
  {
    name: 'Flowchart',
    icon: <Workflow className="w-4 h-4" />,
    items: [
      { name: 'Start', preview: '▶', shape: { ...defaultShapeBase, type: 'flowNode' as ShapeType, x: 0, y: 0, width: 120, height: 50, flowType: 'start', text: 'Start' } },
      { name: 'Process', preview: '▭', shape: { ...defaultShapeBase, type: 'flowNode' as ShapeType, x: 0, y: 0, width: 140, height: 60, flowType: 'process', text: 'Process' } },
      { name: 'Decision', preview: '◇', shape: { ...defaultShapeBase, type: 'flowNode' as ShapeType, x: 0, y: 0, width: 120, height: 80, flowType: 'decision', text: 'Condition?' } },
      { name: 'End', preview: '⏹', shape: { ...defaultShapeBase, type: 'flowNode' as ShapeType, x: 0, y: 0, width: 120, height: 50, flowType: 'end', text: 'End' } },
    ],
  },
  {
    name: 'API Endpoints',
    icon: <Globe className="w-4 h-4" />,
    items: [
      { name: 'GET Endpoint', preview: 'GET', shape: { ...defaultShapeBase, type: 'apiCard' as ShapeType, x: 0, y: 0, width: 280, height: 80, httpMethod: 'GET', apiPath: '/api/v1/resources', apiDescription: 'Fetch all resources' } },
      { name: 'POST Endpoint', preview: 'POST', shape: { ...defaultShapeBase, type: 'apiCard' as ShapeType, x: 0, y: 0, width: 280, height: 80, httpMethod: 'POST', apiPath: '/api/v1/resources', apiDescription: 'Create a new resource' } },
      { name: 'PUT Endpoint', preview: 'PUT', shape: { ...defaultShapeBase, type: 'apiCard' as ShapeType, x: 0, y: 0, width: 280, height: 80, httpMethod: 'PUT', apiPath: '/api/v1/resources/:id', apiDescription: 'Update a resource' } },
      { name: 'DELETE Endpoint', preview: 'DEL', shape: { ...defaultShapeBase, type: 'apiCard' as ShapeType, x: 0, y: 0, width: 280, height: 80, httpMethod: 'DELETE', apiPath: '/api/v1/resources/:id', apiDescription: 'Delete a resource' } },
    ],
  },
  {
    name: 'State Machine',
    icon: <Zap className="w-4 h-4" />,
    items: [
      { name: 'State Node', preview: '⊙', shape: { ...defaultShapeBase, type: 'stateNode' as ShapeType, x: 0, y: 0, width: 160, height: 100, stateName: 'idle', stateActions: ['entry / reset', 'exit / cleanup'] } },
      { name: 'Active State', preview: '◉', shape: { ...defaultShapeBase, type: 'stateNode' as ShapeType, x: 0, y: 0, width: 160, height: 100, stateName: 'active', stateActions: ['do / process', 'on error / retry'] } },
    ],
  },
  {
    name: 'Git',
    icon: <GitBranch className="w-4 h-4" />,
    items: [
      { name: 'Commit', preview: '●', shape: { ...defaultShapeBase, type: 'gitCommit' as ShapeType, x: 0, y: 0, width: 180, height: 80, commitHash: 'a1b2c3d', commitMessage: 'Initial commit', branchName: 'main' } },
      { name: 'Feature Commit', preview: '◆', shape: { ...defaultShapeBase, type: 'gitCommit' as ShapeType, x: 0, y: 0, width: 180, height: 80, commitHash: 'e4f5g6h', commitMessage: 'Add feature', branchName: 'feature/new' } },
    ],
  },
  {
    name: 'Code Snippets',
    icon: <Code2 className="w-4 h-4" />,
    items: [
      { name: 'JavaScript', preview: 'JS', shape: { ...defaultShapeBase, type: 'code' as ShapeType, x: 0, y: 0, width: 400, height: 250, language: 'javascript', code: '// Hello World\nfunction greet(name) {\n  console.log(`Hello, ${name}!`);\n}\n\ngreet("DevBoard");' } },
      { name: 'Python', preview: 'PY', shape: { ...defaultShapeBase, type: 'code' as ShapeType, x: 0, y: 0, width: 400, height: 250, language: 'python', code: '# Hello World\ndef greet(name):\n    print(f"Hello, {name}!")\n\ngreet("DevBoard")' } },
      { name: 'Rust', preview: 'RS', shape: { ...defaultShapeBase, type: 'code' as ShapeType, x: 0, y: 0, width: 400, height: 250, language: 'rust', code: 'fn main() {\n    let name = "DevBoard";\n    println!("Hello, {}!", name);\n}' } },
      { name: 'SQL Query', preview: 'SQL', shape: { ...defaultShapeBase, type: 'code' as ShapeType, x: 0, y: 0, width: 400, height: 200, language: 'sql', code: 'SELECT u.name, COUNT(o.id) as order_count\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nGROUP BY u.name\nORDER BY order_count DESC\nLIMIT 10;' } },
    ],
  },
  {
    name: 'Kanban',
    icon: <LayoutList className="w-4 h-4" />,
    items: [
      { name: 'Task Card', preview: '📌', shape: { ...defaultShapeBase, type: 'kanbanCard' as ShapeType, x: 0, y: 0, width: 200, height: 100, text: 'Task Title', kanbanStatus: 'todo', kanbanPriority: 'medium', kanbanAssignee: 'Dev' } },
      { name: 'Bug Card', preview: '🐛', shape: { ...defaultShapeBase, type: 'kanbanCard' as ShapeType, x: 0, y: 0, width: 200, height: 100, text: 'Fix Bug', kanbanStatus: 'in-progress', kanbanPriority: 'high', kanbanAssignee: 'QA' } },
      { name: 'Critical Card', preview: '🔥', shape: { ...defaultShapeBase, type: 'kanbanCard' as ShapeType, x: 0, y: 0, width: 200, height: 100, text: 'Critical Issue', kanbanStatus: 'blocked', kanbanPriority: 'critical', kanbanAssignee: 'Lead' } },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplatePanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addShape, viewport } = useCanvas();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Database', 'Architecture']));

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const placeTemplate = (template: TemplateItem) => {
    // Place at viewport center
    const canvas = document.querySelector('canvas');
    const cw = canvas?.width || 800;
    const ch = canvas?.height || 600;
    const centerX = (-viewport.x + cw / 2) / viewport.zoom - template.shape.width / 2;
    const centerY = (-viewport.y + ch / 2) / viewport.zoom - template.shape.height / 2;

    addShape({
      ...template.shape,
      x: centerX,
      y: centerY,
    });
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: 320 }}
    >
      <div
        className="h-full flex flex-col border-l overflow-hidden"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.97)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(71, 85, 105, 0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">Templates</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {TEMPLATES.map(category => {
            const isExpanded = expandedCategories.has(category.name);
            return (
              <div key={category.name} className="mb-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-slate-800/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                  )}
                  <span className="text-slate-400">{category.icon}</span>
                  <span className="text-sm font-medium text-slate-300">{category.name}</span>
                  <span className="text-[10px] text-slate-600 ml-auto">{category.items.length}</span>
                </button>

                {/* Items */}
                {isExpanded && (
                  <div className="px-3 pb-2 grid grid-cols-2 gap-2">
                    {category.items.map(item => (
                      <button
                        key={item.name}
                        onClick={() => placeTemplate(item)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-700/50 
                          hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200
                          hover:scale-105 active:scale-95 cursor-pointer group"
                      >
                        <span className="text-xl leading-none">{item.preview}</span>
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-200 text-center leading-tight">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700/50 text-[10px] text-slate-500">
          {TEMPLATES.reduce((acc, c) => acc + c.items.length, 0)} templates across {TEMPLATES.length} categories
        </div>
      </div>
    </div>
  );
};

export default TemplatePanel;
