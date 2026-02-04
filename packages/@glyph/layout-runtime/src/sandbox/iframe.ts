/**
 * Sandboxed Iframe for Template Rendering
 *
 * CRITICAL: Nunjucks has NO built-in sandboxing.
 * Templates MUST render in an iframe with sandbox attribute
 * to prevent access to parent DOM, localStorage, etc.
 *
 * Security: sandbox="allow-scripts" but NOT allow-same-origin
 */

export interface SandboxOptions {
  /** Allow scripts in iframe */
  allowScripts?: boolean;
  /** Custom Content Security Policy */
  csp?: string;
  /** Custom styles to inject */
  styles?: string;
}

const DEFAULT_CSP =
  "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'";

/**
 * Create a sandboxed iframe for template rendering.
 */
export function createSandbox(
  container: HTMLElement,
  options: SandboxOptions = {}
): HTMLIFrameElement {
  const iframe = document.createElement('iframe');

  // Sandbox attribute - allow scripts but NOT same-origin
  // This prevents the iframe from accessing the parent's DOM/storage
  iframe.sandbox.add('allow-scripts');

  // Generate srcdoc with CSP
  const csp = options.csp || DEFAULT_CSP;
  iframe.srcdoc = generateSrcdoc(csp, options.styles);

  iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
  container.appendChild(iframe);

  return iframe;
}

function generateSrcdoc(csp: string, styles?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    ${styles || ''}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    // Store for layout state
    window.__layoutState = {
      ready: false,
      context: {},
      runtime: null,
    };

    // Handle messages from parent
    window.addEventListener('message', async (event) => {
      const { type, payload } = event.data || {};

      if (type === 'RENDER') {
        try {
          const { html, context } = payload;
          window.__layoutState.context = context;
          document.getElementById('root').innerHTML = html;
          parent.postMessage({ type: 'RENDERED' }, '*');
        } catch (error) {
          parent.postMessage({ type: 'ERROR', error: error.message }, '*');
        }
      }

      if (type === 'UPDATE_CONTEXT') {
        const { path, value } = payload;
        setByPath(window.__layoutState.context, path, value);
      }
    });

    // Forward output changes to parent
    window.emitChange = (field, value) => {
      parent.postMessage({ type: 'OUTPUT_CHANGE', field, value }, '*');
    };

    // Utility to set nested value
    function setByPath(obj, path, value) {
      const parts = path.split('.');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    }

    // Signal ready
    parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>`;
}

export type SandboxMessageType =
  | 'READY'
  | 'RENDER'
  | 'RENDERED'
  | 'UPDATE_CONTEXT'
  | 'OUTPUT_CHANGE'
  | 'ERROR';

export interface SandboxMessage {
  type: SandboxMessageType;
  payload?: unknown;
  field?: string;
  value?: unknown;
  error?: string;
}

/**
 * Manages a sandboxed iframe for template rendering.
 */
export class SandboxManager {
  private iframe: HTMLIFrameElement;
  private messageQueue: SandboxMessage[] = [];
  private ready = false;
  private handleMessageBound: (event: MessageEvent) => void;

  /** Callback when output field changes */
  onOutputChange?: (field: string, value: unknown) => void;

  /** Callback when an error occurs */
  onError?: (error: Error) => void;

  /** Callback when rendering is complete */
  onRendered?: () => void;

  constructor(container: HTMLElement, options?: SandboxOptions) {
    this.iframe = createSandbox(container, options);
    this.handleMessageBound = this.handleMessage.bind(this);
    window.addEventListener('message', this.handleMessageBound);
  }

  private handleMessage(event: MessageEvent) {
    // Only handle messages from our iframe
    if (event.source !== this.iframe.contentWindow) return;

    const { type, field, value, error } = event.data as SandboxMessage;

    switch (type) {
      case 'READY':
        this.ready = true;
        this.flushQueue();
        break;

      case 'RENDERED':
        this.onRendered?.();
        break;

      case 'OUTPUT_CHANGE':
        if (field !== undefined) {
          this.onOutputChange?.(field, value);
        }
        break;

      case 'ERROR':
        this.onError?.(new Error(error || 'Unknown sandbox error'));
        break;
    }
  }

  /**
   * Render HTML content in the sandbox.
   */
  render(html: string, context: Record<string, unknown>) {
    this.postMessage({ type: 'RENDER', payload: { html, context } });
  }

  /**
   * Update a context value in the sandbox.
   */
  updateContext(path: string, value: unknown) {
    this.postMessage({ type: 'UPDATE_CONTEXT', payload: { path, value } });
  }

  private postMessage(message: SandboxMessage) {
    if (this.ready) {
      this.iframe.contentWindow?.postMessage(message, '*');
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushQueue() {
    for (const msg of this.messageQueue) {
      this.iframe.contentWindow?.postMessage(msg, '*');
    }
    this.messageQueue = [];
  }

  /**
   * Clean up the sandbox.
   */
  destroy() {
    window.removeEventListener('message', this.handleMessageBound);
    this.iframe.remove();
  }
}
