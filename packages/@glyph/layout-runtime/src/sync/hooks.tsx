/**
 * React Sync Context and Hooks
 *
 * Provides React integration for Y.js sync functionality.
 * Wraps the sync provider in a context and provides convenient hooks.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { createSyncProvider, type SyncProviderOptions } from './provider';

interface SyncContextValue {
  /** Shared Y.Map for annotation output data */
  outputMap: Y.Map<unknown>;
  /** Awareness protocol for presence */
  awareness: Awareness;
  /** Whether WebSocket is connected */
  connected: boolean;
  /** Whether initial sync is complete */
  synced: boolean;
  /** Count of pending changes (offline indicator) */
  pendingChanges: number;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export interface SyncProviderProps {
  /** Sync provider configuration */
  options: SyncProviderOptions;
  /** Child components */
  children: ReactNode;
}

/**
 * Provides sync context to child components.
 * Creates and manages the Y.js sync provider lifecycle.
 */
export function SyncProvider({ options, children }: SyncProviderProps) {
  // Memoize provider creation based on taskId to avoid recreating on re-render
  const provider = useMemo(
    () => createSyncProvider(options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.taskId]
  );

  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);

  useEffect(() => {
    // Track connection state
    const handleStatus = ({ status }: { status: string }) => {
      setConnected(status === 'connected');
    };
    provider.wsProvider.on('status', handleStatus);

    // Track sync state
    const handleSync = (isSynced: boolean) => {
      setSynced(isSynced);
    };
    provider.wsProvider.on('sync', handleSync);

    // Track pending changes for offline indicator
    const checkPending = () => {
      // When offline, updates accumulate in local state
      // This is a simplified heuristic - real implementation would track update vector
      setPendingChanges(provider.connected ? 0 : 1);
    };
    provider.doc.on('update', checkPending);

    return () => {
      provider.wsProvider.off('status', handleStatus);
      provider.wsProvider.off('sync', handleSync);
      provider.doc.off('update', checkPending);
      provider.destroy();
    };
  }, [provider]);

  const value = useMemo(
    () => ({
      outputMap: provider.outputMap,
      awareness: provider.awareness,
      connected,
      synced,
      pendingChanges,
    }),
    [provider.outputMap, provider.awareness, connected, synced, pendingChanges]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

/**
 * Hook to access sync context.
 * Must be used within a SyncProvider.
 */
export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
}

/**
 * Hook to read and write a specific output field.
 * Automatically syncs changes across all connected clients.
 *
 * @param field - The field name in the output map
 * @param defaultValue - Default value if field is not set
 * @returns Tuple of [currentValue, setValue]
 */
export function useOutputField<T>(field: string, defaultValue: T): [T, (value: T) => void] {
  const { outputMap } = useSync();
  const [value, setValue] = useState<T>(() => (outputMap.get(field) as T) ?? defaultValue);

  useEffect(() => {
    const observer = () => {
      setValue((outputMap.get(field) as T) ?? defaultValue);
    };
    outputMap.observe(observer);
    observer(); // Sync initial value

    return () => outputMap.unobserve(observer);
  }, [outputMap, field, defaultValue]);

  const setOutputValue = (newValue: T) => {
    outputMap.set(field, newValue as Y.Map<unknown> | unknown);
  };

  return [value, setOutputValue];
}
