/**
 * Y.js Sync Provider
 *
 * Creates a Y.js document with WebSocket sync and IndexedDB persistence
 * for real-time collaboration on annotation tasks.
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

export interface SyncProviderOptions {
  /** Unique task identifier for room isolation */
  taskId: string;
  /** WebSocket URL for sync server (e.g., wss://glyph.example.com/sync) */
  wsUrl: string;
  /** Current user's ID */
  userId: string;
  /** Current user's display name */
  userName: string;
  /** Optional color override (defaults to hash-based) */
  userColor?: string;
}

export interface SyncProviderHandle {
  /** Y.js document */
  doc: Y.Doc;
  /** Shared output map for annotation data */
  outputMap: Y.Map<unknown>;
  /** Awareness protocol for presence */
  awareness: WebsocketProvider['awareness'];
  /** WebSocket provider */
  wsProvider: WebsocketProvider;
  /** IndexedDB persistence provider */
  idbProvider: IndexeddbPersistence;
  /** Whether WebSocket is connected */
  readonly connected: boolean;
  /** Whether initial sync is complete */
  readonly synced: boolean;
  /** Cleanup all providers and document */
  destroy: () => void;
}

/**
 * Create a sync provider for a task.
 *
 * The provider manages:
 * - Y.js CRDT document for conflict-free collaboration
 * - WebSocket connection for real-time sync
 * - IndexedDB persistence for offline support
 * - User awareness state for presence
 */
export function createSyncProvider(options: SyncProviderOptions): SyncProviderHandle {
  const doc = new Y.Doc();
  const outputMap = doc.getMap<unknown>('output');

  // WebSocket provider for real-time sync
  const wsProvider = new WebsocketProvider(
    options.wsUrl,
    `task:${options.taskId}`,
    doc,
    { connect: true }
  );

  // IndexedDB for offline persistence
  const idbProvider = new IndexeddbPersistence(`glyph:task:${options.taskId}`, doc);

  // Set user awareness state
  wsProvider.awareness.setLocalState({
    user: {
      id: options.userId,
      name: options.userName,
      color: options.userColor || generateColor(options.userId),
    },
    cursor: null,
    selection: null,
    activeComponent: null,
  });

  return {
    doc,
    outputMap,
    awareness: wsProvider.awareness,
    wsProvider,
    idbProvider,

    // Connection state getters
    get connected() {
      return wsProvider.wsconnected;
    },
    get synced() {
      return wsProvider.synced;
    },

    // Cleanup - CRITICAL: Clear awareness to prevent memory leak
    destroy: () => {
      wsProvider.awareness.setLocalState(null);
      wsProvider.destroy();
      idbProvider.destroy();
      doc.destroy();
    },
  };
}

/**
 * Generate a consistent color from a seed string.
 * Uses hashing to produce the same color for the same user ID.
 */
function generateColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 60%)`;
}
