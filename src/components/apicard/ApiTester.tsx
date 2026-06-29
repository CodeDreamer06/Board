import React, { useState, useCallback } from 'react';
import { CanvasShape, Viewport } from '../../types/canvas';
import { useCanvas } from '../../hooks/useCanvasState';
import { Loader2, X, Send } from 'lucide-react';

interface Props {
  shape: CanvasShape;
  viewport: Viewport;
  onUpdate: (updates: Partial<CanvasShape>) => void;
  onClose: () => void;
}

const ENVIRONMENTS = [
  { name: 'Dev', base: 'http://localhost:3000' },
  { name: 'Staging', base: 'https://staging.api.example.com' },
  { name: 'Production', base: 'https://api.example.com' },
] as const;

export const ApiTester: React.FC<Props> = ({ shape, viewport, onUpdate, onClose }) => {
  const ctx = useCanvas();
  const [method, setMethod] = useState(shape.httpMethod || 'GET');
  const [path, setPath] = useState(shape.apiPath || '/api/v1/users');
  const [headers, setHeaders] = useState(shape.httpHeaders || 'Content-Type: application/json');
  const [body, setBody] = useState(shape.httpBody || '{\n  "name": "DevBoard"\n}');
  const [response, setResponse] = useState(shape.httpResponse || '');
  const [status, setStatus] = useState<number | undefined>(shape.httpStatus);
  const [isRunning, setIsRunning] = useState(false);
  const [envIdx, setEnvIdx] = useState(0);
  const [curlInput, setCurlInput] = useState('');
  const [showCurlModal, setShowCurlModal] = useState(false);

  const screenX = shape.x * viewport.zoom + viewport.x;
  const screenY = shape.y * viewport.zoom + viewport.y;
  const screenW = Math.max(shape.width * viewport.zoom, 360);
  const screenH = Math.max(shape.height * viewport.zoom, 220);

  const handleBlur = useCallback(() => {
    onUpdate({
      httpMethod: method,
      apiPath: path,
      httpHeaders: headers,
      httpBody: body,
      httpResponse: response,
      httpStatus: status,
    });
  }, [method, path, headers, body, response, status, onUpdate]);

  // Execute request
  const sendRequest = async () => {
    setIsRunning(true);
    setStatus(undefined);
    setResponse('Sending request...');
    onUpdate({ httpRunning: true });

    // Pipeline chaining: check if upstream code blocks or API cards chain to this path/url
    let resolvedBody = body;
    // Basic substitution of upstream variables if written as {{upstream}} or similar
    const upstreamCodeBlock = ctx.shapes.find(s => s.type === 'code' && s.replChainId === shape.id);
    if (upstreamCodeBlock && upstreamCodeBlock.codeOutput) {
      // Substitute first line of output or JSON data
      try {
        const cleanOut = upstreamCodeBlock.codeOutput.split('\n')[0];
        resolvedBody = resolvedBody.replace('{{input}}', cleanOut);
      } catch (_) {}
    }

    const env = ENVIRONMENTS[envIdx];
    const fullUrl = path.startsWith('http') ? path : `${env.base}${path}`;

    // Parse headers
    const parsedHeaders: Record<string, string> = {};
    headers.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        parsedHeaders[parts[0].trim()] = parts.slice(1).join(':').trim();
      }
    });

    const start = Date.now();

    try {
      const options: RequestInit = {
        method,
        headers: parsedHeaders,
      };

      if (method !== 'GET' && method !== 'DELETE') {
        options.body = resolvedBody;
      }

      const res = await fetch(fullUrl, options);
      const text = await res.text();
      const elapsed = Date.now() - start;

      let formattedResponse = text;
      try {
        // Pretty print JSON responses
        const parsed = JSON.parse(text);
        formattedResponse = JSON.stringify(parsed, null, 2);
      } catch (_) {}

      const outputStr = `Status: ${res.status} ${res.statusText}\nTime: ${elapsed}ms\n\n${formattedResponse}`;
      setResponse(outputStr);
      setStatus(res.status);
      onUpdate({ httpResponse: outputStr, httpStatus: res.status, httpRunning: false });
    } catch (e: any) {
      const elapsed = Date.now() - start;
      const errorStr = `Fetch Error: ${e.message || e}\nTime: ${elapsed}ms`;
      setResponse(errorStr);
      setStatus(500);
      onUpdate({ httpResponse: errorStr, httpStatus: 500, httpRunning: false });
    } finally {
      setIsRunning(false);
    }
  };

  // cURL parser
  const parseCurl = () => {
    try {
      if (!curlInput) return;
      
      // Parse method
      let parsedMethod: any = 'GET';
      if (curlInput.includes('-X POST') || curlInput.includes('--request POST')) parsedMethod = 'POST';
      else if (curlInput.includes('-X PUT') || curlInput.includes('--request PUT')) parsedMethod = 'PUT';
      else if (curlInput.includes('-X DELETE') || curlInput.includes('--request DELETE')) parsedMethod = 'DELETE';
      else if (curlInput.includes('-X PATCH') || curlInput.includes('--request PATCH')) parsedMethod = 'PATCH';

      // Parse URL
      const urlRegex = /curl\s+["']?(https?:\/\/[^\s"']+)/i;
      const urlMatch = urlRegex.exec(curlInput);
      if (urlMatch) {
        setPath(urlMatch[1]);
      }

      // Parse headers
      const headerRegex = /-H\s+["']([^"']+)["']/g;
      let headerMatch;
      const parsedHeaders: string[] = [];
      while ((headerMatch = headerRegex.exec(curlInput)) !== null) {
        parsedHeaders.push(headerMatch[1]);
      }
      if (parsedHeaders.length > 0) {
        setHeaders(parsedHeaders.join('\n'));
      }

      // Parse data
      const dataRegex = /(?:-d|--data|--data-raw)\s+["']([^"']+)["']/i;
      const dataMatch = dataRegex.exec(curlInput);
      if (dataMatch) {
        setBody(dataMatch[1]);
        if (parsedMethod === 'GET') parsedMethod = 'POST'; // Switch if data is present
      }

      setMethod(parsedMethod);
      setShowCurlModal(false);
      setCurlInput('');
    } catch (err) {
      alert('Failed to parse cURL. Make sure it is a standard curl command.');
    }
  };

  return (
    <div
      className="absolute z-30 flex flex-col overflow-hidden"
      style={{
        left: screenX, top: screenY, width: screenW, height: screenH,
        borderRadius: 10,
        border: '1px solid rgba(59, 130, 246, 0.4)',
        boxShadow: '0 0 20px rgba(59, 130, 246, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {/* Method selector */}
          <select
            value={method}
            onChange={e => setMethod(e.target.value as any)}
            className="bg-slate-800 text-xs font-bold text-blue-400 px-1.5 py-1 rounded outline-none border border-slate-700 focus:border-blue-500"
          >
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Base Env Selector */}
          <select
            value={envIdx}
            onChange={e => setEnvIdx(Number(e.target.value))}
            className="bg-slate-800 text-[10px] text-slate-300 px-1.5 py-1 rounded outline-none border border-slate-700"
          >
            {ENVIRONMENTS.map((env, idx) => (
              <option key={env.name} value={idx}>{env.name}</option>
            ))}
          </select>

          {/* cURL Import button */}
          <button
            onClick={() => setShowCurlModal(true)}
            className="text-[9px] font-bold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
          >
            cURL Import
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={sendRequest}
            disabled={isRunning}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
            Send
          </button>
          <button onClick={() => { handleBlur(); onClose(); }} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor & Input Content */}
      <div className="flex-1 bg-slate-950 p-3 overflow-y-auto space-y-3 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Path / URL */}
          <input
            type="text"
            value={path}
            onChange={e => setPath(e.target.value)}
            onBlur={handleBlur}
            placeholder={ENVIRONMENTS[envIdx].base + '/api/...'}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500 font-mono"
          />

          {/* Headers */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-semibold">Headers (Key: Value)</label>
            <textarea
              value={headers}
              onChange={e => setHeaders(e.target.value)}
              onBlur={handleBlur}
              placeholder="Authorization: Bearer token&#10;Accept: application/json"
              rows={2}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 outline-none focus:border-blue-500 font-mono resize-none"
            />
          </div>

          {/* Body (only if non-GET) */}
          {method !== 'GET' && method !== 'DELETE' && (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Request Body</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onBlur={handleBlur}
                placeholder="{}"
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 outline-none focus:border-blue-500 font-mono resize-none"
              />
            </div>
          )}
        </div>

        {/* Response Viewer */}
        <div className="border-t border-slate-800 pt-2 flex flex-col justify-between flex-1 mt-2">
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Response</div>
          <pre className="flex-1 w-full bg-slate-900 rounded-lg p-2 text-[10px] font-mono text-emerald-400 overflow-y-auto whitespace-pre-wrap max-h-24">
            {response || 'Run request to see responses here.'}
          </pre>
        </div>
      </div>

      {/* cURL Import Modal Overlay */}
      {showCurlModal && (
        <div className="absolute inset-0 bg-slate-950/90 z-40 p-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-200">Import from cURL</h3>
            <textarea
              value={curlInput}
              onChange={e => setCurlInput(e.target.value)}
              placeholder="Paste curl command here..."
              rows={5}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-slate-300 outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowCurlModal(false)}
              className="px-3 py-1.5 rounded bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={parseCurl}
              className="px-3 py-1.5 rounded bg-blue-600 text-[10px] text-white hover:bg-blue-500"
            >
              Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
