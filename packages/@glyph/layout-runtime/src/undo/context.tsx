/**
 * React context for undo/redo functionality.
 * Provides undo manager to all nested components.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type * as Y from "yjs";
import { createUndoManager, type UndoManagerState } from "./manager";
import { useLayoutShortcuts } from "../shortcuts/hooks";

interface UndoContextValue extends UndoManagerState {
  /** Undo the last change */
  undo: () => void;
  /** Redo the last undone change */
  redo: () => void;
  /** Clear undo/redo history */
  clear: () => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

export interface UndoProviderProps {
  /** Y.Map containing annotation output */
  outputMap: Y.Map<unknown>;
  /** Whether to wire keyboard shortcuts (default: true) */
  enableShortcuts?: boolean;
  /** Children components */
  children: ReactNode;
}

/**
 * Provider component for undo/redo functionality.
 * Wraps children with undo context and optionally wires keyboard shortcuts.
 */
export function UndoProvider({
  outputMap,
  enableShortcuts = true,
  children,
}: UndoProviderProps): JSX.Element {
  const manager = useMemo(() => createUndoManager({ outputMap }), [outputMap]);

  const [state, setState] = useState<UndoManagerState>(() =>
    manager.getState(),
  );

  useEffect(() => {
    const unsubscribe = manager.onStateChange(setState);
    return () => {
      unsubscribe();
      manager.destroy();
    };
  }, [manager]);

  // Wire keyboard shortcuts
  useLayoutShortcuts(
    enableShortcuts
      ? {
          onUndo: manager.undo,
          onRedo: manager.redo,
        }
      : {},
  );

  const value: UndoContextValue = useMemo(
    () => ({
      ...state,
      undo: manager.undo,
      redo: manager.redo,
      clear: manager.clear,
    }),
    [state, manager],
  );

  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
}

/**
 * Hook to access undo/redo functionality.
 * Must be used within UndoProvider.
 */
export function useUndo(): UndoContextValue {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error("useUndo must be used within UndoProvider");
  }
  return context;
}

/**
 * Hook for undo/redo button state.
 * Returns only the state needed for button disabled states.
 */
export function useUndoButtons(): {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
} {
  const { canUndo, canRedo, undo, redo } = useUndo();
  return { canUndo, canRedo, undo, redo };
}
