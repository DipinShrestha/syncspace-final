'use client';

import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { IconPlay, IconCode } from '@/components/icons';

export default function LiveCodeEditor() {
  const [code, setCode] = useState(`// Write JavaScript code here
console.log("Hello, SyncSpace!");
function add(a, b) {
 return a + b;
}
console.log(add(5, 3));
`);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isError, setIsError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const runCode = () => {
    setIsRunning(true);
    setIsError(false);
    setOutput('Running...');

    // Create a sandboxed iframe
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Clear previous output
    setOutput('');

    // Prepare the code to execute
    const script = `
 try {
 let output = '';
 // Override console.log to capture output
 const originalLog = console.log;
 console.log = (...args) => {
 output += args.map(arg => String(arg)).join(' ') + '\\n';
 originalLog(...args);
 };
 // Also capture return value of the last expression? We'll just evaluate.
 // We'll also capture errors.
 (function() {
 ${code}
 })();
 // Send output back
 window.parent.postMessage({ type: 'output', data: output }, '*');
 } catch (err) {
 window.parent.postMessage({ type: 'error', data: err.message }, '*');
 }
 `;

    // Write to iframe and execute
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(`
 <!DOCTYPE html>
 <html>
 <head><title>Code Runner</title></head>
 <body>
 <script>
 ${script}
 <\/script>
 </body>
 </html>
 `);
      iframeDoc.close();
    }

    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'output') {
        setOutput(event.data.data || '(no output)');
        setIsRunning(false);
      } else if (event.data.type === 'error') {
        setIsError(true);
        setOutput(`Error: ${event.data.data}`);
        setIsRunning(false);
      }
    };
    window.addEventListener('message', handleMessage);
    // Cleanup after a timeout or on next run
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
    }, 5000);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        <div className="bg-gray-800 px-3 sm:px-4 py-2 text-sm font-medium text-white flex justify-between items-center gap-2">
          <span className="flex items-center gap-1.5 truncate">
            <IconCode className="w-4 h-4 flex-shrink-0" />
            JavaScript Editor
          </span>
          <button
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 bg-sage-600 hover:bg-sage-700 active:scale-95 px-3 py-1 rounded text-sm font-medium text-black transition-all disabled:opacity-50 disabled:active:scale-100 whitespace-nowrap flex-shrink-0"
          >
            {isRunning ? (
              'Running…'
            ) : (
              <>
                <IconPlay className="w-3.5 h-3.5" /> Run Code
              </>
            )}
          </button>
        </div>
        <Editor
          height="min(400px, 45vh)"
          defaultLanguage="javascript"
          value={code}
          onChange={(value) => setCode(value || '')}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-700">
        <div className="bg-gray-800 px-3 sm:px-4 py-2 text-sm font-medium text-white flex items-center justify-between">
          <span>Output</span>
          {output && !isRunning && (
            <span className={`w-1.5 h-1.5 rounded-full ${isError ? 'bg-red-500' : 'bg-sage-500'}`} />
          )}
        </div>
        <pre
          className={`p-3 sm:p-4 text-sm font-mono whitespace-pre-wrap break-words overflow-auto max-h-64 ${
            isError ? 'text-red-400' : 'text-gray-300'
          }`}
        >
          {output || 'Click "Run Code" to see output here.'}
        </pre>
      </div>
      {/* Hidden iframe for sandbox execution */}
      <iframe
        ref={iframeRef}
        style={{ display: 'none' }}
        sandbox="allow-same-origin allow-scripts"
        title="code-runner"
      />
    </div>
  );
}
