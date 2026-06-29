import { CanvasShape } from '../../types/canvas';

// ──────────────────── DB Table Renderer ────────────────────

export function renderDbTable(ctx: CanvasRenderingContext2D, shape: CanvasShape, theme: 'light' | 'dark') {
  const { x, y, width, height } = shape;
  const headerH = 32;
  const rowH = 24;
  const radius = 8;
  const cols = shape.columns || [];

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  // Container
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = theme === 'dark' ? '#1e293b' : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = theme === 'dark' ? '#475569' : '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Header
  ctx.beginPath();
  ctx.roundRect(x, y, width, headerH, [radius, radius, 0, 0]);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`⊞ ${shape.tableName || 'table'}`, x + 10, y + headerH / 2);

  // Columns
  ctx.textAlign = 'left';
  ctx.font = '12px "JetBrains Mono", monospace';
  cols.forEach((col, i) => {
    const rowY = y + headerH + i * rowH;
    if (rowY + rowH > y + height) return;

    if (i % 2 === 0) {
      ctx.fillStyle = theme === 'dark' ? 'rgba(51, 65, 85, 0.3)' : 'rgba(241, 245, 249, 0.8)';
      ctx.fillRect(x + 1, rowY, width - 2, rowH);
    }

    let prefix = '  ';
    if (col.isPK) prefix = '🔑';
    if (col.isFK) prefix = '🔗';

    ctx.fillStyle = theme === 'dark' ? '#e2e8f0' : '#334155';
    ctx.fillText(`${prefix} ${col.name}`, x + 8, rowY + rowH / 2);

    ctx.fillStyle = theme === 'dark' ? '#64748b' : '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(col.type, x + width - 8, rowY + rowH / 2);
    ctx.textAlign = 'left';
  });
}

// ──────────────────── API Card Renderer ────────────────────

export function renderApiCard(ctx: CanvasRenderingContext2D, shape: CanvasShape, theme: 'light' | 'dark') {
  const { x, y, width, height } = shape;
  const radius = 10;
  const method = shape.httpMethod || 'GET';

  const methodColors: Record<string, string> = {
    GET: '#22c55e', POST: '#3b82f6', PUT: '#f59e0b',
    DELETE: '#ef4444', PATCH: '#8b5cf6',
  };

  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = theme === 'dark' ? '#1e293b' : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = methodColors[method] + '60';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Method badge
  const badgeW = 56;
  const badgeH = 22;
  ctx.beginPath();
  ctx.roundRect(x + 12, y + 12, badgeW, badgeH, 4);
  ctx.fillStyle = methodColors[method] || '#6b7280';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(method, x + 12 + badgeW / 2, y + 12 + badgeH / 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = theme === 'dark' ? '#e2e8f0' : '#1e293b';
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillText(shape.apiPath || '/api/endpoint', x + 12 + badgeW + 10, y + 23);

  ctx.fillStyle = theme === 'dark' ? '#94a3b8' : '#64748b';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(shape.apiDescription || 'Endpoint description', x + 12, y + 50);

  // Status and response preview
  if (shape.httpStatus) {
    const statusColor = shape.httpStatus >= 200 && shape.httpStatus < 300 ? '#22c55e' : '#ef4444';
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(`${shape.httpStatus} STATUS`, x + 12, y + height - 22);

    if (shape.httpResponse) {
      ctx.fillStyle = theme === 'dark' ? '#64748b' : '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      const cleanResp = shape.httpResponse.replace(/\s+/g, ' ').slice(0, 30);
      ctx.fillText(cleanResp, x + 80, y + height - 22);
    }
  } else if (shape.httpRunning) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'italic 10px "JetBrains Mono", monospace';
    ctx.fillText('Sending Request...', x + 12, y + height - 22);
  }
}

// ──────────────────── Server Block Renderer ────────────────────

export function renderServerBlock(ctx: CanvasRenderingContext2D, shape: CanvasShape, theme: 'light' | 'dark') {
  const { x, y, width, height } = shape;
  const iconSize = Math.min(width, height) * 0.5;
  const cx = x + width / 2;
  const cy = y + height * 0.4;

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fillStyle = theme === 'dark' ? '#1e293b' : '#f1f5f9';
  ctx.fill();
  ctx.strokeStyle = theme === 'dark' ? '#334155' : '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.strokeStyle = theme === 'dark' ? '#60a5fa' : '#3b82f6';
  ctx.fillStyle = theme === 'dark' ? '#60a5fa' : '#3b82f6';
  ctx.lineWidth = 2;

  switch (shape.serverType) {
    case 'database':
      ctx.beginPath();
      ctx.ellipse(cx, cy - iconSize * 0.3, iconSize * 0.4, iconSize * 0.15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - iconSize * 0.4, cy - iconSize * 0.3);
      ctx.lineTo(cx - iconSize * 0.4, cy + iconSize * 0.3);
      ctx.ellipse(cx, cy + iconSize * 0.3, iconSize * 0.4, iconSize * 0.15, 0, Math.PI, 0, true);
      ctx.lineTo(cx + iconSize * 0.4, cy - iconSize * 0.3);
      ctx.stroke();
      break;
    case 'loadbalancer':
      ctx.beginPath();
      ctx.moveTo(cx, cy - iconSize * 0.3);
      ctx.lineTo(cx - iconSize * 0.3, cy + iconSize * 0.2);
      ctx.moveTo(cx, cy - iconSize * 0.3);
      ctx.lineTo(cx + iconSize * 0.3, cy + iconSize * 0.2);
      ctx.moveTo(cx, cy - iconSize * 0.3);
      ctx.lineTo(cx, cy + iconSize * 0.2);
      ctx.stroke();
      break;
    case 'queue':
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(cx - iconSize * 0.35, cy + i * (iconSize * 0.2) - 4, iconSize * 0.7, 8);
      }
      break;
    case 'cache':
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy - iconSize * 0.35);
      ctx.lineTo(cx - 6, cy + 2);
      ctx.lineTo(cx + 2, cy + 2);
      ctx.lineTo(cx - 4, cy + iconSize * 0.35);
      ctx.lineTo(cx + 6, cy - 2);
      ctx.lineTo(cx - 2, cy - 2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'client':
      ctx.strokeRect(cx - iconSize * 0.35, cy - iconSize * 0.25, iconSize * 0.7, iconSize * 0.45);
      ctx.beginPath();
      ctx.moveTo(cx - iconSize * 0.15, cy + iconSize * 0.25);
      ctx.lineTo(cx + iconSize * 0.15, cy + iconSize * 0.25);
      ctx.stroke();
      break;
    case 'firewall':
      ctx.beginPath();
      ctx.moveTo(cx, cy - iconSize * 0.35);
      ctx.lineTo(cx + iconSize * 0.3, cy - iconSize * 0.15);
      ctx.lineTo(cx + iconSize * 0.3, cy + iconSize * 0.1);
      ctx.quadraticCurveTo(cx, cy + iconSize * 0.4, cx, cy + iconSize * 0.4);
      ctx.quadraticCurveTo(cx, cy + iconSize * 0.4, cx - iconSize * 0.3, cy + iconSize * 0.1);
      ctx.lineTo(cx - iconSize * 0.3, cy - iconSize * 0.15);
      ctx.closePath();
      ctx.stroke();
      break;
    default: // server
      ctx.strokeRect(cx - iconSize * 0.3, cy - iconSize * 0.35, iconSize * 0.6, iconSize * 0.7);
      for (let i = 0; i < 3; i++) {
        const ly = cy - iconSize * 0.2 + i * iconSize * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx - iconSize * 0.3, ly);
        ctx.lineTo(cx + iconSize * 0.3, ly);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + iconSize * 0.15, ly - iconSize * 0.08, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.fillStyle = theme === 'dark' ? '#60a5fa' : '#3b82f6';
      }
      break;
  }

  ctx.fillStyle = theme === 'dark' ? '#e2e8f0' : '#1e293b';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(shape.serverLabel || shape.serverType || 'Server', cx, y + height - 22);
}

// ──────────────────── Flow Node Renderer ────────────────────

export function renderFlowNode(ctx: CanvasRenderingContext2D, shape: CanvasShape, theme: 'light' | 'dark') {
  const { x, y, width, height } = shape;
  const cx = x + width / 2;
  const cy = y + height / 2;

  ctx.fillStyle = theme === 'dark' ? '#1e3a5f' : '#dbeafe';
  ctx.strokeStyle = theme === 'dark' ? '#3b82f6' : '#2563eb';
  ctx.lineWidth = 2;

  switch (shape.flowType) {
    case 'decision':
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + width, cy);
      ctx.lineTo(cx, y + height);
      ctx.lineTo(x, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'start':
    case 'end':
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, height / 2);
      ctx.fillStyle = shape.flowType === 'start'
        ? (theme === 'dark' ? '#14532d' : '#dcfce7')
        : (theme === 'dark' ? '#7f1d1d' : '#fee2e2');
      ctx.fill();
      ctx.strokeStyle = shape.flowType === 'start' ? '#22c55e' : '#ef4444';
      ctx.stroke();
      break;
    case 'io':
      const skew = width * 0.15;
      ctx.beginPath();
      ctx.moveTo(x + skew, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width - skew, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    default: // process
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 6);
      ctx.fill();
      ctx.stroke();
      break;
  }

  ctx.fillStyle = theme === 'dark' ? '#e2e8f0' : '#1e293b';
  ctx.font = '13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shape.text || shape.flowType || 'Process', cx, cy);
}

// ──────────────────── State Node Renderer ────────────────────

export function renderStateNode(ctx: CanvasRenderingContext2D, shape: CanvasShape, theme: 'light' | 'dark') {
  const { x, y, width, height } = shape;

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fillStyle = theme === 'dark' ? '#1e293b' : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = theme === 'dark' ? '#8b5cf6' : '#7c3aed';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme === 'dark' ? '#e2e8f0' : '#1e293b';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shape.stateName || 'State', x + width / 2, y + 20);

  ctx.beginPath();
  ctx.moveTo(x + 8, y + 34);
  ctx.lineTo(x + width - 8, y + 34);
  ctx.strokeStyle = theme === 'dark' ? '#475569' : '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = theme === 'dark' ? '#94a3b8' : '#64748b';
  ctx.textAlign = 'left';
  (shape.stateActions || []).forEach((action, i) => {
    ctx.fillText(`→ ${action}`, x + 12, y + 50 + i * 16);
  });
}

// ──────────────────── Git Commit Renderer ────────────────────

export function renderGitCommit(ctx: CanvasRenderingContext2D, shape: CanvasShape, theme: 'light' | 'dark') {
  const { x, y, width, height } = shape;
  const cx = x + width / 2;
  const nodeRadius = 16;
  const nodeY = y + 30;

  if (shape.branchName) {
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    const badgeW = ctx.measureText(shape.branchName).width + 16;
    ctx.beginPath();
    ctx.roundRect(cx - badgeW / 2, y + 4, badgeW, 18, 9);
    ctx.fillStyle = '#8b5cf6';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shape.branchName, cx, y + 13);
  }

  ctx.fillStyle = theme === 'dark' ? '#475569' : '#94a3b8';
  ctx.beginPath(); ctx.arc(cx, y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, y + height, 3, 0, Math.PI * 2); ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, nodeY, nodeRadius, 0, Math.PI * 2);
  ctx.fillStyle = theme === 'dark' ? '#1e293b' : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((shape.commitHash || 'abc1234').slice(0, 7), cx, nodeY);

  ctx.fillStyle = theme === 'dark' ? '#e2e8f0' : '#334155';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(shape.commitMessage || 'Commit message', cx, nodeY + nodeRadius + 14);
}

// ──────────────────── Kanban Card Renderer ────────────────────

export function renderKanbanCard(ctx: CanvasRenderingContext2D, shape: CanvasShape, theme: 'light' | 'dark') {
  const { x, y, width, height } = shape;
  const radius = 8;
  const stripW = 4;

  const priorityColors: Record<string, string> = {
    low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
  };

  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = theme === 'dark' ? '#1e293b' : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = theme === 'dark' ? '#334155' : '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.roundRect(x, y, stripW + radius, height, [radius, 0, 0, radius]);
  ctx.fillStyle = priorityColors[shape.kanbanPriority || 'medium'] || '#f59e0b';
  ctx.fill();
  ctx.fillRect(x + radius, y, stripW, height);

  ctx.fillStyle = theme === 'dark' ? '#e2e8f0' : '#1e293b';
  ctx.font = '13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(shape.text || 'Task Title', x + stripW + 14, y + 12);

  if (shape.kanbanStatus) {
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = theme === 'dark' ? '#64748b' : '#94a3b8';
    ctx.fillText(shape.kanbanStatus.toUpperCase(), x + stripW + 14, y + height - 22);
  }

  if (shape.kanbanAssignee) {
    const aR = 12;
    ctx.beginPath();
    ctx.arc(x + width - 20, y + height - 20, aR, 0, Math.PI * 2);
    ctx.fillStyle = '#6366f1';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shape.kanbanAssignee[0].toUpperCase(), x + width - 20, y + height - 20);
  }
}

// ──────────────────── Code Block Preview Renderer ────────────────────

export function renderCodeBlock(ctx: CanvasRenderingContext2D, shape: CanvasShape, _theme: 'light' | 'dark') {
  const { x, y, width, height } = shape;
  const headerH = 32;
  const radius = 8;

  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = '#1e1e2e';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(x, y, width, headerH, [radius, radius, 0, 0]);
  ctx.fillStyle = '#181825';
  ctx.fill();

  const lang = shape.language || 'javascript';
  const langColors: Record<string, string> = {
    javascript: '#f59e0b', typescript: '#3b82f6', python: '#22c55e',
    rust: '#f97316', go: '#06b6d4', shell: '#a855f7', bash: '#a855f7',
    sql: '#ec4899', c: '#6366f1', cpp: '#6366f1', json: '#64748b',
  };

  const badgeColor = langColors[lang] || '#6b7280';
  const badgeText = lang.toUpperCase();
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  const tw = ctx.measureText(badgeText).width + 12;
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 7, tw, 18, 4);
  ctx.fillStyle = badgeColor;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, x + 10 + tw / 2, y + 16);

  ctx.fillStyle = '#22c55e';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('▶ Run', x + width - 12, y + 16);

  const code = shape.code || '// Write code here...';
  const lines = code.split('\n').slice(0, 8);
  ctx.font = '11px "JetBrains Mono", Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  lines.forEach((line, i) => {
    const ly = y + headerH + 8 + i * 16;
    if (ly + 16 > y + height - 4) return;
    ctx.fillStyle = '#4a4a6a';
    ctx.fillText(String(i + 1).padStart(2, ' '), x + 8, ly);
    ctx.fillStyle = '#cdd6f4';
    ctx.fillText(line.slice(0, Math.floor((width - 50) / 6.6)), x + 32, ly);
  });

  if (shape.codeOutput) {
    const outY = y + height - 40;
    ctx.beginPath();
    ctx.moveTo(x + 4, outY);
    ctx.lineTo(x + width - 4, outY);
    ctx.strokeStyle = '#313244';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#a6e3a1';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('> ' + shape.codeOutput.split('\n')[0].slice(0, 50), x + 8, outY + 8);
  }
}

// ──────────────────── Master Renderer Dispatcher ────────────────────

export function renderCustomShape(ctx: CanvasRenderingContext2D, shape: CanvasShape, theme: 'light' | 'dark'): boolean {
  switch (shape.type) {
    case 'dbTable': renderDbTable(ctx, shape, theme); return true;
    case 'apiCard': renderApiCard(ctx, shape, theme); return true;
    case 'serverBlock': renderServerBlock(ctx, shape, theme); return true;
    case 'flowNode': renderFlowNode(ctx, shape, theme); return true;
    case 'stateNode': renderStateNode(ctx, shape, theme); return true;
    case 'gitCommit': renderGitCommit(ctx, shape, theme); return true;
    case 'kanbanCard': renderKanbanCard(ctx, shape, theme); return true;
    case 'code': renderCodeBlock(ctx, shape, theme); return true;
    default: return false;
  }
}
