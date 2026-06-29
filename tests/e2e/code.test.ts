import { describe, it, expect } from 'vitest';
import { MockDevBoardAdapter } from '../harness';

describe('Code Snippet Blocks E2E Tests', () => {
  // Helpers
  function autoDetectLanguage(code: string): string {
    const trimmed = code.trim();
    if (trimmed.includes('import ') || trimmed.includes('def ') || trimmed.includes('print(')) {
      return 'python';
    }
    if (
      trimmed.includes('const ') ||
      trimmed.includes('let ') ||
      trimmed.includes('console.log') ||
      trimmed.includes('function ')
    ) {
      return 'javascript';
    }
    return 'javascript';
  }

  function getSyntaxHighlightingTokens(language: string, code: string) {
    if (language === 'javascript') {
      return {
        tokens: ['keyword', 'string', 'function'],
        html: `<span class="keyword">const</span> x = <span class="string">"hello"</span>;`
      };
    }
    if (language === 'python') {
      return {
        tokens: ['keyword', 'string', 'builtin'],
        html: `<span class="keyword">def</span> <span class="function">func</span>(): <span class="builtin">print</span>(<span class="string">"hello"</span>)`
      };
    }
    return { tokens: [], html: code };
  }

  // --- Tier 1: Feature Coverage ---

  it('test_code_block_creation', async () => {
    const adapter = new MockDevBoardAdapter();
    const code = 'console.log("Hello, World!");';
    const codeBlock = await adapter.createObject('code', 100, 100, {
      text: code,
      properties: { language: 'javascript' }
    });

    expect(codeBlock.type).toBe('code');
    expect(codeBlock.x).toBe(100);
    expect(codeBlock.y).toBe(100);
    expect(codeBlock.text).toBe(code);
    expect(codeBlock.properties?.language).toBe('javascript');

    const fetched = await adapter.getObject(codeBlock.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.text).toBe(code);
  });

  it('test_syntax_highlighting_js', async () => {
    const adapter = new MockDevBoardAdapter();
    const code = 'const msg = "Hello JS";';
    const highlight = getSyntaxHighlightingTokens('javascript', code);

    const codeBlock = await adapter.createObject('code', 50, 50, {
      text: code,
      properties: {
        language: 'javascript',
        highlightedHtml: highlight.html,
        tokens: highlight.tokens
      }
    });

    expect(codeBlock.properties?.language).toBe('javascript');
    expect(codeBlock.properties?.tokens).toContain('keyword');
    expect(codeBlock.properties?.highlightedHtml).toContain('class="keyword"');
  });

  it('test_syntax_highlighting_python', async () => {
    const adapter = new MockDevBoardAdapter();
    const code = 'def hello(): print("Hello Python")';
    const highlight = getSyntaxHighlightingTokens('python', code);

    const codeBlock = await adapter.createObject('code', 50, 50, {
      text: code,
      properties: {
        language: 'python',
        highlightedHtml: highlight.html,
        tokens: highlight.tokens
      }
    });

    expect(codeBlock.properties?.language).toBe('python');
    expect(codeBlock.properties?.tokens).toContain('builtin');
    expect(codeBlock.properties?.highlightedHtml).toContain('class="builtin"');
  });

  it('test_run_js_snippet', async () => {
    const adapter = new MockDevBoardAdapter();
    const codeBlock = await adapter.createObject('code', 10, 10, {
      text: 'console.log("hello from js")',
      properties: { language: 'javascript' }
    });

    const result = await adapter.executeCode(codeBlock.id);
    expect(result.exit_code).toBe(0);
    expect(result.stdout).toBe('hello from js\n');
    expect(result.stderr).toBe('');

    // Output should be stored inline
    const updated = await adapter.getObject(codeBlock.id);
    expect(updated!.properties?.output).toBe('hello from js\n');
    expect(updated!.properties?.hasError).toBe(false);
  });

  it('test_run_python_snippet', async () => {
    const adapter = new MockDevBoardAdapter();
    const codeBlock = await adapter.createObject('code', 10, 10, {
      text: 'print("hello from python")',
      properties: { language: 'python' }
    });

    const result = await adapter.executeCode(codeBlock.id);
    expect(result.exit_code).toBe(0);
    expect(result.stdout).toBe('hello from python\n');
    expect(result.stderr).toBe('');

    const updated = await adapter.getObject(codeBlock.id);
    expect(updated!.properties?.output).toBe('hello from python\n');
  });

  it('test_language_auto_detection', async () => {
    const adapter = new MockDevBoardAdapter();
    
    // Simulate pasting Python code
    const pyCode = 'def calculate(x):\n  print(x * 2)';
    const detectedPy = autoDetectLanguage(pyCode);
    expect(detectedPy).toBe('python');

    const codeBlockPy = await adapter.createObject('code', 0, 0, {
      text: pyCode,
      properties: { language: detectedPy }
    });
    expect(codeBlockPy.properties?.language).toBe('python');

    // Simulate pasting JS code
    const jsCode = 'const calc = (x) => {\n  console.log(x * 2);\n}';
    const detectedJs = autoDetectLanguage(jsCode);
    expect(detectedJs).toBe('javascript');

    const codeBlockJs = await adapter.createObject('code', 0, 0, {
      text: jsCode,
      properties: { language: detectedJs }
    });
    expect(codeBlockJs.properties?.language).toBe('javascript');
  });

  // --- Tier 2: Boundary & Corner Cases ---

  it('test_code_execution_timeout', async () => {
    const adapter = new MockDevBoardAdapter();
    
    // Infinite loop in JS
    const codeBlock = await adapter.createObject('code', 10, 10, {
      text: 'while (true) {}',
      properties: { language: 'javascript' }
    });

    const result = await adapter.executeCode(codeBlock.id);
    expect(result.exit_code).toBe(-1);
    expect(result.stderr).toContain('TimeoutError');
    expect(result.elapsed_ms).toBeGreaterThanOrEqual(30000);

    const updated = await adapter.getObject(codeBlock.id);
    expect(updated!.properties?.hasError).toBe(true);
    expect(updated!.properties?.output).toContain('TimeoutError');
  });

  it('test_run_invalid_syntax', async () => {
    const adapter = new MockDevBoardAdapter();
    
    // Invalid JS syntax
    const codeBlock = await adapter.createObject('code', 10, 10, {
      text: 'const x = ;',
      properties: { language: 'javascript' }
    });

    const result = await adapter.executeCode(codeBlock.id);
    expect(result.exit_code).toBe(1);
    expect(result.stderr).toContain('SyntaxError');

    const updated = await adapter.getObject(codeBlock.id);
    expect(updated!.properties?.hasError).toBe(true);
  });

  it('test_sandbox_resource_limits', async () => {
    const adapter = new MockDevBoardAdapter();
    
    // Fork bomb or large memory allocation simulation
    const codeBlock = await adapter.createObject('code', 10, 10, {
      text: 'import child_process; child_process.fork()',
      properties: { language: 'javascript' }
    });

    const result = await adapter.executeCode(codeBlock.id);
    expect(result.exit_code).toBe(-1);
    expect(result.stderr).toContain('ResourceLimitError');
  });

  it('test_execution_empty_code', async () => {
    const adapter = new MockDevBoardAdapter();
    const codeBlock = await adapter.createObject('code', 10, 10, {
      text: '   \n  ', // whitespace only
      properties: { language: 'javascript' }
    });

    const result = await adapter.executeCode(codeBlock.id);
    expect(result.exit_code).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('test_large_output', async () => {
    const adapter = new MockDevBoardAdapter();
    const codeBlock = await adapter.createObject('code', 10, 10, {
      text: 'for i in range(5000): print("large output")',
      properties: { language: 'python' }
    });

    const result = await adapter.executeCode(codeBlock.id);
    expect(result.exit_code).toBe(0);
    // Verify it handles large volumes of output (e.g. 1000 lines generated by mock)
    const lines = result.stdout.trim().split('\n');
    expect(lines.length).toBe(1000);
    expect(lines[0]).toBe('Line 1');
    expect(lines[999]).toBe('Line 1000');
  });

  it('test_concurrent_code_runs', async () => {
    const adapter = new MockDevBoardAdapter();
    
    const p1 = adapter.executeCodeSnippet('javascript', 'console.log("hello 1")');
    const p2 = adapter.executeCodeSnippet('javascript', 'console.log("hello 2")');
    const p3 = adapter.executeCodeSnippet('javascript', 'console.log("hello 3")');

    const results = await Promise.all([p1, p2, p3]);
    expect(results[0].stdout).toBe('hello 1\n');
    expect(results[1].stdout).toBe('hello 2\n');
    expect(results[2].stdout).toBe('hello 3\n');
  });
});
