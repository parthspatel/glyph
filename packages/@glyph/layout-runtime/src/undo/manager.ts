/**
 * Y.js-based undo manager for layout-level undo/redo.
 * Uses trackedOrigins to only undo local user changes.
 */

import { UndoManager as YUndoManager } from 'yjs';
import type * as Y from 'yjs';

export interface UndoManagerOptions {
  /** Y.Map containing annotation output */
  outputMap: Y.Map<unknown>;
  /** Origins to track for undo (default: 'user-action') */
  trackedOrigins?: Set<unknown>;
  /** Time in ms to group rapid changes (default: 500) */
  captureTimeout?: number;
}

export interface UndoManagerState {
  canUndo: boolean;
  canRedo: boolean;
  undoStackSize: number;
  redoStackSize: number;
}

export interface UndoManager {
  /** Undo the last change */
  undo(): void;
  /** Redo the last undone change */
  redo(): void;
  /** Check if undo is possible */
  canUndo(): boolean;
  /** Check if redo is possible */
  canRedo(): boolean;
  /** Clear undo/redo history */
  clear(): void;
  /** Stop tracking (cleanup) */
  destroy(): void;
  /** Get current state */
  getState(): UndoManagerState;
  /** Subscribe to state changes (returns unsubscribe function) */
  onStateChange(callback: (state: UndoManagerState) => void): () => void;
}

/** Origin marker for user actions that should be undoable */
export const USER_ACTION_ORIGIN = 'user-action';

/** Origin marker for remote sync changes (not undoable) */
export const REMOTE_SYNC_ORIGIN = 'remote-sync';

/** Origin marker for system changes (not undoable) */
export const SYSTEM_ORIGIN = 'system';

/**
 * Creates a Y.js-based undo manager.
 *
 * Key features:
 * - Only tracks changes with specified origins (default: user-action)
 * - Groups rapid changes within captureTimeout
 * - WASM-compatible interface (no direct Y.js exposure)
 */
export function createUndoManager(options: UndoManagerOptions): UndoManager {
  const {
    outputMap,
    trackedOrigins = new Set([USER_ACTION_ORIGIN]),
    captureTimeout = 500,
  } = options;

  const manager = new YUndoManager([outputMap], {
    trackedOrigins,
    captureTimeout,
  });

  const listeners = new Set<(state: UndoManagerState) => void>();

  function getState(): UndoManagerState {
    return {
      canUndo: manager.canUndo(),
      canRedo: manager.canRedo(),
      undoStackSize: manager.undoStack.length,
      redoStackSize: manager.redoStack.length,
    };
  }

  function notifyListeners(): void {
    const state = getState();
    for (const listener of listeners) {
      listener(state);
    }
  }

  // Listen to stack changes
  manager.on('stack-item-added', notifyListeners);
  manager.on('stack-item-popped', notifyListeners);
  manager.on('stack-cleared', notifyListeners);

  return {
    undo(): void {
      if (manager.canUndo()) {
        manager.undo();
      }
    },

    redo(): void {
      if (manager.canRedo()) {
        manager.redo();
      }
    },

    canUndo(): boolean {
      return manager.canUndo();
    },

    canRedo(): boolean {
      return manager.canRedo();
    },

    clear(): void {
      manager.clear();
    },

    destroy(): void {
      manager.off('stack-item-added', notifyListeners);
      manager.off('stack-item-popped', notifyListeners);
      manager.off('stack-cleared', notifyListeners);
      manager.destroy();
      listeners.clear();
    },

    getState,

    onStateChange(callback: (state: UndoManagerState) => void): () => void {
      listeners.add(callback);
      // Immediately call with current state
      callback(getState());
      return () => {
        listeners.delete(callback);
      };
    },
  };
}
