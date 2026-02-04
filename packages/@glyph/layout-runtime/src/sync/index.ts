/**
 * Y.js Real-time Sync Module
 *
 * Provides CRDT-based real-time collaboration for annotation tasks.
 * Features:
 * - WebSocket sync for real-time updates
 * - IndexedDB persistence for offline support
 * - Awareness protocol for user presence
 * - React hooks for easy integration
 */

export {
  createSyncProvider,
  type SyncProviderOptions,
  type SyncProviderHandle,
} from "./provider";
export {
  useAwareness,
  useLocalAwareness,
  useRemoteUsers,
  type AwarenessState,
  type UserState,
} from "./awareness";
export {
  SyncProvider,
  useSync,
  useOutputField,
  type SyncProviderProps,
} from "./hooks.js";
