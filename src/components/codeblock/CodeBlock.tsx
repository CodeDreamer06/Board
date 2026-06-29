import React, { useState, useRef, useCallback } from 'react';
import { CanvasShape, Viewport } from '../../types/canvas';
import { Play, Loader2, ChevronDown, ChevronUp, X, Copy, Check } from 'lucide-react';

interface Props {
  shape: CanvasShape;
  viewport: Viewport;
  onUpdate: (updates: Partial<CanvasShape>) => void;
  onClose: () => void;
}

// ──────────────────── Syntax Highlighting ────────────────────

const KEYWORDS = new Set([
  'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return',
  'import', 'export', 'from', 'class', 'new', 'this', 'async', 'await',
  'try', 'catch', 'throw', 'typeof', 'instanceof', 'default', 'switch',
  'case', 'break', 'continue', 'void', 'null', 'undefined', 'true', 'false',
  'def', 'print', 'in', 'not', 'and', 'or', 'is', 'None', 'True', 'False',
  'lambda', 'with', 'as', 'pass', 'raise', 'yield', 'global', 'nonlocal',
  'fn', 'pub', 'use', 'mod', 'struct', 'enum', 'impl', 'trait', 'match',
  'mut', 'self', 'super', 'crate', 'where', 'type', 'static', 'move',
  'func', 'package', 'fmt', 'range', 'go', 'chan', 'select', 'defer',
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX',
  'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'LEFT', 'RIGHT',
  'INNER', 'OUTER', 'UNION', 'ALL', 'DISTINCT', 'COUNT', 'SUM', 'AVG',
  'MIN', 'MAX', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'EXISTS',
  'NULL', 'IS', 'ASC', 'DESC', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
  'int', 'char', 'float', 'double', 'long', 'short', 'unsigned', 'signed',
  'include', 'define', 'ifdef', 'endif', 'pragma', 'namespace', 'using',
  'template', 'virtual', 'override', 'auto', 'register', 'volatile',
]);

function highlightLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let i = 0;

  while (i < line.length) {
    // Comment (// or #)
    if ((line[i] === '/' && line[i + 1] === '/') || (line[i] === '#' && (i === 0 || line[i - 1] === ' '))) {
      tokens.push(<span key={i} style={{ color: '#5c6370' }}>{line.slice(i)}</span>);
      break;
    }

    // Strings
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++;
        j++;
      }
      j = Math.min(j + 1, line.length);
      tokens.push(<span key={i} style={{ color: '#98c379' }}>{line.slice(i, j)}</span>);
      i = j;
      continue;
    }

    // Numbers
    if (/\d/.test(line[i]) && (i === 0 || /[\s,([{:=<>+\-*/]/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[\d.xXa-fA-F_]/.test(line[j])) j++;
      tokens.push(<span key={i} style={{ color: '#d19a66' }}>{line.slice(i, j)}</span>);
      i = j;
      continue;
    }

    // Words
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (KEYWORDS.has(word)) {
        tokens.push(<span key={i} style={{ color: '#c678dd' }}>{word}</span>);
      } else {
        tokens.push(<span key={i} style={{ color: '#abb2bf' }}>{word}</span>);
      }
      i = j;
      continue;
    }

    tokens.push(<span key={i} style={{ color: '#abb2bf' }}>{line[i]}</span>);
    i++;
  }

  return tokens;
}

// ──────────────────── Languages ────────────────────

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', color: '#f59e0b' },
  { id: 'typescript', label: 'TypeScript', color: '#3b82f6' },
  { id: 'python', label: 'Python', color: '#22c55e' },
  { id: 'rust', label: 'Rust', color: '#f97316' },
  { id: 'go', label: 'Go', color: '#06b6d4' },
  { id: 'shell', label: 'Shell', color: '#a855f7' },
  { id: 'sql', label: 'SQL', color: '#ec4899' },
  { id: 'c', label: 'C', color: '#6366f1' },
  { id: 'cpp', label: 'C++', color: '#6366f1' },
];

// ──────────────────── Component ────────────────────

export const CodeBlock: React.FC<Props> = ({ shape, viewport, onUpdate, onClose }) => {
  const [code, setCode] = useState(shape.code || '// Write your code here\n');
  const [language, setLanguage] = useState(shape.language || 'javascript');
  const [output, setOutput] = useState(shape.codeOutput || '');
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(!!shape.codeOutput);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  const screenX = shape.x * viewport.zoom + viewport.x;
  const screenY = shape.y * viewport.zoom + viewport.y;
  const screenW = Math.max(shape.width * viewport.zoom, 300);
  const screenH = Math.max(shape.height * viewport.zoom, 200);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleBlur = useCallback(() => {
    onUpdate({ code, language, codeOutput: output });
  }, [code, language, output, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      handleBlur();
      onClose();
    }
  }, [code, handleBlur, onClose]);

  const executeCode = async () => {
    setIsRunning(true);
    setShowOutput(true);
    setOutput('Running...\n');

    try {
      const tauri = (window as any).__TAURI__;
      if (tauri?.invoke) {
        const result = await tauri.invoke('execute_code', { language, code });
        let out = '';
        if (result.stdout) out += result.stdout;
        if (result.stderr) out += (out ? '\n' : '') + result.stderr;
        out += `\n⏱ ${result.elapsed_ms}ms | exit: ${result.exit_code}`;
        setOutput(out);
        onUpdate({ codeOutput: out });
      } else {
        setOutput('⚠ Code execution requires the DevBoard desktop app.\nRun `cargo tauri dev` to start with Tauri.');
      }
    } catch (err: any) {
      setOutput(`Error: ${err?.message || err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentLang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0];
  const lines = code.split('\n');

  return (
    <div
      className="absolute z-30 flex flex-col overflow-hidden"
      style={{
        left: screenX, top: screenY, width: screenW, height: screenH,
        borderRadius: 10,
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 0 20px rgba(99, 102, 241, 0.1), 0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ backgroundColor: '#181825' }}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono font-bold text-white transition-colors hover:brightness-110"
              style={{ backgroundColor: currentLang.color }}
            >
              {currentLang.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showLangPicker && (
              <div className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-xl z-50 min-w-[140px]"
                style={{ backgroundColor: '#1e1e2e', border: '1px solid #313244' }}>
                {LANGUAGES.map(lang => (
                  <button key={lang.id}
                    onClick={() => { setLanguage(lang.id); setShowLangPicker(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-white/5 ${
                      lang.id === language ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={copyCode} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={executeCode} disabled={isRunning}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: '#22c55e' }}>
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Run
          </button>
          <button onClick={() => { handleBlur(); onClose(); }} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#1e1e2e' }}>
        <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col items-end pr-2 py-2 select-none overflow-hidden"
          style={{ backgroundColor: '#181825', color: '#4a4a6a', fontSize: 12, fontFamily: '"JetBrains Mono", Consolas, monospace', lineHeight: '20px' }}>
          {lines.map((_, i) => (<div key={i}>{i + 1}</div>))}
        </div>
        <pre ref={highlightRef}
          className="absolute left-10 top-0 right-0 bottom-0 overflow-auto p-2 m-0 whitespace-pre pointer-events-none"
          style={{ fontFamily: '"JetBrains Mono", Consolas, monospace', fontSize: 12, lineHeight: '20px', color: '#abb2bf' }}>
          {lines.map((line, i) => (<div key={i}>{highlightLine(line)}{'\n'}</div>))}
        </pre>
        <textarea ref={textareaRef} value={code}
          onChange={e => setCode(e.target.value)} onBlur={handleBlur} onScroll={handleScroll} onKeyDown={handleKeyDown}
          spellCheck={false}
          className="absolute left-10 top-0 right-0 bottom-0 resize-none outline-none p-2 overflow-auto"
          style={{
            fontFamily: '"JetBrains Mono", Consolas, monospace', fontSize: 12, lineHeight: '20px',
            color: 'transparent', caretColor: '#abb2bf', backgroundColor: 'transparent', whiteSpace: 'pre',
          }}
        />
      </div>

      {/* Output Panel */}
      {showOutput && (
        <div className="shrink-0 border-t" style={{ backgroundColor: '#11111b', borderColor: '#313244', maxHeight: screenH * 0.35 }}>
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Output</span>
            <button onClick={() => setShowOutput(false)} className="text-slate-500 hover:text-slate-300">
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
          <pre className="px-3 pb-2 overflow-auto text-[11px] m-0 whitespace-pre-wrap"
            style={{ fontFamily: '"JetBrains Mono", Consolas, monospace', color: '#a6e3a1', maxHeight: screenH * 0.3 - 30 }}>
            {output || 'No output yet. Click Run to execute.'}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
